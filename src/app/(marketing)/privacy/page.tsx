import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Check, Lock, X } from "lucide-react";

export const metadata: Metadata = {
  title: "Privacy",
  description:
    "Your thoughts are yours. Atlas was built private from the very first line.",
};

const COLLECT = [
  {
    label: "Your account",
    body: "The email you sign in with, and the profile details you choose to share: your name, school, and program. Nothing you don’t hand us yourself.",
  },
  {
    label: "Your notes",
    body: "The notes, summaries, and transcripts Atlas writes for you. We store them so your library is there every time you come back.",
  },
  {
    label: "Your audio, briefly",
    body: "The recording you make is used to write your notes, then removed from the processor. We keep the notes, not the audio.",
  },
];

const NEVER = [
  "Sell your data. Not to anyone, not ever.",
  "Use your personal notes to train AI without your explicit consent.",
  "Share your recordings or notes with advertisers or data brokers.",
  "Let another student, or the public, see what’s yours.",
];

const CONTROLS = [
  {
    label: "Delete anything",
    body: "Remove a single note or your whole account whenever you want. Deleting a note deletes its audio with it.",
  },
  {
    label: "Take it with you",
    body: "Export any note as a polished PDF or Word document in a couple of clicks. Your notes belong to you.",
  },
  {
    label: "Stay in control",
    body: "Update or clear your profile, and revoke microphone access from your browser at any time.",
  },
];

