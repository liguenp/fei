/**
 * Supabase client
 * ================
 * Database connection for storing conversation sessions.
 * For the MVP, this is optional — the app works without it.
 * Later, it'll store saved trips, user preferences, etc.
 */

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

export const supabase =
  supabaseUrl && supabaseKey
    ? createClient(supabaseUrl, supabaseKey)
    : null;
