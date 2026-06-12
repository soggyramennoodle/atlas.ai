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
  PILL_INPUT,
  PILL_SECONDARY_INLINE,
} from "@/components/app/pills";
import { cn } from "@/lib/utils";
import type { UserMemory, UserProfile } from "@/lib/types";
import { PasskeysPanel } from "@/components/settings/passkeys-panel";
import { MemoryPanel } from "@/components/settings/memory-panel";

type Tab = "profile" | "memory" | "privacy" | "account";

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
        className="flex gap-1 overflow-x-auto border-b border-black/[0.08] pb-4"
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
                "relative isolate flex shrink-0 items-center justify-center gap-2 overflow-hidden rounded-full border px-4 py-2 text-sm font-medium outline-none transition focus-visible:ring-2 focus-visible:ring-black/25",
                active
                  ? "border-[#0d0d0d] bg-[#0d0d0d] text-white"
                  : "border-black/[0.10] bg-white/70 text-[#0d0d0d]/58 hover:border-black/[0.18] hover:text-[#0d0d0d]"
              )}
            >
              {active && (
                <motion.span
                  layoutId="settings-tab"
                  className="absolute inset-0 z-0 rounded-full bg-[#0d0d0d]"
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
    <section data-tour="settings-profile" className="border-b border-black/[0.08] py-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-[#0d0d0d]/45">
            Profile
          </p>
          <h2 className="mt-2 text-3xl font-normal tracking-[-0.01em] text-[#0d0d0d]">
            Your study profile
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#0d0d0d]/60">
            Atlas uses these details to personalize your notes. Changes save as
            you go.
          </p>
        </div>
        <SaveStatus status={status} />
      </div>

      <div className="mt-7 border-y border-black/[0.08]">
        {PROFILE_FIELDS.map((f) => (
          <div
            key={f.key}
            className="grid gap-3 border-b border-black/[0.08] py-4 last:border-b-0 sm:grid-cols-[12rem_minmax(0,1fr)] sm:items-center"
          >
            <label
              htmlFor={f.key}
              className="text-[11px] font-medium uppercase tracking-[0.18em] text-[#0d0d0d]/45"
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
              className={PILL_INPUT}
            />
          </div>
        ))}
        <div className="grid gap-3 py-4 sm:grid-cols-[12rem_minmax(0,1fr)] sm:items-center">
          <label
            htmlFor="email-readonly"
            className="text-[11px] font-medium uppercase tracking-[0.18em] text-[#0d0d0d]/45"
          >
            Email
          </label>
          <input
            id="email-readonly"
            value={email}
            disabled
            className={`${PILL_INPUT} bg-black/[0.03] text-[#0d0d0d]/55`}
          />
        </div>
      </div>
    </section>
  );
}

function SaveStatus({ status }: { status: "idle" | "saving" | "saved" }) {
  if (status === "idle") return null;
  return (
    <span className="inline-flex h-9 items-center gap-1.5 rounded-full border border-black/[0.10] bg-white px-3 text-xs font-medium text-[#0d0d0d]/60">
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
    <section className="space-y-8 border-b border-black/[0.08] py-8">
      <div className="relative isolate rounded-3xl border border-black/[0.08] bg-white p-6 shadow-[0_18px_55px_-42px_rgba(13,13,13,0.45)] sm:p-8">
        <span
          aria-hidden
          className="processing-glow"
          style={{ "--ai-ring-flow": "11s" } as CSSProperties}
        />
        <span className="inline-flex items-center gap-2 rounded-full border border-black/[0.10] bg-black/[0.03] px-3.5 py-1.5 text-[11px] font-medium uppercase tracking-[0.18em] text-[#0d0d0d]/55">
          <Lock className="size-3.5" />
          Atlas Enclave
        </span>
        <h2 className="mt-5 max-w-2xl text-3xl font-normal tracking-[-0.01em] text-[#0d0d0d]">
          Your notes are private and only visible to you.
        </h2>
        <p className="mt-3 max-w-2xl text-pretty text-sm leading-6 text-[#0d0d0d]/60">
          Every recording and note is scoped to your account alone. Other
          students and the public cannot see them.
        </p>
      </div>

      <div className="border-y border-black/[0.08]">
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
    <div className="grid gap-4 border-b border-black/[0.08] py-5 last:border-b-0 sm:grid-cols-[3rem_minmax(0,1fr)]">
      <span className="grid size-10 place-items-center rounded-full border border-black/[0.10] bg-white text-[#0d0d0d]">
        <Icon className="size-4" />
      </span>
      <div>
        <h3 className="text-sm font-medium tracking-[-0.01em] text-[#0d0d0d]">
          {title}
        </h3>
        <p className="mt-1.5 max-w-2xl text-pretty text-sm leading-6 text-[#0d0d0d]/60">
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
    <section className="space-y-8 py-8">
      <PasskeysPanel />

      <div className="border-y border-black/[0.08]">
        <div className="grid gap-3 border-b border-black/[0.08] py-5 sm:grid-cols-[12rem_minmax(0,1fr)]">
          <dt className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.18em] text-[#0d0d0d]/45">
            <Mail className="size-3.5" /> Email
          </dt>
          <dd className="min-w-0 truncate text-sm font-medium text-[#0d0d0d]">
            {email}
          </dd>
        </div>
        <div className="grid gap-3 py-5 sm:grid-cols-[12rem_minmax(0,1fr)]">
          <dt className="text-[11px] font-medium uppercase tracking-[0.18em] text-[#0d0d0d]/45">
            Member since
          </dt>
          <dd className="text-sm font-medium text-[#0d0d0d]">
            {joined ?? "Not set"}
          </dd>
        </div>
      </div>

      <div className="flex flex-col gap-4 border-b border-black/[0.08] pb-8 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-lg font-normal tracking-[-0.01em] text-[#0d0d0d]">
            Sign out
          </h3>
          <p className="mt-1 text-sm text-[#0d0d0d]/55">
            End your session on this device.
          </p>
        </div>
        <form action="/auth/signout" method="post">
          <button className={`${PILL_SECONDARY_INLINE} h-10 px-4 text-xs`}>
            <LogOut className="size-4" />
            Sign out
          </button>
        </form>
      </div>
    </section>
  );
}
