"use client";

import { motion } from "framer-motion";
import { AtlasMark } from "@/components/logo";

const EASE = [0.22, 1, 0.36, 1] as const;

const LABELS: Record<string, string> = { google: "Google" };

/**
 * Full-screen takeover shown while an OAuth redirect is in flight, so the jump
 * to the provider feels intentional instead of a blank pause. Atlas and the
 * provider sit either side of a row of flowing dots — a small "handing off"
 * gesture — over the cinematic-light surface.
 */
export function AuthHandoff({ provider }: { provider: string }) {
  const label = LABELS[provider] ?? provider;

  return (
    <motion.div
      className="fixed inset-0 z-[200] grid place-items-center bg-[#fafafa] px-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.35, ease: EASE }}
    >
      <motion.div
        className="flex flex-col items-center text-center"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: EASE }}
      >
        <div className="flex items-center gap-5">
          <span className="grid size-14 place-items-center rounded-2xl border border-black/[0.08] bg-white text-[#0d0d0d] shadow-[0_18px_50px_rgba(0,0,0,0.10)]">
            <AtlasMark className="size-7" />
          </span>

          {/* Flowing dots: data being handed across. */}
          <div className="flex items-center gap-1.5">
            {[0, 1, 2].map((i) => (
              <motion.span
                key={i}
                className="size-1.5 rounded-full bg-black/30"
                animate={{ opacity: [0.2, 1, 0.2], y: [0, -3, 0] }}
                transition={{
                  duration: 1,
                  repeat: Infinity,
                  ease: "easeInOut",
                  delay: i * 0.18,
                }}
              />
            ))}
          </div>

          <span className="grid size-14 place-items-center rounded-2xl border border-black/[0.08] bg-white shadow-[0_18px_50px_rgba(0,0,0,0.10)]">
            <GoogleG />
          </span>
        </div>

        <h2 className="font-heading mt-8 text-[1.6rem] font-normal tracking-[-0.02em] text-[#0d0d0d]">
          Handing you off to{" "}
          <span className="font-instrument italic">{label}</span>
        </h2>
        <p className="font-heading mt-2 text-sm text-black/45">
          Hold tight — this only takes a second.
        </p>
      </motion.div>
    </motion.div>
  );
}

function GoogleG() {
  return (
    <svg viewBox="0 0 24 24" className="size-7" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1Z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84Z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1A11 11 0 0 0 2.18 7.06l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38Z"
      />
    </svg>
  );
}
