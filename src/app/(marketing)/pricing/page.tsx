import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowUpRight,
  Check,
  CircleDollarSign,
  Cloud,
  FileDown,
  GraduationCap,
  LockKeyhole,
  MessageCircleQuestion,
  Mic,
  MountainSnow,
  NotebookPen,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import { Reveal } from "@/components/landing/reveal";
import { AtlasMark } from "@/components/logo";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Pricing",
  description:
    "Atlas is free while it's in beta. Record class, get thorough notes, and ask Atlas anything — no card required. Pro and Max are on the way.",
  openGraph: {
    title: "Atlas Pricing",
    description: "Free while Atlas is in beta. No card required.",
  },
};

type Plan = {
  name: string;
  altitude: string;
  badge: string;
  price: string;
  priceNote: string;
  description: string;
  icon: LucideIcon;
  features: string[];
  cta?: string;
  href?: string;
  state: "live" | "soon";
};

const INCLUDED = [
  {
    icon: Mic,
    title: "Record or upload",
    body: "Hit record in your browser when class starts, or drop in audio you already have. Atlas takes it from there.",
  },
  {
    icon: NotebookPen,
    title: "Notes that are actually thorough",
    body: "A clean summary up top, fully detailed sections, and the key concepts and definitions — written out every time, not just bullet points.",
  },
  {
    icon: MessageCircleQuestion,
    title: "Ask Atlas anything",
    body: "Ask about any lecture and get answers pulled straight from your own notes — quiz yourself, fill gaps, or just catch up.",
  },
  {
    icon: FileDown,
    title: "Edit and export",
    body: "Tweak any note, then export it to PDF or Word. Your notes are yours to keep, share, or print.",
  },
  {
    icon: Sparkles,
    title: "Learns your courses",
    body: "Atlas picks up your subjects and the way you study, so the notes it writes get more useful the more you use it.",
  },
  {
    icon: LockKeyhole,
    title: "Atlas Enclave",
    body: "Your lecture recordings are deleted once your notes are written. Your notes stay secure, so that only you can see them. Never sold, and never used to train our models.",
  },
];

const QUESTIONS = [
  {
    q: "Do I need a credit card to start?",
    a: "No. You can sign up and record your first lecture without entering any payment info. Atlas doesn't ask for a card during the beta.",
  },
  {
    q: "Is it actually free, or just a trial?",
    a: "Atlas really is free, with all its features. We'll give you plenty of notice before Pro and Max plans come out.",
  },
  {
    q: "What happens to my lecture audio?",
    a: "It's transcribed into notes and then deleted from our processor. We keep your notes, not your recordings — and nothing is ever sold or used to train third-party models. That's Atlas Enclave.",
  },
  {
    q: "Will Free still work during exams?",
    a: "Yes, Atlas Free will continue to run through finals, subject to longer queues. Our upcoming Pro and Max plans will get priority access to our servers.",
  },
  {
    q: "Can my club, course, or school use Atlas?",
    a: "Let's talk! Email founder@atlasai.ca and we can discuss details for a pilot program, answer your questions on privacy, and find out what actually fits your group.",
  },
  {
    q: "What changes when Pro and Max launch?",
    a: "The core features of Atlas will always remain free, subject to usage limits. Pro and Max plans provide higher usage limits, priority access at peak hours, and advanced study tools with an AI personalized for you.",
  },
];

const FOOTNOTES: { id: string; n: number; body: string }[] = [
  {
    id: "verify",
    n: 1,
    body: "Payment information may be used to verify your identity and prevent abuse, so we can keep the free tier sustainable for everyone. You will not be charged while Atlas is in beta.",
  },
];

