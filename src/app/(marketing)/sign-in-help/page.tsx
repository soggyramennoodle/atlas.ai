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

export default function SignInHelpPage() {
  return (
    <main className="relative overflow-hidden pb-28">
      <div className="relative mx-auto max-w-[1080px] px-4 pt-28 sm:px-6 lg:pt-32">
        <Link
          href="/login"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition hover:-translate-x-0.5 hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Back to sign in
        </Link>

        {/* Hero — left-weighted asymmetric split, copy held to the left. */}
        <section className="mt-12 grid grid-cols-1 items-center gap-12 lg:mt-16 lg:grid-cols-12 lg:gap-10">
          <div className="lg:col-span-7">
            <p className="font-mono text-[12px] uppercase tracking-[0.2em] text-primary">
              Sign-in &amp; deliverability
            </p>
            <h1 className="mt-5 max-w-[15ch] text-balance text-5xl font-bold leading-[0.98] tracking-[-0.03em] sm:text-6xl">
              Why your school email can block the link.
            </h1>
            <p className="mt-6 max-w-[52ch] text-pretty text-lg leading-relaxed text-muted-foreground">
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
            <p className="font-mono text-xs uppercase tracking-[0.22em] text-primary">
              Why this happens
            </p>
            <h2 className="mt-4 text-balance text-4xl font-extrabold sm:text-[2.75rem]">
              Your inbox is trying to protect you.
            </h2>
            <p className="mt-5 text-pretty text-lg leading-relaxed text-muted-foreground">
              School mail systems are tuned to be cautious. The same machinery
              that stops phishing can also stop a one-time sign-in link.
            </p>
          </div>
          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            {WHY.map((w) => (
              <div
                key={w.label}
                className="hover-glow icon-animate rounded-[4px] border bg-card p-5 shadow-[0_10px_28px_rgba(15,23,42,0.05)] transition duration-300 ease-out hover:-translate-y-0.5 hover:border-primary/25 hover:bg-secondary/45"
              >
                <span className="grid size-9 place-items-center rounded-[4px] border border-border bg-background text-foreground">
                  <w.icon className="size-4.5" />
                </span>
                <h3 className="mt-4 font-semibold tracking-tight">{w.label}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground text-pretty">
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
            <p className="font-mono text-xs uppercase tracking-[0.22em] text-primary">
              What to do
            </p>
            <h2 className="mt-4 text-balance text-4xl font-extrabold sm:text-[2.75rem]">
              Four ways in, fastest first.
            </h2>
          </div>
          <ol className="mt-8 space-y-3">
            {STEPS.map((s, i) => (
              <li
                key={s.label}
                className="hover-glow icon-animate flex items-start gap-4 rounded-[4px] border bg-card p-5 shadow-[0_10px_28px_rgba(15,23,42,0.05)] transition duration-300 ease-out hover:-translate-y-0.5 hover:border-primary/25 hover:bg-secondary/45"
              >
                <span className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-[3px] bg-primary/15 font-mono text-sm font-semibold text-primary">
                  {i + 1}
                </span>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-semibold tracking-tight">{s.label}</h3>
                    {s.recommended && (
                      <span className="inline-flex items-center gap-1 rounded-[3px] border border-primary/30 bg-primary/10 px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.14em] text-primary">
                        <Check className="size-3" />
                        Recommended
                      </span>
                    )}
                  </div>
                  <p className="mt-1.5 text-pretty text-sm leading-relaxed text-muted-foreground">
                    {s.body}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <Divider />

        {/* Closing — still stuck */}
        <section className="relative overflow-hidden rounded-[4px] border bg-card p-8 shadow-[0_16px_44px_rgba(15,23,42,0.08)] sm:p-12">
          <span className="grid size-10 place-items-center rounded-[4px] border border-primary/25 bg-primary/10 text-primary">
            <Mail className="size-5" />
          </span>
          <h2 className="mt-4 text-balance text-2xl font-semibold tracking-tight sm:text-3xl">
            Still locked out?
          </h2>
          <p className="mt-4 max-w-2xl text-pretty text-lg leading-relaxed text-muted-foreground">
            If none of these get you in, email us and we’ll sort it out with you.
            Tell us the address you tried and your school, it helps us spot what
            your filter is doing.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3 text-sm">
            <a
              href="mailto:hello@atlasai.ca"
              className="font-medium text-primary hover:underline"
            >
              hello@atlasai.ca
            </a>
            <Link
              href="/login"
              className="inline-flex items-center gap-1 text-muted-foreground transition hover:text-foreground"
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
      <div className="overflow-hidden rounded-[6px] border border-border bg-card shadow-[0_1px_2px_rgba(0,0,0,0.06),0_18px_50px_-24px_rgba(0,0,0,0.25)]">
        <div className="flex items-center gap-2 border-b border-border px-5 py-3.5">
          <Inbox className="size-4 text-muted-foreground" />
          <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
            Inbox
          </span>
        </div>

        {/* Delivered — personal address. The AI edge-glow marks the live link. */}
        <div className="ai-ring relative m-3 rounded-[6px] bg-card p-4">
          <div className="relative flex items-start gap-3">
            <span className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-[4px] bg-primary/15 text-primary">
              <Sparkles className="size-4" />
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold tracking-tight">
                Your Atlas sign-in link
              </p>
              <p className="mt-0.5 truncate text-xs text-muted-foreground">
                to you@gmail.com
              </p>
              <span className="mt-2 inline-flex items-center gap-1 font-mono text-[10.5px] uppercase tracking-[0.14em] text-primary">
                <Check className="size-3" />
                Delivered
              </span>
            </div>
          </div>
        </div>

        {/* Held — school address. */}
        <div className="mx-3 mb-3 rounded-[6px] border border-dashed border-border bg-secondary/40 p-4">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-[4px] bg-muted text-muted-foreground">
              <ShieldAlert className="size-4" />
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold tracking-tight text-muted-foreground">
                Your Atlas sign-in link
              </p>
              <p className="mt-0.5 truncate text-xs text-muted-foreground">
                to you@university.edu
              </p>
              <span className="mt-2 inline-flex items-center gap-1 font-mono text-[10.5px] uppercase tracking-[0.14em] text-muted-foreground">
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
  return (
    <div className="my-16 flex items-center gap-4" aria-hidden>
      <span className="h-px flex-1 bg-gradient-to-r from-transparent to-border" />
      <span className="size-1.5 rounded-full bg-primary/50" />
      <span className="h-px flex-1 bg-gradient-to-l from-transparent to-border" />
    </div>
  );
}
