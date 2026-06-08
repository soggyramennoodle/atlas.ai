import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

/** Resolve auth emails for a set of user ids (admin-only). */
export async function fetchUserEmails(userIds: string[]): Promise<Map<string, string>> {
  const unique = [...new Set(userIds)];
  const map = new Map<string, string>();
  if (unique.length === 0) return map;

  const db = createAdminClient();
  await Promise.all(
    unique.map(async (id) => {
      const { data } = await db.auth.admin.getUserById(id);
      const email = data.user?.email;
      if (email) map.set(id, email);
    })
  );
  return map;
}