/** Superscript marker that links down to the matching footnote and back. */
function FootnoteRef({ id }: { id: string }) {
  const fn = FOOTNOTES.find((f) => f.id === id);
  if (!fn) return null;
  return (
    <sup
      id={`fnref-${id}`}
      className="font-heading ml-0.5 align-super text-[0.7em] font-medium"
      style={{ lineHeight: 0 }}
    >
      <a
        href={`#fn-${id}`}
        aria-label={`Footnote ${fn.n}`}
        className="text-current no-underline transition-opacity hover:opacity-100"
        style={{ opacity: 0.7 }}
      >
        {fn.n}
      </a>
    </sup>
  );
}

export default async function PricingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const primaryHref = user ? "/upload" : "/signup";
  const primaryLabel = user ? "Record a lecture" : "Start for free";

  const plans: Plan[] = [
    {
      name: "Atlas Free",
      altitude: "Available for everyone",
      badge: "Live now",
      price: "$0",
      priceNote: "while in beta · no card",
      description:
        "Everything Atlas does today. Record class, get real notes back, and keep them — free while we're in beta.",
      icon: GraduationCap,
      features: [
        "Record in your browser, or upload audio you already have",
        "Thorough notes every time — summary, detailed sections, key concepts",
        "Ask Atlas about any lecture and get answers from your notes",
        "Edit, export to PDF or Word",
      ],
      cta: primaryLabel,
      href: primaryHref,
      state: "live",
    },
    {
      name: "Atlas Pro",
      altitude: "For the full experience",
      badge: "Coming soon",
      price: "Soon",
      priceNote: "for a full course load",
      description:
        "For students who use Atlas all semester, and need more room to work.",
      icon: Cloud,
      features: [
        "Higher recording and upload limits",
        "Priority processing during exam crunch",
        "Deeper course memory and study tools",
        "Earliest access to new features",
      ],
      state: "soon",
    },
    {
      name: "Atlas Max",
      altitude: "For those who want even more",
      badge: "Coming soon",
      price: "Soon",
      priceNote: "even higher usage limits for the dedicated",
      description:
        "Experience Atlas with all its features, built for the heaviest workloads.",
      icon: MountainSnow,
      features: [
        "Unlimited recordings and notes",
        "Top priority, even at finals",
        "Advanced study tools as they ship",
        "Everything in Pro, included",
      ],
      state: "soon",
    },
  ];

  return (
    <main className="font-heading overflow-x-clip bg-[#fafafa]">
      {/* Hero */}
      <section className="px-4 pb-16 pt-28 sm:px-6 sm:pt-32 lg:pb-20">
        <div className="mx-auto grid w-full max-w-[1200px] items-center gap-10 lg:grid-cols-12">
          <div className="lg:col-span-6">
            <span className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-black/[0.04] px-3.5 py-1.5 text-[11px] font-medium tracking-[1.5px] text-black/60">
              <CircleDollarSign className="size-3.5" />
              PRICING
            </span>
            <h1 className="mt-6 text-balance text-[#0d0d0d]">
              <span
                className="font-heading font-normal leading-[0.98] tracking-[-1.02px]"
                style={{ fontSize: "clamp(2.85rem, 7vw, 86px)" }}
              >
                Start with Atlas for{" "}
              </span>
              <span
                className="font-instrument italic font-normal leading-[1.08] tracking-[-1.02px]"
                style={{ fontSize: "clamp(2.85rem, 7vw, 86px)" }}
              >
                free.
              </span>
            </h1>
            <p className="mt-5 max-w-[54ch] text-pretty text-[17px] leading-[1.6] text-black/60">
              Record class, get thorough notes, and ask Atlas anything about
              them — free while we&rsquo;re in beta. Pro and Max plans coming soon.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link
                href={primaryHref}
                className="group inline-flex items-center gap-2 rounded-full bg-[#0d0d0d] py-1.5 pl-6 pr-2 text-[15px] font-medium text-white transition-transform hover:scale-[1.02] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/40 active:scale-[0.98]"
              >
                {primaryLabel}
                <span className="grid size-6 place-items-center rounded-full bg-white">
                  <ArrowUpRight
                    className="size-3.5 text-black transition-transform duration-300 ease-out group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                    strokeWidth={2.5}
                  />
                </span>
              </Link>
            </div>
            <p className="mt-4 text-[13px] text-black/45">
              No card required. Future payments to be processed by our payment
              partner, Stripe.
              <FootnoteRef id="verify" />
            </p>
          </div>

          <div className="lg:col-span-6">
            <div className="relative mx-auto w-full max-w-[520px]">
              <div className="relative min-h-[520px] overflow-hidden rounded-[24px] border border-black/[0.08] bg-white shadow-[0_8px_30px_rgba(0,0,0,0.05)]">
                <Image
                  src="/landing/pricing-study.jpg"
                  alt="A student studying with notes in soft daylight"
                  fill
                  priority
                  sizes="(min-width: 1024px) 520px, 100vw"
                  className="object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-b from-white/20 via-black/5 to-black/55" />
                <div className="absolute inset-x-5 bottom-5 rounded-[20px] border border-white/40 bg-white/70 p-5 shadow-[0_18px_60px_rgba(0,0,0,0.18)] backdrop-blur-[18px] backdrop-saturate-150">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-[12px] font-medium tracking-[1.5px] text-black/50">
                        FREE IN BETA
                      </p>
                      <h2 className="mt-1 text-3xl font-normal tracking-tight text-[#0d0d0d]">
                        Everything included
                      </h2>
                    </div>
                    <span className="grid size-11 place-items-center rounded-[14px] border border-black/10 bg-white text-[#0d0d0d]">
                      <AtlasMark className="size-6" />
                    </span>
                  </div>
                  <div className="mt-5 flex items-end gap-2 border-t border-black/[0.08] pt-5">
                    <span className="text-6xl font-normal leading-none tracking-[-1px] text-[#0d0d0d]">
                      $0
                    </span>
                    <span className="pb-1 text-[13px] leading-[1.4] text-black/55">
                      no card required
                    </span>
                  </div>
                  <div className="mt-5 grid gap-2 sm:grid-cols-2">
                    {["Record lectures", "Ask Atlas", "Export notes", "Private library"].map(
                      (item) => (
                        <span
                          key={item}
                          className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-white px-3 py-2 text-[12px] font-medium text-black/65"
                        >
                          <Check className="size-3.5 text-[#0d0d0d]" />
                          {item}
                        </span>
                      )
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Plans */}
      <section className="px-4 py-16 sm:px-6 lg:py-20">
        <div className="mx-auto w-full max-w-[1200px]">
          <Reveal className="mx-auto max-w-3xl text-center">
            <h2 className="text-balance text-[#0d0d0d]">
              <span
                className="font-heading font-normal leading-[1.02] tracking-[-1.02px]"
                style={{ fontSize: "clamp(2.25rem, 5vw, 60px)" }}
              >
                One plan today. Two more in {" "}
              </span>
              <span
                className="font-instrument italic font-normal leading-[1.02] tracking-[-1.02px]"
                style={{ fontSize: "clamp(2.25rem, 5vw, 60px)" }}
              >
                development.
              </span>
            </h2>
            <p className="mx-auto mt-4 max-w-[56ch] text-pretty text-[15px] leading-[1.6] text-black/60">
              Atlas Free is available today. Pro and Max are still in development — here&rsquo;s where they&rsquo;re headed.
            </p>
          </Reveal>

          <div className="mt-12 grid gap-4 lg:grid-cols-3">
            {plans.map((plan, index) => (
              <Reveal key={plan.name} delay={index * 0.08} className="h-full">
                <PlanCard plan={plan} />
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* What's included */}
      <section className="px-4 py-16 sm:px-6 lg:py-20">
        <div className="mx-auto w-full max-w-[1200px]">
          <Reveal className="max-w-2xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-black/[0.04] px-3.5 py-1.5 text-[11px] font-medium tracking-[1.5px] text-black/60">
              <Sparkles className="size-3.5" />
              WHAT YOU GET FREE
            </span>
            <h2 className="mt-5 text-balance text-[#0d0d0d]">
              <span
                className="font-heading font-normal leading-[1.02] tracking-[-1.02px]"
                style={{ fontSize: "clamp(2rem, 4.5vw, 52px)" }}
              >
                Here&rsquo;s what&rsquo;s really free for{" "}
              </span>
              <span
                className="font-instrument italic font-normal leading-[1.02] tracking-[-1.02px]"
                style={{ fontSize: "clamp(2rem, 4.5vw, 52px)" }}
              >
                now.
              </span>
            </h2>
            <p className="mt-4 max-w-[52ch] text-pretty text-[15px] leading-[1.6] text-black/60">
              Experience the core features of Atlas — capture a lecture, get
              fully written notes, and make them yours.
            </p>
          </Reveal>

          <div className="mt-12 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {INCLUDED.map((item, index) => (
              <Reveal key={item.title} delay={index * 0.05}>
                <div className="h-full rounded-[20px] border border-black/[0.08] bg-white p-6 shadow-[0_8px_30px_rgba(0,0,0,0.05)]">
                  <span className="grid size-10 place-items-center rounded-[12px] border border-black/10 bg-[#fafafa] text-[#0d0d0d]">
                    <item.icon className="size-5" strokeWidth={1.8} />
                  </span>
                  <h3 className="mt-4 font-medium tracking-tight text-[#0d0d0d]">
                    {item.title}
                  </h3>
                  <p className="mt-1.5 text-pretty text-[13px] leading-[1.6] text-black/60">
                    {item.body}
                  </p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* The honest part / promise band */}
      <section className="px-4 py-16 sm:px-6 lg:py-20">
        <Reveal className="mx-auto w-full max-w-[1200px] overflow-hidden rounded-[24px] border border-black/[0.08] bg-[#0d0d0d] p-8 text-white shadow-[0_18px_60px_rgba(0,0,0,0.12)] sm:p-12">
          <div className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.06] px-3.5 py-1.5 text-[11px] font-medium tracking-[1.5px] text-white/70">
                THE HONEST PART
              </span>
              <h2 className="mt-6 text-balance">
                <span
                  className="font-heading font-normal leading-[1.02] tracking-[-1.02px]"
                  style={{ fontSize: "clamp(2rem, 4.5vw, 50px)" }}
                >
                  Free now, not so free{" "}
                </span>
                <span
                  className="font-instrument italic font-normal leading-[1.02] tracking-[-1.02px]"
                  style={{ fontSize: "clamp(2rem, 4.5vw, 50px)" }}
                >
                  later.
                </span>
              </h2>
              <p className="mt-5 max-w-[56ch] text-pretty text-[15px] leading-[1.7] text-white/65">
                Atlas doesn&rsquo;t even have a checkout yet. We&rsquo;re still
                working on building the features that students really care about.
                When our Pro and Max plans are ready, you&rsquo;ll be the first
                to hear about them — no surprise charges. Free is built to stay.
              </p>
            </div>
            <ul className="grid gap-3">
              {[
                "No card to sign up",
                "We’ll tell you before anything changes",
                "Your notes stay yours, on every plan",
              ].map((line) => (
                <li
                  key={line}
                  className="flex items-start gap-3 rounded-[16px] border border-white/10 bg-white/[0.04] px-5 py-4 text-[14px] leading-[1.5] text-white/80"
                >
                  <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-white text-[#0d0d0d]">
                    <Check className="size-3.5" strokeWidth={2.5} />
                  </span>
                  <span>{line}</span>
                </li>
              ))}
            </ul>
          </div>
        </Reveal>
      </section>

      {/* FAQ */}
      <section className="px-4 py-16 sm:px-6 lg:py-20">
        <div className="mx-auto grid w-full max-w-[1200px] gap-8 lg:grid-cols-[0.8fr_1.2fr]">
          <Reveal className="lg:sticky lg:top-28 lg:self-start">
            <span className="grid size-11 place-items-center rounded-[14px] border border-black/10 bg-white text-[#0d0d0d] shadow-[0_8px_30px_rgba(0,0,0,0.05)]">
              <MessageCircleQuestion className="size-5" strokeWidth={1.8} />
            </span>
            <h2 className="mt-5 text-balance text-[#0d0d0d]">
              <span
                className="font-heading font-normal leading-[1.02] tracking-[-1.02px]"
                style={{ fontSize: "clamp(2rem, 4.5vw, 48px)" }}
              >
                The questions students actually{" "}
              </span>
              <span
                className="font-instrument italic font-normal leading-[1.02] tracking-[-1.02px]"
                style={{ fontSize: "clamp(2rem, 4.5vw, 48px)" }}
              >
                ask.
              </span>
            </h2>
          </Reveal>

          <div className="grid gap-3">
            {QUESTIONS.map((item, index) => (
              <Reveal key={item.q} delay={index * 0.06}>
                <article className="rounded-[20px] border border-black/[0.08] bg-white p-5 shadow-[0_8px_30px_rgba(0,0,0,0.05)] sm:p-6">
                  <h3 className="font-medium tracking-tight text-[#0d0d0d]">
                    {item.q}
                  </h3>
                  <p className="mt-2 text-pretty text-[14px] leading-[1.6] text-black/60">
                    {item.a}
                  </p>
                </article>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="px-4 pb-24 pt-10 sm:px-6">
        <Reveal className="mx-auto max-w-[900px] text-center">
          <h2 className="text-balance text-[#0d0d0d]">
            <span
              className="font-heading block font-normal leading-none tracking-[-1.02px]"
              style={{ fontSize: "clamp(2.5rem, 6vw, 72px)" }}
            >
              Try the beta.
            </span>
            <span
              className="font-instrument block italic font-normal leading-none tracking-[-1.02px]"
              style={{ fontSize: "clamp(2.5rem, 6vw, 72px)" }}
            >
              Keep your focus.
            </span>
          </h2>
          <p className="mx-auto mt-5 max-w-md text-pretty text-[16px] leading-[1.6] text-black/60">
            Record your next lecture and let Atlas take the notes — while beta
            access is still free.
          </p>
          <div className="mt-9 flex justify-center">
            <Link
              href={primaryHref}
              className="group inline-flex items-center gap-2 rounded-full bg-[#0d0d0d] py-1.5 pl-6 pr-2 text-[15px] font-medium text-white transition-transform hover:scale-[1.02] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/40 active:scale-[0.98]"
            >
              {primaryLabel}
              <span className="grid size-6 place-items-center rounded-full bg-white">
                <ArrowUpRight
                  className="size-3.5 text-black transition-transform duration-300 ease-out group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                  strokeWidth={2.5}
                />
              </span>
            </Link>
          </div>
          <p className="mt-5 text-[12px] text-black/45">
            Free while in beta. We&rsquo;ll announce Pro and Max when
            they&rsquo;re ready.
          </p>
        </Reveal>
      </section>

      {/* Footnotes */}
      <section
        aria-label="Footnotes"
        className="border-t border-black/10 bg-[#fafafa]"
      >
        <div className="mx-auto w-full max-w-[1200px] px-4 py-12 sm:px-6">
          <ol className="space-y-3">
            {FOOTNOTES.map((f) => (
              <li
                key={f.id}
                id={`fn-${f.id}`}
                className="flex scroll-mt-28 gap-3 text-pretty text-[12.5px] leading-[1.6] text-black/55"
              >
                <span className="font-heading shrink-0 tabular-nums text-black/35">
                  {f.n}.
                </span>
                <span>
                  {f.body}{" "}
                  <a
                    href={`#fnref-${f.id}`}
                    aria-label="Back to reference"
                    className="text-black/35 no-underline transition-colors hover:text-black/70"
                  >
                    ↩
                  </a>
                </span>
              </li>
            ))}
          </ol>
        </div>
      </section>
    </main>
  );
}

function PlanCard({ plan }: { plan: Plan }) {
  const Icon = plan.icon;
  const locked = plan.state === "soon";

  return (
    <article
      className={cn(
        "relative flex h-full flex-col rounded-[24px] border bg-white p-6 transition-colors",
        locked
          ? "border-black/[0.06] shadow-[0_8px_30px_rgba(0,0,0,0.04)]"
          : "border-[#0d0d0d] shadow-[0_18px_60px_rgba(0,0,0,0.10)] hover:border-black/80"
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <span
          className={cn(
            "inline-flex rounded-full border px-3 py-1 text-[11px] font-medium tracking-[1.5px]",
            locked
              ? "border-black/10 bg-black/[0.04] text-black/55"
              : "border-transparent bg-[#0d0d0d] text-white"
          )}
        >
          {plan.badge}
        </span>
        <span className="grid size-11 place-items-center rounded-[14px] border border-black/10 bg-[#fafafa] text-[#0d0d0d]">
          <Icon className="size-5" strokeWidth={1.8} />
        </span>
      </div>

      <div className="mt-8 min-h-[176px]">
        <p className="text-[11px] font-medium uppercase tracking-[1.5px] text-black/40">
          {plan.altitude}
        </p>
        <h3 className="mt-1.5 text-2xl font-normal tracking-tight text-[#0d0d0d]">
          {plan.name}
        </h3>
        <div className="mt-4 flex min-h-[64px] items-end gap-2">
          <span
            className={cn(
              "font-normal leading-none tracking-[-1px] text-[#0d0d0d]",
              plan.price.length <= 3 ? "text-6xl" : "text-5xl"
            )}
          >
            {plan.price}
          </span>
          <span className="pb-1 text-[13px] leading-[1.4] text-black/50">
            {plan.priceNote}
          </span>
        </div>
        <p className="mt-4 text-pretty text-[14px] leading-[1.6] text-black/60">
          {plan.description}
        </p>
      </div>

      {/* Features — fogged on the upcoming plans */}
      <div className="relative mt-7 flex-1 border-t border-black/[0.08] pt-6">
        <ul
          className={cn(
            "grid gap-3",
            locked && "select-none opacity-70 blur-[2.5px]"
          )}
          aria-hidden={locked || undefined}
        >
          {plan.features.map((feature) => (
            <li
              key={feature}
              className="flex items-start gap-3 text-[14px] text-black/70"
            >
              <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full border border-black/10 bg-[#fafafa] text-[#0d0d0d]">
                <Check className="size-3.5" strokeWidth={2} />
              </span>
              <span className="leading-[1.5]">{feature}</span>
            </li>
          ))}
        </ul>

        {locked && (
          <>
            <div className="pointer-events-none absolute inset-0 -bottom-1 rounded-b-[16px] bg-gradient-to-b from-white/45 via-white/55 to-white/85" />
            <div className="absolute inset-0 grid place-items-center">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-black/10 bg-white/90 px-3.5 py-1.5 text-[11px] font-medium tracking-[1px] text-black/55 shadow-[0_8px_24px_rgba(0,0,0,0.08)] backdrop-blur-sm">
                <Cloud className="size-3.5" strokeWidth={1.8} />
                Coming soon
              </span>
            </div>
          </>
        )}
      </div>

      {plan.cta && plan.href && (
        <Link
          href={plan.href}
          className={cn(
            "mt-8 inline-flex w-full items-center justify-center gap-2 rounded-full px-5 py-3 text-[14px] font-medium transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/40 active:scale-[0.98]",
            locked
              ? "border border-black/15 text-[#0d0d0d] hover:bg-black/[0.04]"
              : "bg-[#0d0d0d] text-white hover:scale-[1.01]"
          )}
        >
          {plan.cta}
          <ArrowUpRight className="size-3.5" strokeWidth={2.3} />
        </Link>
      )}
    </article>
  );
}
