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
    <main className="px-4 pb-24 pt-8 lg:px-8 lg:pt-12">
      <div className="mx-auto max-w-3xl">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">
          Account
        </p>
        <h1 className="mt-3 text-4xl font-bold tracking-[-0.02em] sm:text-5xl">
          Settings
        </h1>

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
