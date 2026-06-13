"use client";

import { useEffect, useState, type ComponentType, type CSSProperties } from "react";
import { motion } from "framer-motion";
import {
  Brain,
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
import {
  DARK_FIELD,
  GLASS_DARK,
  GLASS_DARK_PILL,
} from "@/components/app/glass";
import { cn } from "@/lib/utils";
import type { UserMemory, UserProfile } from "@/lib/types";
import { PasskeysPanel } from "@/components/settings/passkeys-panel";
import { MemoryPanel } from "@/components/settings/memory-panel";

type Tab = "profile" | "memory" | "privacy" | "account";

/** The standard settings surface: dark liquid glass with a 3xl radius. */
const CARD = cn(GLASS_DARK, "rounded-3xl");
/** Pill-shaped dark text field for the profile form. */
const FIELD = cn(DARK_FIELD, "h-11 w-full rounded-full px-5 text-sm");

const TABS: { id: Tab; label: string; icon: ComponentType<{ className?: string }> }[] = [
  { id: "profile", label: "Profile", icon: User },
  { id: "memory", label: "Memory", icon: Brain },
  { id: "privacy", label: "Privacy & data", icon: ShieldCheck },
  { id: "account", label: "Account", icon: Mail },
];

export function SettingsClient({
  email,
  joined,
  profile,
  memory,
}: {
  email: string;
  joined: string | null;
  profile: UserProfile | null;
  memory: UserMemory | null;
}) {
  const [tab, setTab] = useState<Tab>("profile");

  // Let the onboarding tour drive the active tab when it reaches a /settings step.
  useEffect(() => {
    function onSetTab(e: Event) {
      const next = (e as CustomEvent<string>).detail;
      if (TABS.some((t) => t.id === next)) setTab(next as Tab);
    }
    window.addEventListener("atlas:set-settings-tab", onSetTab);
    return () => window.removeEventListener("atlas:set-settings-tab", onSetTab);
  }, []);

  return (
    <div className="mt-8">
      <nav
        aria-label="Settings sections"
        className={cn(
          "flex w-fit max-w-full gap-1 overflow-x-auto rounded-full p-1",
          GLASS_DARK
        )}
      >
        {TABS.map((t) => {
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              aria-current={active ? "page" : undefined}
              className={cn(
                "relative isolate flex shrink-0 items-center justify-center gap-2 overflow-hidden rounded-full px-4 py-2 text-sm font-medium outline-none transition focus-visible:ring-2 focus-visible:ring-white/40",
                active
                  ? "text-[#0d0d0d]"
                  : "text-white/60 hover:bg-white/[0.08] hover:text-white"
              )}
            >
              {active && (
                <motion.span
                  layoutId="settings-tab"
                  className="absolute inset-0 z-0 rounded-full bg-white"
                  transition={{ type: "spring", stiffness: 380, damping: 32 }}
                />
              )}
              <t.icon className="relative z-10 size-4" />
              <span className="relative z-10 whitespace-nowrap">{t.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="mt-2">
        {tab === "profile" && <ProfileForm email={email} profile={profile} />}
        {tab === "memory" && (
          <MemoryPanel
            memory={memory}
            profile={profile}
            onEditProfile={() => setTab("profile")}
          />
        )}
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
      setSaved(saved);
      setValues((v) => ({ ...v, [key]: saved[key] }));
      setStatus("idle");
      toast.error("Couldn't save that change.");
    }
  }

  return (
    <section data-tour="settings-profile" className="py-8">
      <div className={cn(CARD, "p-6 sm:p-8")}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-white/55">
            Profile
          </p>
          <h2 className="mt-2 text-3xl font-normal tracking-[-0.01em] text-white">
            Your study <span className="font-instrument italic">profile</span>
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-white/65">
            Atlas uses these details to personalize your notes. Changes save as
            you go.
          </p>
        </div>
        <SaveStatus status={status} />
      </div>

      <div className="mt-7 space-y-4">
        {PROFILE_FIELDS.map((f) => (
          <div
            key={f.key}
            className="grid gap-2 sm:grid-cols-[12rem_minmax(0,1fr)] sm:items-center"
          >
            <label
              htmlFor={f.key}
              className="text-[11px] font-medium uppercase tracking-[0.18em] text-white/55"
            >
              {f.label}
            </label>
            <input
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
              className={FIELD}
            />
          </div>
        ))}
        <div className="grid gap-2 sm:grid-cols-[12rem_minmax(0,1fr)] sm:items-center">
          <label
            htmlFor="email-readonly"
            className="text-[11px] font-medium uppercase tracking-[0.18em] text-white/55"
          >
            Email
          </label>
          <input
            id="email-readonly"
            value={email}
            disabled
            className={cn(FIELD, "bg-white/[0.04] text-white/50")}
          />
        </div>
      </div>
      </div>
    </section>
  );
}

function SaveStatus({ status }: { status: "idle" | "saving" | "saved" }) {
  if (status === "idle") return null;
  return (
    <span className="inline-flex h-9 items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3 text-xs font-medium text-white/65">
      {status === "saving" ? (
        <>
          <Loader2 className="size-3.5 animate-spin" /> Saving...
        </>
      ) : (
        <>
          <Check className="size-3.5 text-emerald-500" /> Saved
        </>
      )}
    </span>
  );
}

function PrivacyPanel() {
  return (
    <section className="space-y-6 py-8">
      <div className={cn(CARD, "relative isolate p-6 sm:p-8")}>
        <span
          aria-hidden
          className="processing-glow"
          style={{ "--ai-ring-flow": "11s" } as CSSProperties}
        />
        <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/[0.06] px-3.5 py-1.5 text-[11px] font-medium uppercase tracking-[0.18em] text-white/60">
          <Lock className="size-3.5" />
          Atlas Enclave
        </span>
        <h2 className="mt-5 max-w-2xl text-3xl font-normal tracking-[-0.01em] text-white">
          Your notes are private and only visible to you.
        </h2>
        <p className="mt-3 max-w-2xl text-pretty text-sm leading-6 text-white/65">
          Every recording and note is scoped to your account alone. Other
          students and the public cannot see them.
        </p>
      </div>

      <div className={cn(CARD, "space-y-6 p-6 sm:p-7")}>
        <InfoRow
          icon={Trash2}
          title="Audio is deleted after processing"
          body="Your lecture audio is sent to our notes engine, transcribed, and then deleted. We keep the notes, not the recording on our processor."
        />
        <InfoRow
          icon={ShieldCheck}
          title="Never sold or shared"
          body="Your data is never sold, shared, or used to train third-party models. It exists to serve you and only you."
        />
      </div>
    </section>
  );
}

function InfoRow({
  icon: Icon,
  title,
  body,
}: {
  icon: ComponentType<{ className?: string }>;
  title: string;
  body: string;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-[3rem_minmax(0,1fr)]">
      <span className="grid size-10 place-items-center rounded-full border border-white/20 bg-white/10 text-white">
        <Icon className="size-4" />
      </span>
      <div>
        <h3 className="text-sm font-medium tracking-[-0.01em] text-white">
          {title}
        </h3>
        <p className="mt-1.5 max-w-2xl text-pretty text-sm leading-6 text-white/65">
          {body}
        </p>
      </div>
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
    <section className="space-y-6 py-8">
      <PasskeysPanel />

      <div className={cn(CARD, "space-y-5 p-6 sm:p-7")}>
        <div className="grid gap-2 sm:grid-cols-[12rem_minmax(0,1fr)] sm:items-center">
          <dt className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.18em] text-white/55">
            <Mail className="size-3.5" /> Email
          </dt>
          <dd className="min-w-0 truncate text-sm font-medium text-white">
            {email}
          </dd>
        </div>
        <div className="grid gap-2 sm:grid-cols-[12rem_minmax(0,1fr)] sm:items-center">
          <dt className="text-[11px] font-medium uppercase tracking-[0.18em] text-white/55">
            Member since
          </dt>
          <dd className="text-sm font-medium text-white">
            {joined ?? "Not set"}
          </dd>
        </div>
      </div>

      <div className={cn(CARD, "flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between sm:p-7")}>
        <div>
          <h3 className="text-lg font-normal tracking-[-0.01em] text-white">
            Sign out
          </h3>
          <p className="mt-1 text-sm text-white/60">
            End your session on this device.
          </p>
        </div>
        <form action="/auth/signout" method="post">
          <button className={cn(GLASS_DARK_PILL, "inline-flex h-10 items-center justify-center gap-2 rounded-full px-4 text-xs font-medium")}>
            <LogOut className="size-4" />
            Sign out
          </button>
        </form>
      </div>
    </section>
  );
}
