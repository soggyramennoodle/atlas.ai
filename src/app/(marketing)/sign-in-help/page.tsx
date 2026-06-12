import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Clock,
  Inbox,
  Mail,
  ScanLine,
  ShieldAlert,
  Sparkles,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Why school email can block your sign-in link",
  description:
    "University inboxes sometimes filter out magic links before they reach you. Here’s why it happens, and the fastest way to get into Atlas.",
};

const WHY = [
  {
    icon: ScanLine,
    label: "Scanners open the link first",
    body: "Filters like Microsoft Defender, Mimecast, and Proofpoint “click” every link to check it’s safe. A magic link works only once, so that automated scan can spend it before you do.",
  },
  {
    icon: Clock,
    label: "Quarantine and delays",
    body: "Sign-in emails from outside your school are often held for review or dropped into a quarantine you never see, so the link lands late, or never arrives at all.",
  },
  {
    icon: ShieldAlert,
    label: "Strict external-sender rules",
    body: "Some schools block mail from new senders outright, or rewrite the links in a way that quietly breaks them before you ever tap one.",
  },
];

const STEPS = [
  {
    label: "Use a personal email",
    recommended: true,
    body: "Sign in with a Gmail, Outlook.com, or iCloud address. It’s the most reliable way in, and you can still add your school and program to your profile afterward.",
  },
  {
    label: "Continue with Google",
    body: "The Google button skips email links entirely. If your school runs on Google Workspace, it usually just works.",
  },
  {
    label: "Check junk, spam, and quarantine",
    body: "Used a school address already? The link is often sitting in a filtered folder. Search your inbox for “Atlas” before trying again.",
  },
  {
    label: "Resend, then give it a minute",
    body: "Filters sometimes wave the second message through. Tap Resend, wait about 60 seconds, and use the newest link, older ones expire.",
  },
];

/** Pill eyebrow in the cinematic light language. */
function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <span className="font-heading inline-flex items-center gap-2 rounded-full border border-black/10 bg-black/[0.04] px-3.5 py-1.5 text-[11px] font-medium tracking-[1.5px] text-black/60">
      {children}
    </span>
  );
}

const H2_SIZE = { fontSize: "clamp(2rem, 4.5vw, 48px)" };

