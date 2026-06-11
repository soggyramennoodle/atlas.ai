import Link from "next/link";
import { Lock, ShieldCheck, Trash2, EyeOff } from "lucide-react";
import { Reveal } from "@/components/landing/reveal";

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
    <section className="overflow-hidden bg-[#000] px-6 py-20">
      <Reveal
        className="relative mx-auto w-full max-w-[1200px] overflow-hidden rounded-[24px] border border-white/[0.12] p-8 sm:p-12"
        style={{
          background: "rgba(255,255,255,0.06)",
          backdropFilter: "blur(24px)",
          WebkitBackdropFilter: "blur(24px)",
        }}
      >
        <div className="max-w-3xl">
          <span className="font-heading inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3.5 py-1.5 text-[11px] font-medium tracking-[1.5px] text-white/70">
            <Lock className="size-3.5" />
            ATLAS ENCLAVE
          </span>
          <h2 className="mt-6 text-balance text-white">
            <span
              className="font-heading font-normal leading-[1.02] tracking-[-1.02px]"
              style={{ fontSize: "clamp(2.25rem, 5vw, 60px)" }}
            >
              Your lectures are private.{" "}
            </span>
            <span
              className="font-instrument italic font-normal leading-[1.02] tracking-[-1.02px]"
              style={{ fontSize: "clamp(2.25rem, 5vw, 60px)" }}
            >
              Always.
            </span>
          </h2>
          <p className="font-heading mt-4 max-w-[64ch] text-pretty text-[15px] leading-[1.6] text-white/60">
            Everything you record lives inside the Atlas Enclave, a private,
            encrypted space that belongs to you and no one else.
          </p>
        </div>

        <div className="mt-10 grid gap-4 sm:grid-cols-3">
          {POINTS.map((p) => (
            <div
              key={p.title}
              className="rounded-[20px] border border-white/10 bg-black/30 p-6"
            >
              <span className="grid size-10 place-items-center rounded-[12px] border border-white/15 bg-white/10 text-white">
                <p.icon className="size-5" strokeWidth={1.8} />
              </span>
              <h3 className="font-heading mt-4 font-medium tracking-tight text-white">
                {p.title}
              </h3>
              <p className="font-heading mt-1.5 text-pretty text-[13px] leading-[1.6] text-white/65">
                {p.body}
              </p>
            </div>
          ))}
        </div>

        <p className="font-heading mt-8 text-[13px] text-white/60">
          Read about{" "}
          <Link href="/privacy" className="text-white underline hover:text-white/80">
            our approach to privacy
          </Link>
          , our{" "}
          <Link
            href="/privacy-policy"
            className="text-white underline hover:text-white/80"
          >
            Privacy Policy
          </Link>{" "}
          and{" "}
          <Link href="/terms" className="text-white underline hover:text-white/80">
            Terms of Use
          </Link>
          .
        </p>
      </Reveal>
    </section>
  );
}
