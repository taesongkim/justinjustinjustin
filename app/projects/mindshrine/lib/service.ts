import type { Vision, LedgerEntry } from "./types";

// ── Helper: date N months ago ──
function monthsAgo(n: number): string {
  const d = new Date();
  d.setMonth(d.getMonth() - n);
  return d.toISOString();
}
function weeksAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n * 7);
  return d.toISOString();
}

// ── Static sample visions ──
const SAMPLE_VISIONS: Vision[] = [
  {
    id: "v1",
    user_id: "demo",
    title: "I'm making $10,000 per month",
    description: "Building sustainable freelance income through focused outreach and pricing strategy.",
    color_hue: 270,
    is_fulfilled: false,
    fulfilled_at: null,
    created_at: monthsAgo(12),
  },
  {
    id: "v2",
    user_id: "demo",
    title: "I've been in every country in the world",
    description: "Visiting all 195 countries through slow travel, remote work, and intentional route planning.",
    color_hue: 180,
    is_fulfilled: false,
    fulfilled_at: null,
    created_at: monthsAgo(12),
  },
  {
    id: "v3",
    user_id: "demo",
    title: "I finished the Paris marathon",
    description: "Training from scratch to complete the Marathon de Paris.",
    color_hue: 30,
    is_fulfilled: false,
    fulfilled_at: null,
    created_at: monthsAgo(12),
  },
];

