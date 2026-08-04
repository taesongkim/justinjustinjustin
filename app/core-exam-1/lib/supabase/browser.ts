"use client";

import { createBrowserClient } from "@supabase/ssr";
import { getSupabasePublicConfig } from "./config";

export function createCoreExamBrowserClient() {
  const { anonKey, url } = getSupabasePublicConfig();
  return createBrowserClient(url, anonKey);
}
