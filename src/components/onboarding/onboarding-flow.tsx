"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, ArrowRight, Check, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Logo } from "@/components/logo";

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
    <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-4 py-12">
      <div className="pointer-events-none absolute inset-0 bg-aurora" />
      <div className="pointer-events-none absolute inset-0 bg-grid opacity-40 [mask-image:radial-gradient(60%_50%_at_50%_40%,black,transparent)]" />

      <div className="relative w-full max-w-md">
        <div className="mb-8 flex justify-center">
          <Logo beta className="scale-110" />
        </div>

        {/* Progress dots */}
        <div className="mb-6 flex justify-center gap-2">
          {STEPS.map((_, i) => (
            <motion.span
              key={i}
              className="h-1.5 rounded-full bg-primary"
              animate={{
                width: i === step ? 28 : 8,
                opacity: i <= step ? 1 : 0.25,
              }}
              transition={{ type: "spring", stiffness: 320, damping: 30 }}
            />
          ))}
        </div>

        <div className="overflow-hidden rounded-[1.5rem] border bg-card p-8 shadow-2xl ring-luxe">
          <AnimatePresence mode="wait" custom={dir}>
            <motion.div
              key={step}
              custom={dir}
              initial={{ opacity: 0, x: dir * 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: dir * -40 }}
              transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            >
              <p className="font-mono text-xs uppercase tracking-[0.2em] text-primary">
                Step {step + 1} of {STEPS.length}
              </p>
              <h1 className="mt-2 text-2xl font-semibold tracking-tight">
                {field.title}
              </h1>
              <div className="mt-6 space-y-2">
                <Label htmlFor={field.key}>{field.label}</Label>
                <Input
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
                  className="h-12"
                />
              </div>
            </motion.div>
          </AnimatePresence>

          <div className="mt-8 flex items-center justify-between">
            <Button
              variant="ghost"
              onClick={back}
              disabled={step === 0 || saving}
              className="gap-1.5"
            >
              <ArrowLeft className="size-4" />
              Back
            </Button>
            <Button onClick={next} disabled={!value.trim() || saving} className="gap-1.5">
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
            </Button>
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          You can change any of this later in Settings.
        </p>
      </div>
    </main>
  );
}
