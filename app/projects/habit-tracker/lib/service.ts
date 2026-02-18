import { supabase } from "./supabase";
import type { User, Card, Habit, Journey, DayStatus, DateString, AvatarMood, AvatarGif, AvatarMoodEntry } from "./types";

// ─── Helpers ────────────────────────────────────────────────────────

export function toDateString(date: Date): DateString {
  return date.toISOString().split("T")[0];
}

const TZ_STORAGE_KEY = "ht-timezone";
const DEFAULT_TZ = "America/New_York";

export function getTimezone(): string {
  if (typeof window === "undefined") return DEFAULT_TZ;
  return localStorage.getItem(TZ_STORAGE_KEY) || DEFAULT_TZ;
}

export function setTimezone(tz: string): void {
  localStorage.setItem(TZ_STORAGE_KEY, tz);
}

export function today(tz?: string): DateString {
  const zone = tz ?? getTimezone();
  return new Date().toLocaleDateString("en-CA", { timeZone: zone }) as DateString;
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

export function formatWeekday(dateStr: DateString): string {
  const d = new Date(dateStr + "T12:00:00");
  return d.toLocaleDateString("en-US", { weekday: "long" });
}

export function formatShortDate(dateStr: DateString): string {
  const d = new Date(dateStr + "T12:00:00");
  return d.toLocaleDateString("en-US", {
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

export async function updateUserGoals(id: string, goals: string): Promise<void> {
  const { error } = await supabase
    .from("users")
    .update({ goals })
    .eq("id", id);
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

// ─── Journeys ────────────────────────────────────────────────────────

export async function getJourneysForUser(userId: string): Promise<Journey[]> {
  const { data, error } = await supabase
    .from("journeys")
    .select("*")
    .eq("user_id", userId)
    .order("start_date", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function getAllJourneys(): Promise<Journey[]> {
  const { data, error } = await supabase
    .from("journeys")
    .select("*")
    .order("start_date", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function createJourney(
  userId: string,
  startDate: DateString,
  endDate: DateString
): Promise<Journey> {
  // Validate no overlap
  const existing = await getJourneysForUser(userId);
  for (const j of existing) {
    if (!(endDate < j.start_date || startDate > j.end_date)) {
      throw new Error("Journey overlaps with existing journey");
    }
  }
  const { data, error } = await supabase
    .from("journeys")
    .insert({ user_id: userId, start_date: startDate, end_date: endDate })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteJourney(journeyId: string): Promise<void> {
  const { error } = await supabase.from("journeys").delete().eq("id", journeyId);
  if (error) throw error;
}

/** Find the journey whose date range contains the given date */
export function getActiveJourney(
  journeys: Journey[],
  date: DateString
): Journey | null {
  for (const j of journeys) {
    if (date >= j.start_date && date <= j.end_date) return j;
  }
  return null;
}

/** Fetch all cards in a journey's date range and compute per-day status */
export async function getJourneyProgress(
  userId: string,
  journey: Journey,
  todayDate?: DateString
): Promise<Map<DateString, DayStatus>> {
  const currentDate = todayDate ?? today();
  const statuses = new Map<DateString, DayStatus>();

  // Batch-fetch all cards in the date range for this user
  const { data: cardsData, error } = await supabase
    .from("cards")
    .select("*, habits(*)")
    .eq("user_id", userId)
    .gte("date", journey.start_date)
    .lte("date", journey.end_date)
    .order("date", { ascending: true });
  if (error) throw error;

  const cardsByDate = new Map<string, Card>();
  for (const raw of cardsData ?? []) {
    const card: Card = {
      ...raw,
      habits: (raw.habits ?? []).sort(
        (a: Habit, b: Habit) => a.sort_order - b.sort_order
      ),
    };
    cardsByDate.set(card.date, card);
  }

  // Walk every day in the journey range
  const cursor = new Date(journey.start_date + "T12:00:00");
  const end = new Date(journey.end_date + "T12:00:00");

  while (cursor <= end) {
    const dateStr = toDateString(cursor) as DateString;
    if (dateStr > currentDate) {
      // Future day — grey dot
      statuses.set(dateStr, "future");
    } else if (dateStr === currentDate) {
      // Current day — green ring if all checked, grey dot otherwise
      // (failure isn't known until the day passes)
      const card = cardsByDate.get(dateStr);
      const allChecked = card && card.habits.length > 0 && card.habits.every((h) => h.checked);
      statuses.set(dateStr, allChecked ? "completed" : "future");
    } else {
      // Past day — green ring if all checked, red X if missed
      const card = cardsByDate.get(dateStr);
      if (!card || card.habits.length === 0) {
        statuses.set(dateStr, "missed");
      } else {
        statuses.set(
          dateStr,
          card.habits.every((h) => h.checked) ? "completed" : "missed"
        );
      }
    }
    cursor.setDate(cursor.getDate() + 1);
  }

  return statuses;
}

// ─── Avatars ────────────────────────────────────────────────────────

export async function getAllAvatarGifs(): Promise<AvatarGif[]> {
  const { data, error } = await supabase
    .from("avatar_gifs")
    .select("*")
    .order("mood", { ascending: true });
  if (error) throw error;
  return (data ?? []) as AvatarGif[];
}

export async function uploadAvatarGif(
  userId: string,
  mood: AvatarMood,
  file: File
): Promise<AvatarGif> {
  const path = `${userId}/${mood}.gif`;

  // Upload to storage (upsert)
  const { error: uploadError } = await supabase.storage
    .from("avatars")
    .upload(path, file, { upsert: true, contentType: "image/gif" });
  if (uploadError) throw uploadError;

  // Upsert DB row
  const { data, error } = await supabase
    .from("avatar_gifs")
    .upsert(
      { user_id: userId, mood, storage_path: path },
      { onConflict: "user_id,mood" }
    )
    .select()
    .single();
  if (error) throw error;
  return data as AvatarGif;
}

export async function deleteAvatarGif(userId: string, mood: AvatarMood): Promise<void> {
  const path = `${userId}/${mood}.gif`;
  await supabase.storage.from("avatars").remove([path]);
  await supabase.from("avatar_gifs").delete().eq("user_id", userId).eq("mood", mood);
}

export function getAvatarGifUrl(storagePath: string): string {
  const { data } = supabase.storage.from("avatars").getPublicUrl(storagePath);
  return data.publicUrl;
}

export async function getAvatarMoodsForDate(date: DateString): Promise<AvatarMoodEntry[]> {
  const { data, error } = await supabase
    .from("avatar_moods")
    .select("*")
    .eq("date", date);
  if (error) throw error;
  return (data ?? []) as AvatarMoodEntry[];
}

export async function setAvatarMood(
  userId: string,
  date: DateString,
  mood: AvatarMood
): Promise<AvatarMoodEntry> {
  const { data, error } = await supabase
    .from("avatar_moods")
    .upsert(
      { user_id: userId, date, mood },
      { onConflict: "user_id,date" }
    )
    .select()
    .single();
  if (error) throw error;
  return data as AvatarMoodEntry;
}

export async function clearAvatarMood(userId: string, date: DateString): Promise<void> {
  await supabase.from("avatar_moods").delete().eq("user_id", userId).eq("date", date);
}

// ─── Real-time ──────────────────────────────────────────────────────

export function subscribeToChanges(
  onCardsChange: () => void,
  onHabitsChange: () => void,
  onUsersChange: () => void,
  onJourneysChange?: () => void,
  onAvatarsChange?: () => void
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
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "journeys" },
      () => onJourneysChange?.()
    )
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "avatar_gifs" },
      () => onAvatarsChange?.()
    )
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "avatar_moods" },
      () => onAvatarsChange?.()
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
