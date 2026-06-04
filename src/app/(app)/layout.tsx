import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isNewsroomAdmin } from "@/lib/newsroom";
import { AppSidebar } from "@/components/app/app-sidebar";
import { RecordingProvider } from "@/components/recording/recording-context";
import { RecordingDock } from "@/components/recording/recording-dock";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Middleware already guards these routes; defence in depth.
  if (!user) redirect("/login");

  // First-login gating (§5): send users without a profile to onboarding.
  // Fail open — if the user_profiles table isn't applied yet, the query errors
  // and we don't want to trap the user in a redirect loop.
  const { data: profile, error: profileError } = await supabase
    .from("user_profiles")
    .select("display_name")
    .maybeSingle();
  if (!profileError && !profile?.display_name) redirect("/onboarding");

  return (
    <RecordingProvider userId={user.id}>
      <div className="relative min-h-screen">
        {/* The shared spatial canvas (aurora + grid + drifting blooms) is now
            mounted once at the root layout, so every app surface floats on the
            same living background. */}
        <AppSidebar email={user.email ?? ""} isAdmin={isNewsroomAdmin(user.email)} />
        <div className="lg:pl-64">
          <div className="pt-16 lg:pt-0">{children}</div>
        </div>
        {/* Persistent recording fly-out, shown off the /upload page (§8). */}
        <RecordingDock />
      </div>
    </RecordingProvider>
  );
}
