import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isNewsroomAdmin } from "@/lib/newsroom";
import { parseThemePreference } from "@/lib/theme";
import { AppShell } from "@/components/app/app-shell";
import { RecordingProvider } from "@/components/recording/recording-context";
import { RecordingDock } from "@/components/recording/recording-dock";
import { MarketingBackground } from "@/components/marketing-background";
import { ThemeSync } from "@/components/theme-sync";

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
    .select("display_name, ui_tour_completed_at, theme_preference")
    .maybeSingle();
  if (!profileError && !profile?.display_name) redirect("/onboarding");

  const savedTheme = parseThemePreference(profile?.theme_preference);

  return (
    <RecordingProvider userId={user.id}>
      <ThemeSync savedTheme={savedTheme} />
      <div className="relative min-h-screen">
        {/* Clean rivo-light canvas, shared with the marketing surface. */}
        <MarketingBackground />
        <AppShell
          email={user.email ?? ""}
          name={profile?.display_name ?? ""}
          isAdmin={isNewsroomAdmin(user.email)}
          showUiTour={!profileError && !profile?.ui_tour_completed_at}
        >
          {children}
        </AppShell>
        {/* Persistent recording fly-out, shown off the /upload page (§8). */}
        <RecordingDock />
      </div>
    </RecordingProvider>
  );
}
