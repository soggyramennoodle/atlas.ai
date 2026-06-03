"use client";

import { useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Lightbulb, Loader2, Shapes, Sparkles, X } from "lucide-react";
import type { KeyConcept } from "@/lib/types";

type Mode = "simple" | "analogy" | "why";

const ACTIONS: { mode: Mode; label: string; icon: typeof Sparkles }[] = [
  { mode: "simple", label: "Explain simply", icon: Sparkles },
  { mode: "analogy", label: "Give me an analogy", icon: Shapes },
  { mode: "why", label: "Why does this matter?", icon: Lightbulb },
];

/**
 * A clickable key-concept card (§9). Clicking opens a popout menu; choosing an
 * option streams a Gemini explanation into a bubble on whichever side has more
 * space. All Gemini access is via the authenticated /api/concepts/explain route.
 */
export function ConceptCard({
  concept,
  context,
}: {
  concept: KeyConcept;
  context?: string;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [side, setSide] = useState<"left" | "right">("right");
  const [activeMode, setActiveMode] = useState<Mode | null>(null);
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  function pickSide() {
    const rect = ref.current?.getBoundingClientRect();
    if (rect) {
      setSide(rect.left > window.innerWidth - rect.right ? "left" : "right");
    }
  }

  function openMenu() {
    pickSide();
    setMenuOpen((o) => !o);
  }

  async function run(mode: Mode) {
    setMenuOpen(false);
    setActiveMode(mode);
    setAnswer("");
    setLoading(true);
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch("/api/concepts/explain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          term: concept.term,
          definition: concept.definition,
          mode,
          context,
        }),
        signal: controller.signal,
      });
      if (!res.ok || !res.body) throw new Error();

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        setAnswer((prev) => prev + decoder.decode(value, { stream: true }));
        setLoading(false);
      }
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        setAnswer("Couldn't load an explanation right now. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  }

  function close() {
    abortRef.current?.abort();
    setActiveMode(null);
    setAnswer("");
    setLoading(false);
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={openMenu}
        className="group w-full rounded-2xl border bg-card p-5 text-left transition hover:border-primary/40 hover:bg-accent/20"
      >
        <div className="flex items-start justify-between gap-2">
          <span className="font-semibold tracking-tight">{concept.term}</span>
          <Sparkles className="size-4 shrink-0 text-muted-foreground opacity-0 transition group-hover:opacity-100 group-hover:text-primary" />
        </div>
        <p className="mt-1.5 text-pretty text-sm leading-relaxed text-muted-foreground">
          {concept.definition}
        </p>
      </button>

      {/* Action popout menu */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.96 }}
            transition={{ duration: 0.16 }}
            className="absolute left-3 top-3 z-30 w-56 overflow-hidden rounded-2xl border bg-popover p-1.5 shadow-2xl ring-luxe"
          >
            {ACTIONS.map((a) => (
              <button
                key={a.mode}
                onClick={() => run(a.mode)}
                className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-sm transition hover:bg-accent"
              >
                <a.icon className="size-4 text-primary" />
                {a.label}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Streamed answer bubble */}
      <AnimatePresence>
        {activeMode && (
          <motion.div
            initial={{ opacity: 0, scale: 0.94, x: side === "right" ? -8 : 8 }}
            animate={{ opacity: 1, scale: 1, x: 0 }}
            exit={{ opacity: 0, scale: 0.94 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className={`absolute top-0 z-30 w-80 max-w-[85vw] rounded-2xl border bg-popover p-4 shadow-2xl ring-luxe ${
              side === "right"
                ? "left-full ml-3"
                : "right-full mr-3"
            } max-lg:left-0 max-lg:right-0 max-lg:top-full max-lg:ml-0 max-lg:mr-0 max-lg:mt-3 max-lg:w-full`}
          >
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 font-mono text-[0.65rem] uppercase tracking-wider text-primary">
                <Sparkles className="size-3" />
                {ACTIONS.find((a) => a.mode === activeMode)?.label}
              </span>
              <button
                onClick={close}
                aria-label="Close"
                className="grid size-6 place-items-center rounded-lg text-muted-foreground transition hover:bg-accent hover:text-foreground"
              >
                <X className="size-3.5" />
              </button>
            </div>
            <div className="mt-2 min-h-12 text-pretty text-sm leading-relaxed text-foreground/90">
              {answer}
              {loading && (
                <Loader2 className="ml-1 inline size-3.5 animate-spin text-primary" />
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