// ── Static sample ledger entries ──
const SAMPLE_ENTRIES: LedgerEntry[] = [
  // ─── Vision 1: $10K/month ───
  { id: "e1-1", vision_id: "v1", user_id: "demo", type: "action", note: "Started freelance profile on Upwork and sent first 5 proposals", occurred_at: monthsAgo(11), created_at: monthsAgo(11) },
  { id: "e1-2", vision_id: "v1", user_id: "demo", type: "synchronicity", note: "Ran into old college friend at coffee shop who offered to refer me to clients", occurred_at: monthsAgo(10), created_at: monthsAgo(10) },
  { id: "e1-3", vision_id: "v1", user_id: "demo", type: "action", note: "Completed first paid freelance project ($400)", occurred_at: monthsAgo(9), created_at: monthsAgo(9) },
  { id: "e1-4", vision_id: "v1", user_id: "demo", type: "action", note: "Launched a personal portfolio site to showcase work", occurred_at: monthsAgo(8), created_at: monthsAgo(8) },
  { id: "e1-5", vision_id: "v1", user_id: "demo", type: "synchronicity", note: "Podcast randomly recommended exact book I needed on pricing strategy", occurred_at: monthsAgo(7), created_at: monthsAgo(7) },
  { id: "e1-6", vision_id: "v1", user_id: "demo", type: "action", note: "Raised rates by 40% after finishing pricing book", occurred_at: monthsAgo(7), created_at: monthsAgo(7) },
  { id: "e1-7", vision_id: "v1", user_id: "demo", type: "action", note: "Signed first retainer client at $2,000/month", occurred_at: monthsAgo(6), created_at: monthsAgo(6) },
  { id: "e1-8", vision_id: "v1", user_id: "demo", type: "synchronicity", note: "Client referred me to another client without me asking", occurred_at: monthsAgo(5), created_at: monthsAgo(5) },
  { id: "e1-9", vision_id: "v1", user_id: "demo", type: "action", note: "Started tracking income weekly and projecting monthly targets", occurred_at: monthsAgo(4), created_at: monthsAgo(4) },
  { id: "e1-10", vision_id: "v1", user_id: "demo", type: "action", note: "Launched productized service offering at fixed price", occurred_at: monthsAgo(3), created_at: monthsAgo(3) },
  { id: "e1-11", vision_id: "v1", user_id: "demo", type: "synchronicity", note: "Saw \"abundance\" graffiti on a wall the morning I hit $7K month", occurred_at: monthsAgo(2), created_at: monthsAgo(2) },
  { id: "e1-12", vision_id: "v1", user_id: "demo", type: "action", note: "Sent outreach to 20 warm leads from LinkedIn", occurred_at: weeksAgo(3), created_at: weeksAgo(3) },

  // ─── Vision 2: Every country ───
  { id: "e2-1", vision_id: "v2", user_id: "demo", type: "action", note: "Created a spreadsheet tracking all 195 countries with visited/remaining", occurred_at: monthsAgo(11), created_at: monthsAgo(11) },
  { id: "e2-2", vision_id: "v2", user_id: "demo", type: "action", note: "Booked a 3-week trip through Southeast Asia — Thailand, Cambodia, Laos, Vietnam", occurred_at: monthsAgo(10), created_at: monthsAgo(10) },
  { id: "e2-3", vision_id: "v2", user_id: "demo", type: "synchronicity", note: "Sat next to a travel blogger on a flight who shared cheap route hacks", occurred_at: monthsAgo(9), created_at: monthsAgo(9) },
  { id: "e2-4", vision_id: "v2", user_id: "demo", type: "action", note: "Applied for a remote work visa in Portugal", occurred_at: monthsAgo(8), created_at: monthsAgo(8) },
  { id: "e2-5", vision_id: "v2", user_id: "demo", type: "action", note: "Took weekend trips from Lisbon to Morocco and Andorra", occurred_at: monthsAgo(7), created_at: monthsAgo(7) },
  { id: "e2-6", vision_id: "v2", user_id: "demo", type: "synchronicity", note: "Found a $12 flight to Malta from a random Twitter post", occurred_at: monthsAgo(6), created_at: monthsAgo(6) },
  { id: "e2-7", vision_id: "v2", user_id: "demo", type: "action", note: "Joined a travel community group doing Central Asia overland trips", occurred_at: monthsAgo(5), created_at: monthsAgo(5) },
  { id: "e2-8", vision_id: "v2", user_id: "demo", type: "synchronicity", note: "Met someone at a hostel who'd been to 140 countries and shared itinerary templates", occurred_at: monthsAgo(4), created_at: monthsAgo(4) },
  { id: "e2-9", vision_id: "v2", user_id: "demo", type: "action", note: "Booked flights for Caucasus loop — Georgia, Armenia, Azerbaijan", occurred_at: monthsAgo(3), created_at: monthsAgo(3) },
  { id: "e2-10", vision_id: "v2", user_id: "demo", type: "action", note: "Got second passport to make visa applications easier", occurred_at: monthsAgo(2), created_at: monthsAgo(2) },
  { id: "e2-11", vision_id: "v2", user_id: "demo", type: "synchronicity", note: "Documentary about Bhutan appeared in recommendations the week I was planning Asia leg", occurred_at: weeksAgo(5), created_at: weeksAgo(5) },

  // ─── Vision 3: Paris marathon ───
  { id: "e3-1", vision_id: "v3", user_id: "demo", type: "action", note: "Signed up for a local 5K to establish a baseline", occurred_at: monthsAgo(12), created_at: monthsAgo(12) },
  { id: "e3-2", vision_id: "v3", user_id: "demo", type: "action", note: "Downloaded a 6-month marathon training plan and started Week 1", occurred_at: monthsAgo(10), created_at: monthsAgo(10) },
  { id: "e3-3", vision_id: "v3", user_id: "demo", type: "synchronicity", note: "Neighbor turned out to be a running coach and offered free tips", occurred_at: monthsAgo(9), created_at: monthsAgo(9) },
  { id: "e3-4", vision_id: "v3", user_id: "demo", type: "action", note: "Completed first 10-mile run without stopping", occurred_at: monthsAgo(8), created_at: monthsAgo(8) },
  { id: "e3-5", vision_id: "v3", user_id: "demo", type: "action", note: "Registered for the Paris Marathon and booked travel", occurred_at: monthsAgo(7), created_at: monthsAgo(7) },
  { id: "e3-6", vision_id: "v3", user_id: "demo", type: "synchronicity", note: "Found perfect running shoes on clearance the day old ones wore out", occurred_at: monthsAgo(6), created_at: monthsAgo(6) },
  { id: "e3-7", vision_id: "v3", user_id: "demo", type: "action", note: "Ran a half-marathon in 1:58 — first sub-2-hour", occurred_at: monthsAgo(5), created_at: monthsAgo(5) },
  { id: "e3-8", vision_id: "v3", user_id: "demo", type: "action", note: "Started incorporating speed intervals twice a week", occurred_at: monthsAgo(4), created_at: monthsAgo(4) },
  { id: "e3-9", vision_id: "v3", user_id: "demo", type: "synchronicity", note: "Song that came on during hardest training run became a personal anthem", occurred_at: monthsAgo(3), created_at: monthsAgo(3) },
  { id: "e3-10", vision_id: "v3", user_id: "demo", type: "action", note: "Did a 20-mile long run, longest distance ever", occurred_at: monthsAgo(2), created_at: monthsAgo(2) },
  { id: "e3-11", vision_id: "v3", user_id: "demo", type: "action", note: "Completed a full taper week and carb-loaded before race day", occurred_at: weeksAgo(3), created_at: weeksAgo(3) },
];

