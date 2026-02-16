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

export type DateString = string; // YYYY-MM-DD format
