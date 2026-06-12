import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowUpRight,
  BookOpenCheck,
  CalendarClock,
  Check,
  CircleDollarSign,
  GraduationCap,
  LockKeyhole,
  MessageCircleQuestion,
  NotebookPen,
  School,
  ShieldCheck,
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
    "Atlas is free while in beta. See current student access, planned study features, and campus pilot options.",
  openGraph: {
    title: "Atlas Pricing",
    description:
      "Start with Atlas for free while it is in beta. No card required.",
  },
};

type Plan = {
  name: string;
  eyebrow: string;
  price: string;
  priceNote: string;
  description: string;
  icon: LucideIcon;
  features: string[];
  cta: string;
  href: string;
  highlighted?: boolean;
};

const INCLUDED = [
  {
    icon: NotebookPen,
    title: "Thorough notes",
    body: "Structured summaries, detailed sections, and key concepts from real lecture audio.",
  },
  {
    icon: BookOpenCheck,
    title: "Study library",
    body: "Every generated note is saved to your account, ready to revisit and export.",
  },
  {
    icon: LockKeyhole,
    title: "Atlas Enclave",
    body: "Your notes stay scoped to your account, and recordings are not sold or shared.",
  },
  {
    icon: Sparkles,
    title: "Personalization",
    body: "Atlas learns your course context and study preferences as you use it.",
  },
];

const QUESTIONS = [
  {
    q: "Do I need a credit card?",
    a: "No. Atlas beta access is free to start, and the signup flow does not ask for a card.",
  },
  {
    q: "Will beta stay free forever?",
    a: "We have not made that promise. The current beta is free while we learn what students need and tune the product.",
  },
  {
    q: "What happens before paid plans launch?",
    a: "We will give students clear notice before pricing changes. Nobody should be surprised by a bill.",
  },
  {
    q: "Can a club, cohort, or school try Atlas?",
    a: "Yes. Reach out and we can talk through a small pilot, privacy questions, and rollout fit.",
  },
];

