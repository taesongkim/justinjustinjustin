export interface User {
  id: string;
  name: string;
  goals: string;
  created_at: string;
  sort_order: number;
}

export interface Card {
  id: string;
  user_id: string;
  date: string; // YYYY-MM-DD
  note: string;
  created_at: string;
  habits: Habit[];
}

export interface Habit {
  id: string;
  card_id: string;
  text: string;
  checked: boolean;
  sort_order: number;
}

export interface Journey {
  id: string;
  user_id: string;
  start_date: string; // YYYY-MM-DD
  end_date: string;   // YYYY-MM-DD
  created_at: string;
}

export type DayStatus = "completed" | "missed" | "future";

export type DateString = string; // YYYY-MM-DD format

// ─── Avatar ────────────────────────────────────────────────────────

export type AvatarMood =
  | "celebrating"
  | "walking"
  | "walking_happy"
  | "dancing"
  | "sad"
  | "dancing_sensual";

export const AVATAR_MOODS: { value: AvatarMood; label: string }[] = [
  { value: "celebrating", label: "Celebrating" },
  { value: "walking", label: "Walking" },
  { value: "walking_happy", label: "Walking happily" },
  { value: "dancing", label: "Dancing" },
  { value: "sad", label: "Sad" },
  { value: "dancing_sensual", label: "Dancing sensually" },
];

export interface AvatarGif {
  id: string;
  user_id: string;
  mood: AvatarMood;
  storage_path: string;
  created_at: string;
}

export interface AvatarMoodEntry {
  id: string;
  user_id: string;
  date: string; // YYYY-MM-DD
  mood: AvatarMood;
  created_at: string;
}
