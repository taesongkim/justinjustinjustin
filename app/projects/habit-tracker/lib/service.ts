import { supabase } from "./supabase";
import type { User, Card, Habit, DateString } from "./types";

// ─── Helpers ────────────────────────────────────────────────────────

export function toDateString(date: Date): DateString {
  return date.toISOString().split("T")[0];
}

export function today(): DateString {
  return toDateString(new Date());
}

export function shiftDate(dateStr: DateString, days: number): DateString {
  const d = new Date(dateStr + "T12:00:00"); // noon to avoid DST edge
  d.setDate(d.getDate() + days);
  return toDateString(d);
}

export function formatDate(dateStr: DateString): string {
  const d = new Date(dateStr + "T12:00:00");
  return d.toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

// ─── Users ──────────────────────────────────────────────────────────

export async function getUsers(): Promise<User[]> {
  const { data, error } = await supabase
    .from("users")
    .select("*")
    .order("sort_order", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function createUser(name: string): Promise<User> {
  // Get the max sort_order to put new user at the end
  const { data: existing } = await supabase
    .from("users")
    .select("sort_order")
    .order("sort_order", { ascending: false })
    .limit(1);

  const nextOrder = existing && existing.length > 0 ? existing[0].sort_order + 1 : 0;

  const { data, error } = await supabase
    .from("users")
    .insert({ name, sort_order: nextOrder })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteUser(id: string): Promise<void> {
  const { error } = await supabase.from("users").delete().eq("id", id);
  if (error) throw error;
}

// ─── Cards ──────────────────────────────────────────────────────────

export async function getCardsForDate(date: DateString): Promise<Card[]> {
  const { data, error } = await supabase
    .from("cards")
    .select("*, habits(*)")
    .eq("date", date)
    .order("created_at", { ascending: true });
  if (error) throw error;

  return (data ?? []).map((card) => ({
    ...card,
    habits: (card.habits ?? []).sort(
      (a: Habit, b: Habit) => a.sort_order - b.sort_order
    ),
  }));
}

export async function getCardForUserAndDate(
  userId: string,
  date: DateString
): Promise<Card | null> {
  const { data, error } = await supabase
    .from("cards")
    .select("*, habits(*)")
    .eq("user_id", userId)
    .eq("date", date)
    .single();

  if (error && error.code === "PGRST116") return null; // not found
  if (error) throw error;

  return data
    ? {
        ...data,
        habits: (data.habits ?? []).sort(
          (a: Habit, b: Habit) => a.sort_order - b.sort_order
        ),
      }
    : null;
}

/**
 * Lazy card creation: if no card exists for this user+date, create one
 * by copying habits (unchecked) from the user's most recent card.
 */
export async function ensureCardExists(
  userId: string,
  date: DateString
): Promise<Card> {
  // Check if card already exists
  const existing = await getCardForUserAndDate(userId, date);
  if (existing) return existing;

  // Create the card
  const { data: card, error: cardErr } = await supabase
    .from("cards")
    .insert({ user_id: userId, date, note: "" })
    .select()
    .single();
  if (cardErr) throw cardErr;

  // Find the most recent card for this user (before this date) to copy habits
  const { data: prevCards } = await supabase
    .from("cards")
    .select("id")
    .eq("user_id", userId)
    .lt("date", date)
    .order("date", { ascending: false })
    .limit(1);

  if (prevCards && prevCards.length > 0) {
    // Get habits from previous card
    const { data: prevHabits } = await supabase
      .from("habits")
      .select("*")
      .eq("card_id", prevCards[0].id)
      .order("sort_order", { ascending: true });

    if (prevHabits && prevHabits.length > 0) {
      const newHabits = prevHabits.map((h: Habit, i: number) => ({
        card_id: card.id,
        text: h.text,
        checked: false,
        sort_order: i,
      }));

      const { error: habErr } = await supabase.from("habits").insert(newHabits);
      if (habErr) throw habErr;
    }
  }

  // Return the full card with habits
  return (await getCardForUserAndDate(userId, date))!;
}

/**
 * Ensure cards exist for ALL users on a given date (batch lazy creation).
 */
export async function ensureCardsForDate(
  users: User[],
  date: DateString
): Promise<Card[]> {
  const cards = await Promise.all(
    users.map((u) => ensureCardExists(u.id, date))
  );
  return cards;
}

// ─── Habits ─────────────────────────────────────────────────────────

export async function toggleHabit(
  habitId: string,
  checked: boolean
): Promise<void> {
  const { error } = await supabase
    .from("habits")
    .update({ checked })
    .eq("id", habitId);
  if (error) throw error;
}

export async function addHabit(cardId: string, text: string): Promise<Habit> {
  // Get current max sort_order for this card
  const { data: existing } = await supabase
    .from("habits")
    .select("sort_order")
    .eq("card_id", cardId)
    .order("sort_order", { ascending: false })
    .limit(1);

  const nextOrder =
    existing && existing.length > 0 ? existing[0].sort_order + 1 : 0;

  const { data, error } = await supabase
    .from("habits")
    .insert({ card_id: cardId, text, checked: false, sort_order: nextOrder })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function removeHabit(habitId: string): Promise<void> {
  const { error } = await supabase.from("habits").delete().eq("id", habitId);
  if (error) throw error;
}

export async function reorderHabits(
  cardId: string,
  orderedIds: string[]
): Promise<void> {
  const updates = orderedIds.map((id, i) =>
    supabase.from("habits").update({ sort_order: i }).eq("id", id)
  );
  await Promise.all(updates);
}

// ─── Notes ──────────────────────────────────────────────────────────

export async function updateNote(
  cardId: string,
  text: string
): Promise<void> {
  const { error } = await supabase
    .from("cards")
    .update({ note: text })
    .eq("id", cardId);
  if (error) throw error;
}

// ─── Real-time ──────────────────────────────────────────────────────

export function subscribeToChanges(
  onCardsChange: () => void,
  onHabitsChange: () => void,
  onUsersChange: () => void
) {
  const channel = supabase
    .channel("habit-tracker-realtime")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "cards" },
      () => onCardsChange()
    )
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "habits" },
      () => onHabitsChange()
    )
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "users" },
      () => onUsersChange()
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
