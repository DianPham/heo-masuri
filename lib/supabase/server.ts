import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

function readEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing Supabase server env vars");
  return { url, key };
}

// Service-role client — server-side only. Never expose to browser.
// UNTYPED — used by existing Phase 1/1.5 routes. Prefer `createTypedServerClient`
// for all new code; existing routes will migrate in Phase 2D polish.
export function createServerClient() {
  const { url, key } = readEnv();
  return createClient(url, key, { auth: { persistSession: false } });
}

// Typed service-role client — REQUIRED for all new (Phase 2+) code.
// Schema typed against the live database via types/database.ts, regenerated
// after every migration with `npm run db:types`.
export function createTypedServerClient() {
  const { url, key } = readEnv();
  return createClient<Database>(url, key, { auth: { persistSession: false } });
}
