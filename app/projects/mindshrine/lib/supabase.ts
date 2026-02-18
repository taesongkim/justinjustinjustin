import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://znrmtivustoacarccoey.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inpucm10aXZ1c3RvYWNhcmNjb2V5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE0Mzc0NTUsImV4cCI6MjA4NzAxMzQ1NX0.8mhw_VKtqoB7jMFapAnoohgsRGp5wx6sc265SQzRXB0";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
