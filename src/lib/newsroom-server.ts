import "server-only";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { isNewsroomAdmin } from "@/lib/newsroom";

/**
 * Returns the signed-in user iff they are a Newsroom admin (their email is in
 * NEWSROOM_ADMIN_EMAILS), otherwise null. Shared by admin pages (which call
 * notFound() on null to hide the area's existence) and server actions (which
 * return an error). Always re-checked server-side on every request/write.
 */
export async function getNewsroomAdmin(): Promise<User | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !isNewsroomAdmin(user.email)) return null;
  return user;
}
