import { redirect } from "next/navigation";
import { Inter_Tight, Instrument_Serif } from "next/font/google";
import { createClient } from "@/lib/supabase/server";
import { countUnreadFeedback } from "@/lib/admin-feedback-server";
import { isNewsroomAdmin } from "@/lib/newsroom";
import { AppShell } from "@/components/app/app-shell";
import { AppCanvas } from "@/components/app/glass";
import { RecordingProvider } from "@/components/recording/recording-context";
import { RecordingDock } from "@/components/recording/recording-dock";
import { MarketingThemeLock } from "@/components/marketing-theme-lock";
import { AccessRevocationGuard } from "@/components/access-revocation-guard";
import { PasskeyEnrollmentPrompt } from "@/components/auth/passkey-enrollment-prompt";

/* Cinematic-light language, scoped to the app surface the same way the
   marketing and auth layouts scope it. The app is light-only: the old theme
   system (ThemeSync/ThemeSelector) was deliberately retired with the
   cinematic redesign. */
const interTight = Inter_Tight({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-inter-tight",
});

const instrumentSerif = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
  variable: "--font-instrument-serif",
});

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
    .select(
      "display_name, ui_tour_completed_at, avatar_r2_key, passkey_prompt_dismissed_at"
    )
    .maybeSingle();
  if (!profileError && !profile?.display_name) redirect("/onboarding");

  const isAdmin = isNewsroomAdmin(user.email);
  const adminUnreadReports = isAdmin ? await countUnreadFeedback() : 0;

  return (
    <RecordingProvider userId={user.id}>
      <MarketingThemeLock surface="app" />
      <AccessRevocationGuard userId={user.id} />
      <PasskeyEnrollmentPrompt
        dismissedAt={profile?.passkey_prompt_dismissed_at ?? null}
      />
      <div
        className={`${interTight.variable} ${instrumentSerif.variable} font-heading relative isolate min-h-screen bg-[#f4f3f1] text-[#0d0d0d]`}
      >
        <AppCanvas />
        <AppShell
          email={user.email ?? ""}
          name={profile?.display_name ?? ""}
          avatarR2Key={profile?.avatar_r2_key ?? null}
          isAdmin={isAdmin}
          adminUnreadReports={adminUnreadReports}
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
