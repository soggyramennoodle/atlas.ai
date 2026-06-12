"use client";

import { useState } from "react";
import { Inter_Tight, Instrument_Serif } from "next/font/google";
import { Loader2, Lock, LogOut, Mail } from "lucide-react";
import { motion } from "framer-motion";
import type { AccessRevocationKind } from "@/lib/types";

/* This modal renders inside the app shell (Geist), so it carries the
   cinematic display fonts itself — next/font is scoped per component. */
const interTight = Inter_Tight({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-inter-tight",
});

const instrumentSerif = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  style: ["italic"],
  variable: "--font-instrument-serif",
});

const SUPPORT_EMAIL = "hello@atlasai.ca";

const COPY: Record<
  AccessRevocationKind,
  { lead: string; accent: string; body: string }
> = {
  banned: {
    lead: "Account",
    accent: "locked",
    body: "This account has been locked and can't stay signed in. If you think this is a mistake, reach out and we'll help sort it out.",
  },
  global_logout: {
    lead: "Signed out",
    accent: "by Atlas",
    body: "Atlas ended your session for maintenance or security. Sign in again when you're ready to continue.",
  },
};

export function AccountLockedModal({
  kind,
  onExit,
}: {
  kind: AccessRevocationKind;
  onExit: () => Promise<void>;
}) {
  const [pending, setPending] = useState(false);
  const copy = COPY[kind];

  async function handleExit() {
    if (pending) return;
    setPending(true);
    try {
      await onExit();
    } finally {
      setPending(false);
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className={`${interTight.variable} ${instrumentSerif.variable} font-heading fixed inset-0 z-[200] flex items-center justify-center bg-[#0d0d0d] p-6`}
      role="dialog"
      aria-modal="true"
      aria-labelledby="account-locked-title"
    >
      <div className="w-full max-w-sm text-center">
        <span className="mx-auto grid size-12 place-items-center rounded-full border border-white/20 bg-white/[0.06] text-white">
          {kind === "banned" ? (
            <Lock className="size-5" />
          ) : (
            <LogOut className="size-5" />
          )}
        </span>
        <h2
          id="account-locked-title"
          className="mt-6 text-[2rem] font-normal leading-[1.05] tracking-[-0.02em] text-white"
        >
          {copy.lead}{" "}
          <span className="font-instrument italic">{copy.accent}</span>
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-white/55 text-pretty">
          {copy.body}
        </p>

        <div className="mt-8 grid gap-3">
          <a
            href={`mailto:${SUPPORT_EMAIL}`}
            className="flex h-11 w-full items-center justify-center gap-2 rounded-full bg-white text-sm font-medium text-[#0d0d0d] transition hover:scale-[1.01] active:scale-[0.99]"
          >
            <Mail className="size-4" />
            Contact {SUPPORT_EMAIL}
          </a>
          <button
            type="button"
            onClick={handleExit}
            disabled={pending}
            className="flex h-11 w-full items-center justify-center gap-2 rounded-full border border-white/20 text-sm font-medium text-white transition hover:bg-white/[0.06] active:scale-[0.99] disabled:pointer-events-none disabled:opacity-60"
          >
            {pending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <LogOut className="size-4" />
            )}
            Exit Atlas
          </button>
        </div>
      </div>
    </motion.div>
  );
}
