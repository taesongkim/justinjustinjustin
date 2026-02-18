export interface Profile {
  id: string;
  email: string;
  created_at: string;
}

export interface Vision {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  color_hue: number;
  is_fulfilled: boolean;
  fulfilled_at: string | null;
  created_at: string;
}

export interface LedgerEntry {
  id: string;
  vision_id: string;
  user_id: string;
  type: "action" | "synchronicity";
  note: string;
  occurred_at: string;
  created_at: string;
}
