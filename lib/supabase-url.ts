export function normalizeSupabaseUrl(rawUrl: string) {
  return new URL(rawUrl).origin;
}
