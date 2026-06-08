import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AvatarUpload } from "@/components/settings/avatar-upload";
import { SettingsClient } from "@/components/settings/settings-client";
import type { UserProfile } from "@/lib/types";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/settings");

  const { data: profileRow } = await supabase
    .from("user_profiles")
    .select("*")
    .maybeSingle();
  const profile = (profileRow as UserProfile | null) ?? null;

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

        {/* Identity header */}
        <div className="mt-8 overflow-hidden rounded-[4px] border border-border bg-card shadow-[0_10px_28px_rgba(15,23,42,0.05)]">
          <div className="h-14 border-b border-border bg-secondary bg-hairlines" />
          <div className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center">
            <AvatarUpload
              displayName={displayName}
              avatarR2Key={profile?.avatar_r2_key ?? null}
            />
            <div className="min-w-0 sm:flex-1">
              <h2 className="text-xl font-semibold tracking-tight">
                {displayName}
              </h2>
              <p className="text-sm text-muted-foreground">
                {joined ? `Atlas member since ${joined}` : "Atlas member"}
              </p>
            </div>
          </div>
        </div>

        <SettingsClient email={email} joined={joined} profile={profile} />
      </div>
    </main>
  );
}
