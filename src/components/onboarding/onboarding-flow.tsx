"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowLeft, ArrowRight, Check, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { AtlasMark } from "@/components/logo";
import { HeroBand } from "@/components/app/glass";
import {
  PILL_INPUT,
  PILL_PRIMARY_INLINE,
  PILL_SECONDARY_INLINE,
} from "@/components/app/pills";

interface Field {
  key: "display_name" | "institution" | "program" | "year" | "grad_year";
  label: string;
  title: string;
  placeholder: string;
  optional?: boolean;
}

const STEPS: Field[] = [
  {
    key: "display_name",
    label: "What should we call you?",
    title: "Welcome to Atlas",
    placeholder: "e.g. Maya",
  },
  {
    key: "institution",
    label: "Where do you study?",
    title: "Your institution",
    placeholder: "e.g. University of Toronto",
  },
  {
    key: "program",
    label: "What's your program or major?",
    title: "Your field",
    placeholder: "e.g. BSc Computer Science",
  },
  {
    key: "year",
    label: "What year are you in?",
    title: "Your year",
    placeholder: "e.g. 2nd year",
  },
  {
    key: "grad_year",
    label: "When do you expect to graduate?",
    title: "Almost done",
    placeholder: "e.g. 2028",
  },
];

export function OnboardingFlow() {
  const router = useRouter();
  const reduceMotion = useReducedMotion();
  const [step, setStep] = useState(0);
  const [dir, setDir] = useState(1);
  const [values, setValues] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const field = STEPS[step];
  const isLast = step === STEPS.length - 1;
  const value = values[field.key] ?? "";

  function next() {
    if (!value.trim()) return;
    if (isLast) {
      void submit();
      return;
    }
    setDir(1);
    setStep((s) => s + 1);
  }

  function back() {
    if (step === 0) return;
    setDir(-1);
    setStep((s) => s - 1);
  }

  async function submit() {
    setSaving(true);
    try {
      const res = await fetch("/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      if (!res.ok) throw new Error();
      router.replace("/dashboard");
      router.refresh();
    } catch {
      toast.error("Couldn't save your profile. Please try again.");
      setSaving(false);
    }
  }

  return (
    <main className="min-h-svh px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto grid min-h-[calc(100svh-3rem)] w-full max-w-6xl gap-8 lg:grid-cols-[minmax(0,1fr)_28rem] lg:items-center">
        <HeroBand
          priority
          className="min-h-[24rem] lg:min-h-[calc(100svh-6rem)]"
        >
          <div className="absolute inset-0 bg-black/[0.18]" aria-hidden />
          <div className="relative flex min-h-[24rem] flex-col justify-between p-6 text-white sm:p-8 lg:min-h-[calc(100svh-6rem)]">
            <div className="inline-flex items-center gap-2">
              <AtlasMark className="size-8" />
              <span className="text-2xl font-medium leading-none tracking-tight">
                Atlas
              </span>
              <span className="relative -top-2 rounded-full border border-white/25 bg-white/15 px-1.5 py-0.5 text-[0.6rem] font-medium uppercase tracking-[0.12em] text-white/80 backdrop-blur">
                beta
              </span>
            </div>

            <div className="max-w-xl">
              <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-white/65">
                First setup
              </p>
              <h1 className="mt-3 text-balance text-5xl font-normal leading-[0.95] tracking-[-0.03em] sm:text-6xl">
                Tune Atlas to{" "}
                <span className="font-instrument italic">your classes</span>
              </h1>
              <p className="mt-4 max-w-md text-pretty text-sm leading-6 text-white/68">
                A few details help Atlas understand your program, year, and
                study context before the first recording.
              </p>
            </div>
          </div>
        </HeroBand>

        <section className="flex flex-col justify-center py-4">
          <div className="mb-7 flex gap-2">
            {STEPS.map((_, i) => (
              <motion.span
                key={i}
                className="h-1.5 rounded-full bg-[#0d0d0d]"
                animate={{
                  width: i === step ? 30 : 8,
                  opacity: i <= step ? 1 : 0.18,
                }}
                transition={
                  reduceMotion
                    ? { duration: 0 }
                    : { type: "spring", stiffness: 320, damping: 30 }
                }
              />
            ))}
          </div>

          <div className="border-y border-black/[0.08] py-8">
            <AnimatePresence mode="wait" custom={dir}>
              <motion.div
                key={step}
                custom={dir}
                initial={reduceMotion ? false : { opacity: 0, x: dir * 32 }}
                animate={{ opacity: 1, x: 0 }}
                exit={
                  reduceMotion ? { opacity: 0 } : { opacity: 0, x: dir * -32 }
                }
                transition={{
                  duration: reduceMotion ? 0 : 0.28,
                  ease: [0.22, 1, 0.36, 1],
                }}
              >
                <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-[#0d0d0d]/45">
                  Step {step + 1} of {STEPS.length}
                </p>
                <h2 className="mt-3 text-4xl font-normal leading-[1] tracking-[-0.02em] text-[#0d0d0d]">
                  {field.title}
                </h2>
                <div className="mt-7 space-y-3">
                  <label
                    htmlFor={field.key}
                    className="block text-sm font-medium text-[#0d0d0d]/72"
                  >
                    {field.label}
                  </label>
                  <input
                    id={field.key}
                    autoFocus
                    value={value}
                    placeholder={field.placeholder}
                    onChange={(e) =>
                      setValues((v) => ({ ...v, [field.key]: e.target.value }))
                    }
                    onKeyDown={(e) => {
                      if (e.key === "Enter") next();
                    }}
                    className={`${PILL_INPUT} h-12`}
                  />
                </div>
              </motion.div>
            </AnimatePresence>

            <div className="mt-8 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={back}
                disabled={step === 0 || saving}
                className={`${PILL_SECONDARY_INLINE} h-11 px-4 text-xs`}
              >
                <ArrowLeft className="size-4" />
                Back
              </button>
              <button
                type="button"
                onClick={next}
                disabled={!value.trim() || saving}
                className={`${PILL_PRIMARY_INLINE} h-11 px-5 text-xs`}
              >
                {saving ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : isLast ? (
                  <>
                    Finish
                    <Check className="size-4" />
                  </>
                ) : (
                  <>
                    Continue
                    <ArrowRight className="size-4" />
                  </>
                )}
              </button>
            </div>
          </div>

          <p className="mt-5 text-sm leading-6 text-[#0d0d0d]/55">
            You can change any of this later in Settings.
          </p>
        </section>
      </div>
    </main>
  );
}