export default function SignInHelpPage() {
  return (
    <main className="font-heading relative overflow-hidden pb-28">
      <div className="relative mx-auto max-w-[1080px] px-4 pt-28 sm:px-6 lg:pt-32">
        <Link
          href="/login"
          className="inline-flex items-center gap-1.5 text-[13px] text-black/60 transition-colors hover:text-[#0d0d0d]"
        >
          <ArrowLeft className="size-4" />
          Back to sign in
        </Link>

        {/* Hero — left-weighted asymmetric split, copy held to the left. */}
        <section className="mt-12 grid grid-cols-1 items-center gap-12 lg:mt-16 lg:grid-cols-12 lg:gap-10">
          <div className="lg:col-span-7">
            <Eyebrow>SIGN-IN &amp; DELIVERABILITY</Eyebrow>
            <h1 className="mt-5 text-balance text-[#0d0d0d]">
              <span
                className="font-heading font-normal leading-[1.02] tracking-[-1.02px]"
                style={{ fontSize: "clamp(2.5rem, 6vw, 72px)" }}
              >
                Why your school email can{" "}
              </span>
              <span
                className="font-instrument italic font-normal leading-[1.02] tracking-[-1.02px]"
                style={{ fontSize: "clamp(2.5rem, 6vw, 72px)" }}
              >
                block the link.
              </span>
            </h1>
            <p className="mt-6 max-w-[52ch] text-pretty text-[17px] leading-[1.6] text-black/60">
              Some university inboxes filter out sign-in links before they ever
              reach you. It isn’t your fault, and it isn’t Atlas. Here’s what’s
              happening, and the fastest way around it.
            </p>
          </div>

          {/* Visual — two inbox rows that make the abstract problem concrete. */}
          <div className="lg:col-span-5">
            <InboxPreview />
          </div>
        </section>

        <Divider />

        {/* Why this happens */}
        <section>
          <div className="max-w-[680px]">
            <Eyebrow>WHY THIS HAPPENS</Eyebrow>
            <h2 className="mt-4 text-balance text-[#0d0d0d]">
              <span
                className="font-heading font-normal leading-[1.02] tracking-[-1.02px]"
                style={H2_SIZE}
              >
                Your inbox is trying to{" "}
              </span>
              <span
                className="font-instrument italic font-normal leading-[1.02] tracking-[-1.02px]"
                style={H2_SIZE}
              >
                protect you.
              </span>
            </h2>
            <p className="mt-5 text-pretty text-[15px] leading-[1.7] text-black/60">
              School mail systems are tuned to be cautious. The same machinery
              that stops phishing can also stop a one-time sign-in link.
            </p>
          </div>
          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            {WHY.map((w) => (
              <div
                key={w.label}
                className="rounded-[20px] border border-black/[0.08] bg-white p-5 shadow-[0_8px_30px_rgba(0,0,0,0.05)] transition-colors hover:border-black/15"
              >
                <span className="grid size-9 place-items-center rounded-[12px] border border-black/10 bg-white text-[#0d0d0d]">
                  <w.icon className="size-4.5" strokeWidth={1.8} />
                </span>
                <h3 className="mt-4 font-medium tracking-tight text-[#0d0d0d]">
                  {w.label}
                </h3>
                <p className="mt-2 text-pretty text-[13px] leading-[1.6] text-black/60">
                  {w.body}
                </p>
              </div>
            ))}
          </div>
        </section>

        <Divider />

        {/* What to do */}
        <section>
          <div className="max-w-[680px]">
            <Eyebrow>WHAT TO DO</Eyebrow>
            <h2 className="mt-4 text-balance text-[#0d0d0d]">
              <span
                className="font-heading font-normal leading-[1.02] tracking-[-1.02px]"
                style={H2_SIZE}
              >
                Four ways in,{" "}
              </span>
              <span
                className="font-instrument italic font-normal leading-[1.02] tracking-[-1.02px]"
                style={H2_SIZE}
              >
                fastest first.
              </span>
            </h2>
          </div>
          <ol className="mt-8 space-y-3">
            {STEPS.map((s, i) => (
              <li
                key={s.label}
                className="flex items-start gap-4 rounded-[20px] border border-black/[0.08] bg-white p-5 shadow-[0_8px_30px_rgba(0,0,0,0.05)] transition-colors hover:border-black/15"
              >
                <span className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-[12px] border border-black/10 bg-white text-sm font-medium text-[#0d0d0d]">
                  {i + 1}
                </span>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-medium tracking-tight text-[#0d0d0d]">
                      {s.label}
                    </h3>
                    {s.recommended && (
                      <span className="inline-flex items-center gap-1 rounded-full border border-black/10 bg-black/[0.04] px-2 py-0.5 text-[10px] uppercase tracking-[1.5px] text-black/60">
                        <Check className="size-3" />
                        Recommended
                      </span>
                    )}
                  </div>
                  <p className="mt-1.5 text-pretty text-[13px] leading-[1.6] text-black/60">
                    {s.body}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <Divider />

        {/* Closing — still stuck */}
        <section className="relative overflow-hidden rounded-[24px] border border-black/[0.08] bg-white p-8 shadow-[0_8px_30px_rgba(0,0,0,0.05)] sm:p-12">
          <span className="grid size-10 place-items-center rounded-[12px] border border-black/10 bg-white text-[#0d0d0d]">
            <Mail className="size-5" strokeWidth={1.8} />
          </span>
          <h2 className="mt-4 text-balance text-[#0d0d0d]">
            <span
              className="font-heading font-normal leading-[1.02] tracking-[-1.02px]"
              style={{ fontSize: "clamp(1.6rem, 3vw, 32px)" }}
            >
              Still{" "}
            </span>
            <span
              className="font-instrument italic font-normal leading-[1.02] tracking-[-1.02px]"
              style={{ fontSize: "clamp(1.6rem, 3vw, 32px)" }}
            >
              locked out?
            </span>
          </h2>
          <p className="mt-4 max-w-2xl text-pretty text-[15px] leading-[1.7] text-black/60">
            If none of these get you in, email us and we’ll sort it out with
            you. Tell us the address you tried and your school, it helps us spot
            what your filter is doing.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3 text-[13px]">
            <a
              href="mailto:hello@atlasai.ca"
              className="font-medium text-[#0d0d0d] underline hover:text-black/70"
            >
              hello@atlasai.ca
            </a>
            <Link
              href="/login"
              className="inline-flex items-center gap-1 text-black/60 transition-colors hover:text-[#0d0d0d]"
            >
              Back to sign in
              <ArrowRight className="size-3.5" />
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}

/* A pared-back inbox: the personal address gets the link, the school address
   has it held back. Mirrors the auth "Check your email" surface. */
function InboxPreview() {
  return (
    <div className="relative mx-auto w-full max-w-[420px] lg:mx-0">
      <div className="rounded-[20px] border border-black/[0.08] bg-white shadow-[0_8px_30px_rgba(0,0,0,0.05)]">
        <div className="flex items-center gap-2 border-b border-black/[0.06] px-5 py-3.5">
          <Inbox className="size-4 text-black/45" />
          <span className="text-[11px] uppercase tracking-[1.5px] text-black/45">
            Inbox
          </span>
        </div>

        {/* Delivered — personal address. Rainbow outline only (no interior fill). */}
        <div className="relative isolate m-3 rounded-[12px] bg-white p-4">
          <span
            aria-hidden
            className="processing-glow"
            style={{ "--ai-ring-flow": "11s" } as React.CSSProperties}
          />
          <div className="relative flex items-start gap-3">
            <span className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-[12px] border border-black/10 bg-white text-[#0d0d0d]">
              <Sparkles className="size-4" strokeWidth={1.8} />
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium tracking-tight text-[#0d0d0d]">
                Your Atlas sign-in link
              </p>
              <p className="mt-0.5 truncate text-xs text-black/45">
                to you@gmail.com
              </p>
              <span className="mt-2 inline-flex items-center gap-1 text-[10.5px] uppercase tracking-[1.5px] text-[#0d0d0d]">
                <Check className="size-3" />
                Delivered
              </span>
            </div>
          </div>
        </div>

        {/* Held — school address. */}
        <div className="mx-3 mb-3 rounded-[12px] border border-dashed border-black/15 bg-[#fafafa] p-4">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-[12px] border border-black/10 bg-white text-black/45">
              <ShieldAlert className="size-4" strokeWidth={1.8} />
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium tracking-tight text-black/60">
                Your Atlas sign-in link
              </p>
              <p className="mt-0.5 truncate text-xs text-black/45">
                to you@university.edu
              </p>
              <span className="mt-2 inline-flex items-center gap-1 text-[10.5px] uppercase tracking-[1.5px] text-black/45">
                <Clock className="size-3" />
                Held by security filter
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Divider() {
  return <div className="my-16 h-px bg-black/[0.08]" aria-hidden />;
}
