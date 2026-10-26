/**
 * Supabase connection for the server, or null when the site runs on the local file store.
 * SUPABASE_SECRET_KEY holds the new sb_secret_… key; the legacy service_role key is still accepted.
 */
export function supabaseEnv(): { url: string; key: string } | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  return url && key ? { url, key } : null;
}
