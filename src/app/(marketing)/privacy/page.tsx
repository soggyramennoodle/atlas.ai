import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Check, X } from "lucide-react";

export const metadata: Metadata = {
  title: "Privacy",
  description:
    "Your thoughts are yours. Atlas was built private from the very first line.",
};

const COLLECT = [
  {
    label: "Your account",
    body: "The email you sign in with, and the profile details you choose to share — your name, school, and program. Nothing you don’t hand us yourself.",
  },
  {
    label: "Your notes",
    body: "The notes, summaries, and transcripts Atlas writes for you. We store them so your library is there every time you come back.",
  },
  {
    label: "Your audio — briefly",
    body: "The recording you make is used to write your notes, then removed from the processor. We keep the notes, not the audio.",
  },
];

const NEVER = [
  "Sell your data. Not to anyone, not ever.",
  "Use your personal notes to train AI without your explicit consent.",
  "Share your recordings or notes with advertisers or data brokers.",
  "Let another student — or the public — see what’s yours.",
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
      {/* Soft editorial backdrop */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[40rem] bg-aurora opacity-60" />
      <div className="pointer-events-none absolute inset-0 bg-grid opacity-20 [mask-image:radial-gradient(60%_40%_at_50%_0%,black,transparent)]" />

      <div className="relative mx-auto max-w-3xl px-4 pt-16 lg:pt-24">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition hover:-translate-x-0.5 hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Back
        </Link>

        {/* Opening statement */}
        <section className="mt-14 text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 font-mono text-[0.7rem] uppercase tracking-[0.2em] text-primary">
            <span className="text-sm leading-none">🔒</span>
            Atlas Enclave
          </span>
          <h1 className="mx-auto mt-8 max-w-2xl text-balance font-display text-6xl font-extrabold leading-[0.92] tracking-[-0.03em] sm:text-7xl">
            Your thoughts are{" "}
            <span className="font-display font-semibold tracking-tight text-primary">
              yours.
            </span>
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-pretty text-lg leading-relaxed text-muted-foreground">
            We built Atlas that way from the start. Your lectures, your notes,
            your recordings, private by design, not an afterthought.
          </p>
        </section>

        <Divider />

        {/* What Atlas Enclave means */}
        <section>
          <p className="font-mono text-xs uppercase tracking-[0.22em] text-primary">
            Atlas Enclave
          </p>
          <h2 className="mt-4 font-display text-balance text-4xl font-extrabold tracking-[-0.02em] sm:text-5xl">
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
          <h2 className="mt-4 font-display text-balance text-4xl font-extrabold tracking-[-0.02em] sm:text-5xl">
            Only what it takes to write your notes.
          </h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            {COLLECT.map((c) => (
              <div
                key={c.label}
                className="rounded-2xl border bg-card/60 p-5 ring-luxe"
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
          <h2 className="mt-4 font-display text-balance text-4xl font-extrabold tracking-[-0.02em] sm:text-5xl">
            Some lines we will{" "}
            <span className="font-display font-semibold tracking-tight text-primary">
              never
            </span>{" "}
            cross.
          </h2>
          <ul className="mt-8 space-y-3">
            {NEVER.map((n) => (
              <li
                key={n}
                className="flex items-start gap-3 rounded-2xl border border-destructive/20 bg-destructive/[0.04] p-4"
              >
                <span className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full bg-destructive/15 text-destructive">
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
          <h2 className="mt-4 font-display text-balance text-4xl font-extrabold tracking-[-0.02em] sm:text-5xl">
            You’re always in charge.
          </h2>
          <div className="mt-8 space-y-3">
            {CONTROLS.map((c) => (
              <div
                key={c.label}
                className="flex items-start gap-4 rounded-2xl border bg-card/50 p-5"
              >
                <span className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-full bg-primary/15 text-primary">
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
        <section className="relative overflow-hidden rounded-[2rem] border bg-card/50 p-8 ring-luxe sm:p-12">
          <div className="pointer-events-none absolute inset-0 bg-aurora opacity-50" />
          <div className="relative">
            <span className="text-3xl">🔒</span>
            <h2 className="mt-4 text-balance text-2xl font-semibold tracking-tight sm:text-3xl">
              A note from the team
            </h2>
            <p className="mt-4 max-w-2xl text-pretty text-lg leading-relaxed text-muted-foreground">
              We started Atlas because we wanted to be present in class without
              losing a word. Privacy isn’t a feature we bolted on — it’s the
              reason we trust this tool with our own lectures. We’ll keep it that
              way for you, too.
            </p>
            <p className="mt-6 font-display text-lg text-foreground/90">
              — The Atlas team
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
    </main>
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
