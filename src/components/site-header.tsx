import { createClient } from "@/lib/supabase/server";
import { Nav } from "@/components/nav";

/**
 * Server wrapper that reads the current user and feeds the client navbar,
 * so the header reflects auth state without a flash.
 */
export async function SiteHeader() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return <Nav email={user?.email ?? null} />;
}
