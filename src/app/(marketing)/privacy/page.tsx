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

/** Pill eyebrow in the cinematic light language. */
function Eyebrow({
  children,
  icon,
}: {
  children: React.ReactNode;
  icon?: React.ReactNode;
}) {
  return (
    <span className="font-heading inline-flex items-center gap-2 rounded-full border border-black/10 bg-black/[0.04] px-3.5 py-1.5 text-[11px] font-medium tracking-[1.5px] text-black/60">
      {icon}
      {children}
    </span>
  );
}

/** Section H2: upright Inter Tight with one Instrument Serif italic phrase. */
function SectionH2({
  upright,
  italic,
  after,
}: {
  upright: string;
  italic?: string;
  after?: string;
}) {
  const size = { fontSize: "clamp(2rem, 4.5vw, 48px)" };
  return (
    <h2 className="mt-4 text-balance text-[#0d0d0d]">
      <span
        className="font-heading font-normal leading-[1.02] tracking-[-1.02px]"
        style={size}
      >
        {upright}
      </span>
      {italic ? (
        <span
          className="font-instrument italic font-normal leading-[1.02] tracking-[-1.02px]"
          style={size}
        >
          {italic}
        </span>
      ) : null}
      {after ? (
        <span
          className="font-heading font-normal leading-[1.02] tracking-[-1.02px]"
          style={size}
        >
          {after}
        </span>
      ) : null}
    </h2>
  );
}

