import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-primary">
          Account
        </p>
        <h1 className="mt-3 font-display text-4xl font-extrabold tracking-[-0.02em] sm:text-5xl">
          Settings
        </h1>

        {/* Identity header */}
        <div className="mt-8 overflow-hidden rounded-[1.75rem] border bg-card/55 backdrop-blur-xl ring-luxe">
          <div className="relative h-24 bg-gradient-to-br from-primary/25 via-primary/10 to-transparent">
            <div className="pointer-events-none absolute inset-0 bg-grid opacity-30" />
          </div>
          <div className="px-6 pb-6">
            <div className="-mt-10 flex items-end gap-4">
              <Avatar className="size-20 border-4 border-card">
                <AvatarFallback className="bg-primary/15 text-2xl font-semibold text-primary">
                  {displayName[0]?.toUpperCase() ?? "?"}
                </AvatarFallback>
              </Avatar>
              <div className="pb-1">
                <h2 className="font-display text-xl font-semibold tracking-tight">
                  {displayName}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {joined ? `Atlas member since ${joined}` : "Atlas member"}
                </p>
              </div>
            </div>
          </div>
        </div>

        <SettingsClient email={email} joined={joined} profile={profile} />
      </div>
    </main>
  );
}
