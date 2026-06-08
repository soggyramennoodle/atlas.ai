import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { OnboardingFlow } from "@/components/onboarding/onboarding-flow";
import { AccessRevocationGuard } from "@/components/access-revocation-guard";

export const metadata: Metadata = { title: "Welcome to Atlas" };

export default async function OnboardingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/onboarding");

  // If they've already completed onboarding, skip straight to the app.
  const { data: profile } = await supabase
    .from("user_profiles")
    .select("display_name")
    .maybeSingle();
  if (profile?.display_name) redirect("/dashboard");

  return (
    <>
      <AccessRevocationGuard userId={user.id} />
      <OnboardingFlow />
    </>
  );
}
