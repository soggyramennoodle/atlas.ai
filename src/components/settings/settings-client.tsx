"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  Check,
  Loader2,
  LogOut,
  Lock,
  Mail,
  ShieldCheck,
  Trash2,
  User,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import type { UserProfile } from "@/lib/types";
import { PasskeysPanel } from "@/components/settings/passkeys-panel";

type Tab = "profile" | "privacy" | "account";

const TABS: { id: Tab; label: string; icon: typeof User }[] = [
  { id: "profile", label: "Profile", icon: User },
  { id: "privacy", label: "Privacy & Data", icon: ShieldCheck },
  { id: "account", label: "Account", icon: Mail },
];

export function SettingsClient({
  email,
  joined,
  profile,
}: {
  email: string;
  joined: string | null;
  profile: UserProfile | null;
}) {
  const [tab, setTab] = useState<Tab>("profile");

  return (
    <div className="mt-8">
      {/* Tab bar */}
      <div className="flex gap-1 rounded-[4px] border border-border bg-card p-1">
        {TABS.map((t) => {
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                "icon-animate relative flex flex-1 items-center justify-center gap-2 rounded-[3px] px-4 py-2 text-sm font-medium transition-colors",
                active
                  ? "text-background"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {active && (
                <motion.span
                  layoutId="settings-tab"
                  className="absolute inset-0 rounded-[3px] bg-foreground"
                  transition={{ type: "spring", stiffness: 380, damping: 32 }}
                />
              )}
              <t.icon className="relative size-4" />
              <span className="relative hidden sm:inline">{t.label}</span>
            </button>
          );
        })}
      </div>

      <div className="mt-6">
        {tab === "profile" && <ProfileForm email={email} profile={profile} />}
        {tab === "privacy" && <PrivacyPanel />}
        {tab === "account" && <AccountPanel email={email} joined={joined} />}
      </div>
    </div>
  );
}

const PROFILE_FIELDS: {
  key: keyof Omit<UserProfile, "user_id" | "created_at">;
  label: string;
  placeholder: string;
}[] = [
  { key: "display_name", label: "Display name", placeholder: "Your name" },
  { key: "institution", label: "Institution", placeholder: "Your university" },
  { key: "program", label: "Program / major", placeholder: "e.g. BSc Physics" },
  { key: "year", label: "Current year", placeholder: "e.g. 3rd year" },
  { key: "grad_year", label: "Expected graduation", placeholder: "e.g. 2027" },
];

function ProfileForm({
  email,
  profile,
}: {
  email: string;
  profile: UserProfile | null;
}) {
  const [values, setValues] = useState<Record<string, string>>(() => ({
    display_name: profile?.display_name ?? "",
    institution: profile?.institution ?? "",
    program: profile?.program ?? "",
    year: profile?.year ?? "",
    grad_year: profile?.grad_year ?? "",
  }));
  const [saved, setSaved] = useState<Record<string, string>>(values);
  const [status, setStatus] = useState<"idle" | "saving" | "saved">("idle");

  // Optimistic: persist a field the moment it loses focus, if it changed.
  async function commit(key: string) {
    if (values[key] === saved[key]) return;
    const optimistic = { ...saved, [key]: values[key] };
    setSaved(optimistic);
    setStatus("saving");
    try {
      const res = await fetch("/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [key]: values[key] }),
      });
      if (!res.ok) throw new Error();
      setStatus("saved");
      window.setTimeout(() => setStatus("idle"), 1500);
    } catch {
      setSaved(saved); // roll back
      setValues((v) => ({ ...v, [key]: saved[key] }));
      setStatus("idle");
      toast.error("Couldn't save that change.");
    }
  }

  return (
    <div data-tour="settings-profile" className="rounded-[4px] border border-border bg-card p-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-semibold tracking-tight">Your profile</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Atlas uses this to personalize your notes. Changes save as you go.
          </p>
        </div>
        <SaveStatus status={status} />
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {PROFILE_FIELDS.map((f) => (
          <div key={f.key} className="space-y-1.5">
            <Label htmlFor={f.key}>{f.label}</Label>
            <Input
              id={f.key}
              value={values[f.key] ?? ""}
              placeholder={f.placeholder}
              onChange={(e) =>
                setValues((v) => ({ ...v, [f.key]: e.target.value }))
              }
              onBlur={() => commit(f.key)}
              onKeyDown={(e) => {
                if (e.key === "Enter") (e.target as HTMLInputElement).blur();
              }}
            />
          </div>
        ))}
        <div className="space-y-1.5">
          <Label htmlFor="email-readonly">Email</Label>
          <Input id="email-readonly" value={email} disabled />
        </div>
      </div>
    </div>
  );
}

