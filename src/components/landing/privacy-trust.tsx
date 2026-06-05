import Link from "next/link";
import { Lock, ShieldCheck, Trash2, EyeOff } from "lucide-react";
import { Reveal } from "@/components/landing/reveal";
import { AiGlow } from "@/components/ui/ai-glow";

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

/** Landing privacy trust block tied to Atlas Enclave branding. */
export function PrivacyTrust() {
  return (
    <section className="mx-auto w-full max-w-[1200px] px-4 sm:px-6">
      <Reveal className="ai-ring relative isolate overflow-hidden rounded-[4px] border border-border bg-card p-8 sm:p-12">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10 opacity-35 [mask-image:radial-gradient(70%_70%_at_22%_18%,black,transparent_78%)] animate-breathe"
        >
          <AiGlow density="lean" blur={72} />
        </div>
        <div className="max-w-3xl">
          <span className="inline-flex items-center gap-2 rounded-[4px] border border-border px-2.5 py-1 font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
            <Lock className="size-3.5" />
            Atlas Enclave
          </span>
          <h2 className="mt-5 text-balance text-3xl font-bold leading-[1.03] tracking-[-0.03em] sm:text-5xl lg:text-6xl">
            Your lectures are private.{" "}
            <span className="text-primary">Always.</span>
          </h2>
          <p className="mt-3 max-w-[64ch] text-pretty text-muted-foreground">
            Everything you record lives inside the Atlas Enclave, a private,
            encrypted space that belongs to you and no one else.
          </p>
        </div>

        <div className="mt-10 grid overflow-hidden rounded-[4px] border border-border sm:grid-cols-3">
          {POINTS.map((p) => (
            <div
              key={p.title}
              className="border-t border-border bg-background p-6 first:border-t-0 sm:border-l sm:border-t-0 sm:first:border-l-0"
            >
              <span className="grid size-10 place-items-center rounded-[4px] border border-border bg-card text-foreground">
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
      </Reveal>
    </section>
  );
}
