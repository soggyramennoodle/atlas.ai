"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { UI_TOUR_STEPS } from "@/lib/ui-tour-steps";
import { SpotlightOverlay } from "@/components/onboarding/spotlight-overlay";

export function UiTour({
  active,
  onMobileSidebarOpen,
}: {
  active: boolean;
  onMobileSidebarOpen?: (open: boolean) => void;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [stepIndex, setStepIndex] = useState(0);
  const [ready, setReady] = useState(false);
  const [finishing, setFinishing] = useState(false);

  const step = UI_TOUR_STEPS[stepIndex];
  const isLast = stepIndex === UI_TOUR_STEPS.length - 1;

  useEffect(() => {
    if (!active || finishing) return;
    const current = UI_TOUR_STEPS[stepIndex];
    if (!current) return;

    if (current.sidebar) {
      onMobileSidebarOpen?.(true);
    }

    if (current.route && pathname !== current.route) {
      setReady(false);
      router.push(current.route);
      return;
    }

    setReady(false);
    const delay = current.sidebar ? 420 : 280;
    const t = window.setTimeout(() => setReady(true), delay);
    return () => window.clearTimeout(t);
  }, [active, finishing, stepIndex, pathname, router, onMobileSidebarOpen]);

  async function complete() {
    setFinishing(true);
    onMobileSidebarOpen?.(false);
    try {
      await fetch("/api/profile/ui-tour", { method: "POST" });
      router.refresh();
    } catch {
      // Dismiss locally even if persistence fails.
    }
  }

  function handleNext() {
    if (isLast) {
      void complete();
      return;
    }
    setStepIndex((i) => i + 1);
  }

  function handleSkip() {
    void complete();
  }

  if (!active || finishing || !step || !ready) return null;

  return (
    <SpotlightOverlay
      target={step.target}
      title={step.title}
      body={step.body}
      stepIndex={stepIndex}
      totalSteps={UI_TOUR_STEPS.length}
      placement={step.placement}
      onNext={handleNext}
      onSkip={handleSkip}
      isLast={isLast}
    />
  );
}
