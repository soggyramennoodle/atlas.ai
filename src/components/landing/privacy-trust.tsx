import Link from "next/link";
import { Lock, ShieldCheck, Trash2, EyeOff } from "lucide-react";

const POINTS = [
  {
    icon: Trash2,
    title: "Audio, then gone",
    body: "Your recording is transcribed into notes and then deleted from our processor. We keep your notes, not your audio.",
  },
  {
    icon: ShieldCheck,
    title: "Scoped to you",
    body: "Every note is tied to your account alone. No other student, and no part of the public, can ever see them.",
  },
  {
    icon: EyeOff,
    title: "Never sold or shared",
    body: "Your lectures and notes are never sold, shared, or used to train third-party models. Full stop.",
  },
];

/** Landing privacy trust block (§11) tied to Atlas Enclave branding. */
export function PrivacyTrust() {
  return (
    <section className="render-section relative mx-auto mt-24 w-full max-w-6xl px-4">
      <div className="relative overflow-hidden rounded-[2.5rem] border bg-card/50 p-8 ring-luxe sm:p-12">
        <div className="pointer-events-none absolute inset-0 bg-aurora opacity-50" />
        <div className="relative">
          <div className="max-w-2xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 font-mono text-[0.7rem] uppercase tracking-[0.18em] text-primary">
              <Lock className="size-3.5" />
              Atlas Enclave
            </span>
            <h2 className="mt-5 font-display text-balance text-4xl font-extrabold leading-[0.92] tracking-[-0.03em] sm:text-6xl">
              Your lectures are private.{" "}
              <span className="text-gradient-brand">Always.</span>
            </h2>
            <p className="mt-3 text-pretty text-muted-foreground">
              Everything you record lives inside the Atlas Enclave, a private,
              encrypted space that belongs to you and no one else.
            </p>
          </div>

          {/* Divided point row — a single hairline-separated band, not a grid
              of cards (keeps this section's layout distinct from the bento). */}
          <div className="mt-10 grid gap-px overflow-hidden rounded-2xl border bg-border sm:grid-cols-3">
            {POINTS.map((p) => (
              <div key={p.title} className="bg-card/60 p-6">
                <span className="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary">
                  <p.icon className="size-5" />
                </span>
                <h3 className="mt-3 font-semibold tracking-tight">{p.title}</h3>
                <p className="mt-1.5 text-pretty text-sm leading-relaxed text-muted-foreground">
                  {p.body}
                </p>
              </div>
            ))}
          </div>

          <p className="mt-7 text-sm text-muted-foreground">
            Read about{" "}
            <Link href="/privacy" className="text-primary hover:underline">
              our approach to privacy
            </Link>
            , our{" "}
            <Link href="/privacy-policy" className="text-primary hover:underline">
              Privacy Policy
            </Link>{" "}
            and{" "}
            <Link href="/terms" className="text-primary hover:underline">
              Terms of Use
            </Link>
            .
          </p>
        </div>
      </div>
    </section>
  );
}