// ── In-memory state (mutable copies of sample data) ──
let visions = [...SAMPLE_VISIONS];
let entries = [...SAMPLE_ENTRIES];
let nextId = 100;

// ── Visions ──

export async function fetchVisions(): Promise<Vision[]> {
  return [...visions];
}

export async function createVision(
  title: string,
  description: string
): Promise<Vision> {
  const v: Vision = {
    id: `v-${nextId++}`,
    user_id: "demo",
    title,
    description: description || null,
    color_hue: Math.floor(Math.random() * 360),
    is_fulfilled: false,
    fulfilled_at: null,
    created_at: new Date().toISOString(),
  };
  visions = [v, ...visions];
  return v;
}

export async function updateVision(
  id: string,
  updates: Partial<Pick<Vision, "title" | "description" | "is_fulfilled" | "fulfilled_at">>
): Promise<Vision> {
  const idx = visions.findIndex((v) => v.id === id);
  if (idx === -1) throw new Error("Vision not found");
  visions[idx] = { ...visions[idx], ...updates };
  return visions[idx];
}

export async function deleteVision(id: string): Promise<void> {
  entries = entries.filter((e) => e.vision_id !== id);
  visions = visions.filter((v) => v.id !== id);
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
  return entries
    .filter((e) => e.vision_id === visionId)
    .sort((a, b) => new Date(b.occurred_at).getTime() - new Date(a.occurred_at).getTime());
}

export async function createLedgerEntry(
  visionId: string,
  type: "action" | "synchronicity",
  note: string,
  occurredAt: string
): Promise<LedgerEntry> {
  const e: LedgerEntry = {
    id: `e-${nextId++}`,
    vision_id: visionId,
    user_id: "demo",
    type,
    note,
    occurred_at: occurredAt,
    created_at: new Date().toISOString(),
  };
  entries = [e, ...entries];
  return e;
}

export async function updateLedgerEntry(
  id: string,
  updates: Partial<Pick<LedgerEntry, "note" | "occurred_at">>
): Promise<LedgerEntry> {
  const idx = entries.findIndex((e) => e.id === id);
  if (idx === -1) throw new Error("Entry not found");
  entries[idx] = { ...entries[idx], ...updates };
  return entries[idx];
}

export async function deleteLedgerEntry(id: string): Promise<void> {
  entries = entries.filter((e) => e.id !== id);
}

// ── Ledger counts (for micro-orbs) ──

export async function fetchLedgerCounts(
  visionIds: string[]
): Promise<Record<string, { actions: number; synchronicities: number }>> {
  const counts: Record<string, { actions: number; synchronicities: number }> = {};
  for (const id of visionIds) {
    counts[id] = { actions: 0, synchronicities: 0 };
  }
  for (const entry of entries) {
    if (!counts[entry.vision_id]) continue;
    if (entry.type === "action") counts[entry.vision_id].actions++;
    else counts[entry.vision_id].synchronicities++;
  }
  return counts;
}
