import "server-only";
import { createClient } from "@supabase/supabase-js";

/**
 * Privileged Supabase client using the service-role key.
 *
 * SERVER ONLY. The `server-only` import guarantees a build error if this is
 * ever imported into client code. The service-role key bypasses RLS, so it
 * must never reach the browser. Use this only inside Route Handlers / Server
 * Actions for trusted operations (e.g. downloading a user's uploaded audio for
 * processing, writing generated notes).
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error(
      "Missing Supabase admin env vars (NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY)."
    );
  }

  return createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
