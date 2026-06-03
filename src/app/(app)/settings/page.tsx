import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { LogOut, Mail, ShieldCheck, Sparkles } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/settings");

  const email = user.email ?? "";
  const name = email.split("@")[0];
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
        <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
          Settings
        </h1>

        {/* Profile card */}
        <div className="mt-8 overflow-hidden rounded-[1.75rem] border bg-card/70 ring-luxe">
          <div className="relative h-24 bg-gradient-to-br from-primary/25 via-primary/10 to-transparent">
            <div className="pointer-events-none absolute inset-0 bg-grid opacity-30" />
          </div>
          <div className="px-6 pb-6">
            <div className="-mt-10 flex items-end gap-4">
              <Avatar className="size-20 border-4 border-card">
                <AvatarFallback className="bg-primary/15 text-2xl font-semibold text-primary">
                  {name[0]?.toUpperCase() ?? "?"}
                </AvatarFallback>
              </Avatar>
              <div className="pb-1">
                <h2 className="text-xl font-semibold capitalize tracking-tight">
                  {name}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {joined ? `Atlas member since ${joined}` : "Atlas member"}
                </p>
              </div>
            </div>

            <dl className="mt-8 grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border bg-background/40 p-4">
                <dt className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  <Mail className="size-3.5" /> Email
                </dt>
                <dd className="mt-1.5 truncate text-sm font-medium">{email}</dd>
              </div>
              <div className="rounded-2xl border bg-background/40 p-4">
                <dt className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  <ShieldCheck className="size-3.5" /> Privacy
                </dt>
                <dd className="mt-1.5 text-sm font-medium">
                  Notes scoped to you (RLS)
                </dd>
              </div>
            </dl>
          </div>
        </div>

        {/* Coming soon */}
        <div className="mt-6 flex items-start gap-4 rounded-[1.75rem] border border-primary/20 bg-gradient-to-br from-primary/10 to-transparent p-6">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
            <Sparkles className="size-5" />
          </span>
          <div>
            <h3 className="font-semibold tracking-tight">More controls coming</h3>
            <p className="mt-1 text-sm text-muted-foreground text-pretty">
              Preferences for note depth, default subjects, and exporting your
              library are on the way. For now, your account is ready to go.
            </p>
          </div>
        </div>

        {/* Sign out */}
        <div className="mt-6 flex items-center justify-between rounded-[1.75rem] border bg-card/70 p-6">
          <div>
            <h3 className="font-semibold tracking-tight">Sign out</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              End your session on this device.
            </p>
          </div>
          <form action="/auth/signout" method="post">
            <Button variant="outline" className="gap-2">
              <LogOut className="size-4" />
              Sign out
            </Button>
          </form>
        </div>
      </div>
    </main>
  );
}
