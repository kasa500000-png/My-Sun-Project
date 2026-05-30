import { createClient, SupabaseClient } from "@supabase/supabase-js";

export function getSupabaseServiceEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) throw new Error("Missing Supabase service environment variables");
  return { url, key };
}

export function getServiceClient(): SupabaseClient {
  const { url, key } = getSupabaseServiceEnv();
  return createClient(url, key, { auth: { persistSession: false } });
}