export default function PrivacyPhilosophyPage() {
  return (
    <main className="font-heading relative overflow-hidden pb-28">
      <div className="relative mx-auto max-w-[1080px] px-4 pt-28 sm:px-6 lg:pt-32">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-[13px] text-black/60 transition-colors hover:text-[#0d0d0d]"
        >
          <ArrowLeft className="size-4" />
          Back
        </Link>

        {/* Opening statement — left-weighted asymmetric split, copy held to the
            left with the enclave panel balancing the right. */}
        <section className="mt-12 grid grid-cols-1 items-center gap-12 lg:mt-14 lg:grid-cols-12 lg:gap-10">
          <div className="lg:col-span-7">
            <Eyebrow icon={<Lock className="size-3.5" />}>ATLAS ENCLAVE</Eyebrow>
            <h1 className="mt-8 max-w-[14ch] text-balance text-[#0d0d0d]">
              <span
                className="font-heading font-normal leading-[1.02] tracking-[-1.02px]"
                style={{ fontSize: "clamp(2.5rem, 6vw, 72px)" }}
              >
                Your thoughts are{" "}
              </span>
              <span
                className="font-instrument italic font-normal leading-[1.02] tracking-[-1.02px]"
                style={{ fontSize: "clamp(2.5rem, 6vw, 72px)" }}
              >
                yours.
              </span>
            </h1>
            <p className="mt-6 max-w-[46ch] text-pretty text-[17px] leading-[1.6] text-black/60">
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
            <Eyebrow>ATLAS ENCLAVE</Eyebrow>
            <SectionH2
              upright="A private space that "
              italic="belongs to you."
            />
            <div className="mt-5 space-y-4 text-pretty text-[15px] leading-[1.7] text-black/60">
              <p>
                Everything you bring to Atlas lives inside Atlas Enclave, our
                system made to protect your account, so that no one, not even
                us, can reach your information.
              </p>
              <p>
                Atlas Enclave is a promise as much as it is a system: we refuse
                to sell your data, and we don’t train AI on your personal
                notes, period. The work you do here stays here.
              </p>
            </div>
          </section>

          <Divider />

          {/* What we collect */}
          <section>
            <Eyebrow>WHAT WE COLLECT</Eyebrow>
            <SectionH2
              upright="Only what it takes to write "
              italic="your notes."
            />
            <div className="mt-8 grid gap-4 sm:grid-cols-3">
              {COLLECT.map((c) => (
                <div
                  key={c.label}
                  className="rounded-[20px] border border-black/[0.08] bg-white p-5 shadow-[0_8px_30px_rgba(0,0,0,0.05)] transition-colors hover:border-black/15"
                >
                  <h3 className="font-medium tracking-tight text-[#0d0d0d]">
                    {c.label}
                  </h3>
                  <p className="mt-2 text-pretty text-[13px] leading-[1.6] text-black/60">
                    {c.body}
                  </p>
                </div>
              ))}
            </div>
          </section>

          <Divider />

          {/* What we never do */}
          <section>
            <Eyebrow>WHAT WE NEVER DO</Eyebrow>
            <SectionH2 upright="Some lines we will " italic="never" after=" cross." />
            <ul className="mt-8 space-y-3">
              {NEVER.map((n) => (
                <li
                  key={n}
                  className="flex items-start gap-3 rounded-[20px] border border-black/[0.08] bg-[#fafafa] p-5"
                >
                  <span className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-[12px] border border-black/10 bg-white text-[#0d0d0d]">
                    <X className="size-3.5" />
                  </span>
                  <span className="text-pretty font-medium leading-relaxed text-[#0d0d0d]">
                    {n}
                  </span>
                </li>
              ))}
            </ul>
          </section>

          <Divider />

          {/* Your controls */}
          <section>
            <Eyebrow>YOUR CONTROLS</Eyebrow>
            <SectionH2 upright="You’re always " italic="in charge." />
            <div className="mt-8 space-y-3">
              {CONTROLS.map((c) => (
                <div
                  key={c.label}
                  className="flex items-start gap-4 rounded-[20px] border border-black/[0.08] bg-white p-5 shadow-[0_8px_30px_rgba(0,0,0,0.05)] transition-colors hover:border-black/15"
                >
                  <span className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-[12px] border border-black/10 bg-white text-[#0d0d0d]">
                    <Check className="size-4" />
                  </span>
                  <div>
                    <h3 className="font-medium tracking-tight text-[#0d0d0d]">
                      {c.label}
                    </h3>
                    <p className="mt-1 text-pretty text-[13px] leading-[1.6] text-black/60">
                      {c.body}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <Divider />

          {/* Closing sign-off */}
          <section className="relative overflow-hidden rounded-[24px] border border-black/[0.08] bg-white p-8 shadow-[0_8px_30px_rgba(0,0,0,0.05)] sm:p-12">
            <div className="relative">
              <span className="grid size-10 place-items-center rounded-[12px] border border-black/10 bg-white text-[#0d0d0d]">
                <Lock className="size-5" strokeWidth={1.8} />
              </span>
              <h2 className="mt-4 text-balance text-[#0d0d0d]">
                <span
                  className="font-heading font-normal leading-[1.02] tracking-[-1.02px]"
                  style={{ fontSize: "clamp(1.6rem, 3vw, 32px)" }}
                >
                  A note from{" "}
                </span>
                <span
                  className="font-instrument italic font-normal leading-[1.02] tracking-[-1.02px]"
                  style={{ fontSize: "clamp(1.6rem, 3vw, 32px)" }}
                >
                  the team
                </span>
              </h2>
              <p className="mt-4 max-w-2xl text-pretty text-[15px] leading-[1.7] text-black/60">
                We started Atlas because we wanted to be present in class
                without losing a word. Privacy isn’t a feature we bolted on.
                It’s the reason we trust this tool with our own lectures. We’ll
                keep it that way for you, too.
              </p>
              <p className="mt-6 text-[15px] font-medium text-[#0d0d0d]">
                The Atlas team
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-4 text-[13px]">
                <Link
                  href="/privacy-policy"
                  className="text-[#0d0d0d] underline hover:text-black/70"
                >
                  Read the full Privacy Policy →
                </Link>
                <Link href="/terms" className="text-black/60 hover:text-[#0d0d0d]">
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
      <div className="overflow-hidden rounded-[20px] border border-black/[0.08] bg-white shadow-[0_8px_30px_rgba(0,0,0,0.05)]">
        <div className="flex items-center gap-2.5 border-b border-black/[0.06] px-5 py-4">
          <span className="grid size-8 place-items-center rounded-[12px] border border-black/10 bg-white text-[#0d0d0d]">
            <Lock className="size-4" strokeWidth={1.8} />
          </span>
          <div className="min-w-0">
            <p className="text-[11px] uppercase tracking-[1.5px] text-black/45">
              Atlas Enclave
            </p>
            <p className="text-sm font-medium tracking-tight text-[#0d0d0d]">
              Private by design
            </p>
          </div>
        </div>
        <ul className="divide-y divide-black/[0.06]">
          {ROWS.map((r) => (
            <li
              key={r.label}
              className="flex items-center justify-between gap-3 px-5 py-3.5"
            >
              <span className="text-sm text-black/60">{r.label}</span>
              <span className="inline-flex items-center gap-1.5 text-sm font-medium tracking-tight text-[#0d0d0d]">
                <Check className="size-3.5" />
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
  return <div className="my-16 h-px bg-black/[0.08]" aria-hidden />;
}