export default async function PricingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const primaryHref = user ? "/upload" : "/signup";
  const primaryLabel = user ? "Record a lecture" : "Start for free";

  const plans: Plan[] = [
    {
      name: "Student beta",
      eyebrow: "Live now",
      price: "$0",
      priceNote: "while Atlas is in beta",
      description:
        "For students who want to record class, upload lecture audio, and get study-ready notes without a card.",
      icon: GraduationCap,
      features: [
        "Browser recording and file uploads",
        "Thorough notes, summaries, and key concepts",
        "Private note library with exports",
        "Atlas Enclave privacy protections",
      ],
      cta: primaryLabel,
      href: primaryHref,
      highlighted: true,
    },
    {
      name: "Focused semester",
      eyebrow: "Planned",
      price: "Soon",
      priceNote: "for heavier study loads",
      description:
        "A future path for students who rely on Atlas across a full course load and need more room to work.",
      icon: CalendarClock,
      features: [
        "Higher processing allowance",
        "Priority during busy exam windows",
        "Deeper course memory controls",
        "More study and export tools",
      ],
      cta: user ? "Use beta" : "Join beta",
      href: primaryHref,
    },
    {
      name: "Campus pilot",
      eyebrow: "By request",
      price: "Custom",
      priceNote: "for groups and schools",
      description:
        "For student groups, accessibility teams, and schools that want to evaluate Atlas with a small cohort.",
      icon: School,
      features: [
        "Pilot setup support",
        "Privacy and policy review",
        "Shared feedback channel",
        "Rollout guidance for cohorts",
      ],
      cta: "Talk to us",
      href: "mailto:hello@atlasai.ca?subject=Atlas%20campus%20pilot",
    },
  ];

  return (
    <main className="font-heading overflow-hidden bg-[#fafafa]">
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
            <p className="mt-5 max-w-[58ch] text-pretty text-[17px] leading-[1.6] text-black/60">
              Atlas is in beta, so students can try the full lecture-to-notes
              workflow without a card. Paid plans will come only after the
              product is ready.
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
              <Link
                href="mailto:hello@atlasai.ca?subject=Atlas%20pricing"
                className="rounded-full border border-black/15 px-5 py-2.5 text-[14px] font-medium text-[#0d0d0d] transition-colors hover:bg-black/[0.04] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/40"
              >
                Ask about pilots
              </Link>
            </div>
            <p className="mt-4 text-[13px] text-black/45">
              No card required. Your recordings stay private.
            </p>
          </div>

          <div className="lg:col-span-6">
            <div className="relative mx-auto w-full max-w-[520px]">
              <div className="relative min-h-[520px] overflow-hidden rounded-[24px] border border-black/[0.08] bg-white shadow-[0_8px_30px_rgba(0,0,0,0.05)]">
                <Image
                  src="/landing/lecture-hall.jpg"
                  alt="Students listening in a university lecture hall"
                  fill
                  priority
                  sizes="(min-width: 1024px) 520px, 100vw"
                  className="object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-b from-white/20 via-black/5 to-black/55" />
                <div className="absolute inset-x-5 bottom-5 rounded-[20px] border border-white/25 bg-white/82 p-5 shadow-[0_18px_60px_rgba(0,0,0,0.18)] backdrop-blur-[18px]">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-[12px] font-medium tracking-[1.5px] text-black/50">
                        BETA PASS
                      </p>
                      <h2 className="mt-1 text-3xl font-normal tracking-tight text-[#0d0d0d]">
                        Full student access
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
                      while in beta
                    </span>
                  </div>
                  <div className="mt-5 grid gap-2 sm:grid-cols-2">
                    {["Record lectures", "Upload audio", "Export notes", "Private library"].map(
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

      <section className="px-4 py-16 sm:px-6 lg:py-20">
        <div className="mx-auto w-full max-w-[1200px]">
          <Reveal className="mx-auto max-w-3xl text-center">
            <h2 className="text-balance text-[#0d0d0d]">
              <span
                className="font-heading font-normal leading-[1.02] tracking-[-1.02px]"
                style={{ fontSize: "clamp(2.25rem, 5vw, 60px)" }}
              >
                Simple now, careful{" "}
              </span>
              <span
                className="font-instrument italic font-normal leading-[1.02] tracking-[-1.02px]"
                style={{ fontSize: "clamp(2.25rem, 5vw, 60px)" }}
              >
                later.
              </span>
            </h2>
            <p className="mx-auto mt-4 max-w-[58ch] text-pretty text-[15px] leading-[1.6] text-black/60">
              Atlas does not have checkout yet. The beta is free, and the next
              pricing steps will be announced before anything changes.
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

      <section className="px-4 py-16 sm:px-6 lg:py-20">
        <Reveal className="mx-auto w-full max-w-[1200px] rounded-[24px] border border-black/[0.08] bg-white p-6 shadow-[0_8px_30px_rgba(0,0,0,0.05)] sm:p-8 lg:p-10">
          <div className="grid gap-8 lg:grid-cols-[0.85fr_1.15fr] lg:items-start">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-black/[0.04] px-3.5 py-1.5 text-[11px] font-medium tracking-[1.5px] text-black/60">
                <ShieldCheck className="size-3.5" />
                INCLUDED
              </span>
              <h2 className="mt-5 text-balance text-[#0d0d0d]">
                <span
                  className="font-heading font-normal leading-[1.02] tracking-[-1.02px]"
                  style={{ fontSize: "clamp(2rem, 4.5vw, 48px)" }}
                >
                  What every student gets in{" "}
                </span>
                <span
                  className="font-instrument italic font-normal leading-[1.02] tracking-[-1.02px]"
                  style={{ fontSize: "clamp(2rem, 4.5vw, 48px)" }}
                >
                  beta.
                </span>
              </h2>
              <p className="mt-4 max-w-[48ch] text-pretty text-[15px] leading-[1.6] text-black/60">
                The free beta is not a teaser. It includes the core workflow
                Atlas was built for: record, generate, study, and keep control
                of your notes.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {INCLUDED.map((item) => (
                <div
                  key={item.title}
                  className="rounded-[20px] border border-black/[0.08] bg-[#fafafa] p-5"
                >
                  <span className="grid size-10 place-items-center rounded-[12px] border border-black/10 bg-white text-[#0d0d0d]">
                    <item.icon className="size-5" strokeWidth={1.8} />
                  </span>
                  <h3 className="mt-4 font-medium tracking-tight text-[#0d0d0d]">
                    {item.title}
                  </h3>
                  <p className="mt-1.5 text-pretty text-[13px] leading-[1.6] text-black/60">
                    {item.body}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </Reveal>
      </section>

      <section className="px-4 py-16 sm:px-6 lg:py-20">
        <div className="mx-auto grid w-full max-w-[1200px] gap-8 lg:grid-cols-[0.8fr_1.2fr]">
          <Reveal>
            <span className="grid size-11 place-items-center rounded-[14px] border border-black/10 bg-white text-[#0d0d0d] shadow-[0_8px_30px_rgba(0,0,0,0.05)]">
              <MessageCircleQuestion className="size-5" strokeWidth={1.8} />
            </span>
            <h2 className="mt-5 text-balance text-[#0d0d0d]">
              <span
                className="font-heading font-normal leading-[1.02] tracking-[-1.02px]"
                style={{ fontSize: "clamp(2rem, 4.5vw, 48px)" }}
              >
                Pricing questions,{" "}
              </span>
              <span
                className="font-instrument italic font-normal leading-[1.02] tracking-[-1.02px]"
                style={{ fontSize: "clamp(2rem, 4.5vw, 48px)" }}
              >
                answered.
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
            Record your next lecture and see what Atlas gives back while beta
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
            Current beta access is free. We will announce paid plans before they
            go live.
          </p>
        </Reveal>
      </section>
    </main>
  );
}

function PlanCard({ plan }: { plan: Plan }) {
  const Icon = plan.icon;

  return (
    <article
      className={cn(
        "flex h-full flex-col rounded-[24px] border bg-white p-6 shadow-[0_8px_30px_rgba(0,0,0,0.05)] transition-colors hover:border-black/15",
        plan.highlighted
          ? "border-[#0d0d0d] shadow-[0_18px_60px_rgba(0,0,0,0.10)]"
          : "border-black/[0.08]"
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <span
          className={cn(
            "inline-flex rounded-full border px-3 py-1 text-[11px] font-medium tracking-[1.5px]",
            plan.highlighted
              ? "border-transparent bg-[#0d0d0d] text-white"
              : "border-black/10 bg-black/[0.04] text-black/60"
          )}
        >
          {plan.eyebrow}
        </span>
        <span className="grid size-11 place-items-center rounded-[14px] border border-black/10 bg-[#fafafa] text-[#0d0d0d]">
          <Icon className="size-5" strokeWidth={1.8} />
        </span>
      </div>

      <div className="mt-8 min-h-[188px]">
        <h3 className="text-2xl font-normal tracking-tight text-[#0d0d0d]">
          {plan.name}
        </h3>
        <div className="mt-5 flex min-h-[72px] items-end gap-2">
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
        <p className="mt-5 text-pretty text-[14px] leading-[1.6] text-black/60">
          {plan.description}
        </p>
      </div>

      <ul className="mt-7 grid gap-3 border-t border-black/[0.08] pt-6">
        {plan.features.map((feature) => (
          <li key={feature} className="flex items-start gap-3 text-[14px] text-black/70">
            <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full border border-black/10 bg-[#fafafa] text-[#0d0d0d]">
              <Check className="size-3.5" strokeWidth={2} />
            </span>
            <span className="leading-[1.5]">{feature}</span>
          </li>
        ))}
      </ul>

      <Link
        href={plan.href}
        className={cn(
          "mt-8 inline-flex w-full items-center justify-center gap-2 rounded-full px-5 py-3 text-[14px] font-medium transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/40 active:scale-[0.98]",
          plan.highlighted
            ? "bg-[#0d0d0d] text-white hover:scale-[1.01]"
            : "border border-black/15 text-[#0d0d0d] hover:bg-black/[0.04]"
        )}
      >
        {plan.cta}
        <ArrowUpRight className="size-3.5" strokeWidth={2.3} />
      </Link>
    </article>
  );
}