function SaveStatus({ status }: { status: "idle" | "saving" | "saved" }) {
  if (status === "idle") return null;
  return (
    <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
      {status === "saving" ? (
        <>
          <Loader2 className="size-3.5 animate-spin" /> Saving…
        </>
      ) : (
        <>
          <Check className="size-3.5 text-emerald-400" /> Saved
        </>
      )}
    </span>
  );
}

function PrivacyPanel() {
  return (
    <div className="space-y-4">
      <div className="ai-ring icon-animate relative isolate rounded-[4px] border border-border bg-card p-6">
        <span className="inline-flex items-center gap-2 rounded-[4px] border border-primary/30 bg-primary/10 px-3 py-1 font-mono text-[0.7rem] uppercase tracking-[0.18em] text-primary">
          <Lock className="size-3.5" />
          Atlas Enclave
        </span>
        <h2 className="mt-4 text-xl font-bold tracking-tight">
          Your notes are private and only visible to you.
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground text-pretty">
          Every recording and note is scoped to your account alone. No one else,
          not other students, not the public, can see them.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <InfoCard
          icon={Trash2}
          title="Audio is deleted after processing"
          body="Your lecture audio is sent to our notes engine, transcribed, and then deleted. We keep the notes, not the recording on our processor."
        />
        <InfoCard
          icon={ShieldCheck}
          title="Never sold or shared"
          body="Your data is never sold, shared, or used to train third-party models. It exists to serve you and only you."
        />
      </div>
    </div>
  );
}

function InfoCard({
  icon: Icon,
  title,
  body,
}: {
  icon: typeof ShieldCheck;
  title: string;
  body: string;
}) {
  return (
    <div className="icon-animate rounded-[4px] border border-border bg-card p-5">
      <span className="grid size-9 place-items-center rounded-[4px] border border-border bg-background text-foreground">
        <Icon className="size-4" />
      </span>
      <h3 className="mt-3 text-sm font-semibold tracking-tight">{title}</h3>
      <p className="mt-1 text-sm leading-relaxed text-muted-foreground text-pretty">
        {body}
      </p>
    </div>
  );
}

function AccountPanel({
  email,
  joined,
}: {
  email: string;
  joined: string | null;
}) {
  return (
    <div className="space-y-4">
      <PasskeysPanel />

      <div className="rounded-[4px] border border-border bg-card p-6">
        <h2 className="font-semibold tracking-tight">Account</h2>
        <dl className="mt-5 grid gap-4 sm:grid-cols-2">
          <div className="icon-animate rounded-[4px] border border-border bg-background p-4">
            <dt className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              <Mail className="size-3.5" /> Email
            </dt>
            <dd className="mt-1.5 truncate text-sm font-medium">{email}</dd>
          </div>
          <div className="rounded-[4px] border border-border bg-background p-4">
            <dt className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Member since
            </dt>
            <dd className="mt-1.5 text-sm font-medium">{joined ?? "Not set"}</dd>
          </div>
        </dl>
      </div>

      <div className="flex items-center justify-between rounded-[4px] border border-border bg-card p-6">
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
  );
}
