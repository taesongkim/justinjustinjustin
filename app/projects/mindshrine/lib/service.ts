import { supabase } from "./supabase";
import type { Vision, LedgerEntry } from "./types";

// ── Visions ──

export async function fetchVisions(): Promise<Vision[]> {
  const { data, error } = await supabase
    .from("visions")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function createVision(
  title: string,
  description: string
): Promise<Vision> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data, error } = await supabase
    .from("visions")
    .insert({ user_id: user.id, title, description })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateVision(
  id: string,
  updates: Partial<Pick<Vision, "title" | "description" | "is_fulfilled" | "fulfilled_at">>
): Promise<Vision> {
  const { data, error } = await supabase
    .from("visions")
    .update(updates)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteVision(id: string): Promise<void> {
  // Delete ledger entries first
  await supabase.from("ledger_entries").delete().eq("vision_id", id);
  const { error } = await supabase.from("visions").delete().eq("id", id);
  if (error) throw error;
}

export async function fulfillVision(id: string): Promise<Vision> {
  return updateVision(id, {
    is_fulfilled: true,
    fulfilled_at: new Date().toISOString(),
  });
}

// ── Ledger Entries ──

export async function fetchLedgerEntries(
  visionId: string
): Promise<LedgerEntry[]> {
  const { data, error } = await supabase
    .from("ledger_entries")
    .select("*")
    .eq("vision_id", visionId)
    .order("occurred_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function createLedgerEntry(
  visionId: string,
  type: "action" | "synchronicity",
  note: string,
  occurredAt: string
): Promise<LedgerEntry> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data, error } = await supabase
    .from("ledger_entries")
    .insert({
      vision_id: visionId,
      user_id: user.id,
      type,
      note,
      occurred_at: occurredAt,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

// ── Ledger counts (for micro-orbs) ──

export async function fetchLedgerCounts(
  visionIds: string[]
): Promise<Record<string, { actions: number; synchronicities: number }>> {
  if (visionIds.length === 0) return {};

  const { data, error } = await supabase
    .from("ledger_entries")
    .select("vision_id, type")
    .in("vision_id", visionIds);
  if (error) throw error;

  const counts: Record<string, { actions: number; synchronicities: number }> = {};
  for (const id of visionIds) {
    counts[id] = { actions: 0, synchronicities: 0 };
  }
  for (const entry of data ?? []) {
    if (!counts[entry.vision_id]) {
      counts[entry.vision_id] = { actions: 0, synchronicities: 0 };
    }
    if (entry.type === "action") counts[entry.vision_id].actions++;
    else counts[entry.vision_id].synchronicities++;
  }
  return counts;
}