export default function PrivacyPhilosophyPage() {
  return (
    <main className="relative overflow-hidden pb-28">
      <div className="relative mx-auto max-w-[1080px] px-4 pt-28 sm:px-6 lg:pt-32">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition hover:-translate-x-0.5 hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Back
        </Link>

        {/* Opening statement — left-weighted asymmetric split, copy held to the
            left with the enclave panel balancing the right. */}
        <section className="mt-12 grid grid-cols-1 items-center gap-12 lg:mt-14 lg:grid-cols-12 lg:gap-10">
          <div className="lg:col-span-7">
            <span className="inline-flex items-center gap-2 rounded-[4px] border border-primary/30 bg-primary/10 px-4 py-1.5 font-mono text-[0.7rem] uppercase tracking-[0.2em] text-primary">
              <Lock className="size-3.5" />
              Atlas Enclave
            </span>
            <h1 className="mt-8 max-w-[12ch] text-balance text-6xl font-extrabold leading-[0.92] sm:text-7xl">
              Your thoughts are{" "}
              <span className="font-semibold tracking-tight text-primary">
                yours.
              </span>
            </h1>
            <p className="mt-6 max-w-[46ch] text-pretty text-lg leading-relaxed text-muted-foreground">
              We built Atlas that way from the start. Your lectures, your notes,
              your recordings, private by design, not an afterthought.
            </p>
          </div>

          <div className="lg:col-span-5">
            <EnclavePreview />
          </div>
        </section>

        {/* Body — held to a left-weighted column for the off-center rhythm. */}
        <div className="max-w-[760px]">
        <Divider />

        {/* What Atlas Enclave means */}
        <section>
          <p className="font-mono text-xs uppercase tracking-[0.22em] text-primary">
            Atlas Enclave
          </p>
          <h2 className="mt-4 text-balance text-4xl font-extrabold sm:text-5xl">
            A private space that belongs to you.
          </h2>
          <div className="mt-5 space-y-4 text-pretty text-lg leading-relaxed text-muted-foreground">
            <p>
              Everything you bring to Atlas lives inside Atlas Enclave, our
              system made to protect your account, so
              that no one, not even us, can reach your information.
            </p>
            <p>
              Atlas Enclave is a promise as much as it is a system: we refuse to sell
              your data, and we don’t train AI on your personal notes, period. The work you do here stays here.
            </p>
          </div>
        </section>

        <Divider />

        {/* What we collect */}
        <section>
          <p className="font-mono text-xs uppercase tracking-[0.22em] text-primary">
            What we collect
          </p>
          <h2 className="mt-4 text-balance text-4xl font-extrabold sm:text-5xl">
            Only what it takes to write your notes.
          </h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            {COLLECT.map((c) => (
              <div
                key={c.label}
                className="hover-glow icon-animate rounded-[4px] border bg-card p-5 shadow-[0_10px_28px_rgba(15,23,42,0.05)] transition duration-300 ease-out hover:-translate-y-0.5 hover:border-primary/25 hover:bg-secondary/45"
              >
                <h3 className="font-semibold tracking-tight">{c.label}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground text-pretty">
                  {c.body}
                </p>
              </div>
            ))}
          </div>
        </section>

        <Divider />

        {/* What we never do */}
        <section>
          <p className="font-mono text-xs uppercase tracking-[0.22em] text-primary">
            What we never do
          </p>
          <h2 className="mt-4 text-balance text-4xl font-extrabold sm:text-5xl">
            Some lines we will{" "}
            <span className="font-semibold tracking-tight text-primary">
              never
            </span>{" "}
            cross.
          </h2>
          <ul className="mt-8 space-y-3">
            {NEVER.map((n) => (
              <li
                key={n}
                className="hover-glow icon-animate flex items-start gap-3 rounded-[4px] border border-destructive/20 bg-destructive/[0.04] p-4"
              >
                <span className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-[3px] bg-destructive/15 text-destructive">
                  <X className="size-3.5" />
                </span>
                <span className="text-pretty font-medium leading-relaxed">
                  {n}
                </span>
              </li>
            ))}
          </ul>
        </section>

        <Divider />

        {/* Your controls */}
        <section>
          <p className="font-mono text-xs uppercase tracking-[0.22em] text-primary">
            Your controls
          </p>
          <h2 className="mt-4 text-balance text-4xl font-extrabold sm:text-5xl">
            You’re always in charge.
          </h2>
          <div className="mt-8 space-y-3">
            {CONTROLS.map((c) => (
              <div
                key={c.label}
                className="hover-glow icon-animate flex items-start gap-4 rounded-[4px] border bg-card p-5 shadow-[0_10px_28px_rgba(15,23,42,0.05)] transition duration-300 ease-out hover:-translate-y-0.5 hover:border-primary/25 hover:bg-secondary/45"
              >
                <span className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-[3px] bg-primary/15 text-primary">
                  <Check className="size-4" />
                </span>
                <div>
                  <h3 className="font-semibold tracking-tight">{c.label}</h3>
                  <p className="mt-1 text-pretty text-sm leading-relaxed text-muted-foreground">
                    {c.body}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <Divider />

        {/* Closing sign-off */}
        <section className="relative overflow-hidden rounded-[4px] border bg-card p-8 shadow-[0_16px_44px_rgba(15,23,42,0.08)] sm:p-12">
          <div className="relative">
            <span className="grid size-10 place-items-center rounded-[4px] border border-primary/25 bg-primary/10 text-primary">
              <Lock className="size-5" />
            </span>
            <h2 className="mt-4 text-balance text-2xl font-semibold tracking-tight sm:text-3xl">
              A note from the team
            </h2>
            <p className="mt-4 max-w-2xl text-pretty text-lg leading-relaxed text-muted-foreground">
              We started Atlas because we wanted to be present in class without
              losing a word. Privacy isn’t a feature we bolted on. It’s the
              reason we trust this tool with our own lectures. We’ll keep it that
              way for you, too.
            </p>
            <p className="mt-6 text-lg font-semibold text-foreground/90">
              The Atlas team
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-4 text-sm">
              <Link
                href="/privacy-policy"
                className="text-primary hover:underline"
              >
                Read the full Privacy Policy →
              </Link>
              <Link href="/terms" className="text-muted-foreground hover:text-foreground">
                Terms of Use
              </Link>
            </div>
          </div>
        </section>
        </div>
      </div>
    </main>
  );
}

function EnclavePreview() {
  const ROWS = [
    { label: "Your notes", value: "Stored for you" },
    { label: "Your audio", value: "Removed after processing" },
    { label: "AI training", value: "Never, without consent" },
    { label: "Selling data", value: "Never" },
  ];
  return (
    <div className="relative mx-auto w-full max-w-[420px] lg:mx-0">
      <div className="overflow-hidden rounded-[6px] border border-border bg-card shadow-[0_1px_2px_rgba(0,0,0,0.06),0_18px_50px_-24px_rgba(0,0,0,0.25)]">
        <div className="flex items-center gap-2.5 border-b border-border px-5 py-4">
          <span className="grid size-8 place-items-center rounded-[4px] border border-primary/25 bg-primary/10 text-primary">
            <Lock className="size-4" />
          </span>
          <div className="min-w-0">
            <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
              Atlas Enclave
            </p>
            <p className="text-sm font-semibold tracking-tight">
              Private by design
            </p>
          </div>
        </div>
        <ul className="divide-y divide-border">
          {ROWS.map((r) => (
            <li
              key={r.label}
              className="flex items-center justify-between gap-3 px-5 py-3.5"
            >
              <span className="text-sm text-muted-foreground">{r.label}</span>
              <span className="inline-flex items-center gap-1.5 text-sm font-medium tracking-tight">
                <Check className="size-3.5 text-primary" />
                {r.value}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function Divider() {
  return (
    <div className="my-16 flex items-center gap-4" aria-hidden>
      <span className="h-px flex-1 bg-gradient-to-r from-transparent to-border" />
      <span className="size-1.5 rounded-full bg-primary/50" />
      <span className="h-px flex-1 bg-gradient-to-l from-transparent to-border" />
    </div>
  );
}
