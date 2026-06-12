import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SettingsClient } from "@/components/settings/settings-client";
import { SettingsIdentityCard } from "@/components/settings/settings-identity-card";
import type { UserMemory, UserProfile } from "@/lib/types";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/settings");

  const [{ data: profileRow }, { data: memoryRow }] = await Promise.all([
    supabase.from("user_profiles").select("*").maybeSingle(),
    supabase.from("user_memory").select("memory_blob").maybeSingle(),
  ]);
  const profile = (profileRow as UserProfile | null) ?? null;
  const memory =
    ((memoryRow?.memory_blob as UserMemory | undefined) ?? null) || null;

  const email = user.email ?? "";
  const displayName = profile?.display_name?.trim() || email.split("@")[0];
  const joined = user.created_at
    ? new Date(user.created_at).toLocaleDateString(undefined, {
        month: "long",
        year: "numeric",
      })
    : null;

  return (
    <main className="px-4 pb-24 pt-8 sm:px-6 lg:px-10 lg:pt-12">
      <div className="mx-auto max-w-5xl">
        <header className="border-b border-black/[0.08] pb-8">
          <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-[#0d0d0d]/45">
          Account
          </p>
          <h1 className="mt-3 text-balance text-5xl font-normal leading-[0.98] text-[#0d0d0d] sm:text-6xl">
            Settings for{" "}
            <span className="font-instrument italic">Atlas</span>
          </h1>
          <p className="mt-4 max-w-2xl text-pretty text-sm leading-6 text-[#0d0d0d]/60 sm:text-base">
            Keep your identity, study memory, sign-in methods, and privacy
            controls tuned without leaving the app.
          </p>
        </header>

        <SettingsIdentityCard
          displayName={displayName}
          joined={joined}
          avatarR2Key={profile?.avatar_r2_key ?? null}
        />

        <SettingsClient
          email={email}
          joined={joined}
          profile={profile}
          memory={memory}
        />
      </div>
    </main>
  );
}
