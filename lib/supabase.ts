import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { normalizeSupabaseUrl } from "@/lib/supabase-url";

let cachedServiceClient: SupabaseClient | null = null;

export function getSupabaseServiceEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) throw new Error("Missing Supabase service environment variables");
  return { url, key };
}

export function getServiceClient(): SupabaseClient {
  if (cachedServiceClient) return cachedServiceClient;
  const { url, key } = getSupabaseServiceEnv();
  cachedServiceClient = createClient(normalizeSupabaseUrl(url), key, { auth: { persistSession: false } });
  return cachedServiceClient;
}
