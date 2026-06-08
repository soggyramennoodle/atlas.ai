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

  if (!user) {
    return <Nav email={null} displayName={null} avatarR2Key={null} />;
  }

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("display_name, avatar_r2_key")
    .eq("user_id", user.id)
    .maybeSingle();

  const displayName =
    profile?.display_name?.trim() || user.email?.split("@")[0] || "User";

  return (
    <Nav
      email={user.email ?? null}
      displayName={displayName}
      avatarR2Key={profile?.avatar_r2_key ?? null}
    />
  );
}
