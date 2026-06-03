"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowUp,
  ChevronDown,
  Lightbulb,
  Shapes,
  Sparkles,
  X,
} from "lucide-react";
import type { KeyConcept } from "@/lib/types";
import { cn } from "@/lib/utils";
import { AiGlow } from "@/components/ui/ai-glow";

type Mode = "simple" | "analogy" | "why";

const ACTIONS: {
  mode: Mode;
  label: string;
  icon: typeof Sparkles;
  prompt: (term: string) => string;
}[] = [
  {
    mode: "simple",
    label: "Explain simply",
    icon: Sparkles,
    prompt: (t) =>
      `Explain "${t}" as simply as possible, in plain language a first-year student would understand.`,
  },
  {
    mode: "analogy",
    label: "Give me an analogy",
    icon: Shapes,
    prompt: (t) =>
      `Give a single vivid, memorable analogy that explains "${t}". Start with "Think of it like…".`,
  },
  {
    mode: "why",
    label: "Why does this matter?",
    icon: Lightbulb,
    prompt: (t) =>
      `Explain why "${t}" matters — its significance, where it's used, and why a student should care.`,
  },
];

// Spring used across every card interaction for a consistent, slightly bouncy feel.
const SPRING = { type: "spring" as const, stiffness: 320, damping: 26 };

interface Turn {
  id: number;
  label: string;
  question: string;
  answer: string;
  streaming: boolean;
  open: boolean;
}

/**
 * Grid of key-concept cards with iOS-haptic-style depth (§3). Selecting a card
 * pops it toward the viewer while the others recede, and reveals its AI panel.
 */
export function KeyConceptsGrid({
  concepts,
  context,
}: {
  concepts: KeyConcept[];
  context?: string;
}) {
  const [selected, setSelected] = useState<number | null>(null);

  return (
    <>
      {/* Tap-outside backdrop to dismiss the popped card. */}
      <AnimatePresence>
        {selected !== null && (
          <motion.button
            type="button"
            aria-label="Dismiss"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelected(null)}
            className="fixed inset-0 z-30 cursor-default bg-background/40 backdrop-blur-[2px]"
          />
        )}
      </AnimatePresence>

      <div className="grid gap-4 sm:grid-cols-2">
        {concepts.map((concept, i) => (
          <ConceptCard
            key={i}
            concept={concept}
            context={context}
            selected={selected === i}
            dimmed={selected !== null && selected !== i}
            onSelect={() => setSelected(i)}
            onDismiss={() => setSelected(null)}
          />
        ))}
      </div>
    </>
  );
}

const HOVER_GLOW =
  "radial-gradient(60% 60% at 30% 20%, #6C63FF55, transparent 70%), radial-gradient(55% 55% at 80% 30%, #4FC3F744, transparent 70%), radial-gradient(55% 60% at 50% 95%, #FFB34744, transparent 70%), radial-gradient(50% 50% at 75% 80%, #B39DDB44, transparent 70%)";

function ConceptCard({
  concept,
  context,
  selected,
  dimmed,
  onSelect,
  onDismiss,
}: {
  concept: KeyConcept;
  context?: string;
  selected: boolean;
  dimmed: boolean;
  onSelect: () => void;
  onDismiss: () => void;
}) {
  const [turns, setTurns] = useState<Turn[]>([]);
  const turnsRef = useRef<Turn[]>([]);
  turnsRef.current = turns;
  const idRef = useRef(0);
  const abortRef = useRef<AbortController | null>(null);

  const thinking = turns.some((t) => t.streaming);

  // Reset the conversation whenever the card is dismissed.
  useEffect(() => {
    if (!selected) {
      abortRef.current?.abort();
      setTurns([]);
    }
  }, [selected]);

  // Escape closes the popped card.
  useEffect(() => {
    if (!selected) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onDismiss();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selected, onDismiss]);

  async function ask(question: string, label: string) {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    const id = ++idRef.current;

    const history = turnsRef.current.flatMap((t) => [
      { role: "user" as const, content: t.question },
      { role: "assistant" as const, content: t.answer },
    ]);

    // Collapse prior turns, append the new (streaming) one.
    setTurns((prev) => [
      ...prev.map((t) => ({ ...t, open: false })),
      { id, label, question, answer: "", streaming: true, open: true },
    ]);

    try {
      const res = await fetch("/api/concepts/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          term: concept.term,
          definition: concept.definition,
          context,
          messages: [...history, { role: "user", content: question }],
        }),
        signal: controller.signal,
      });
      if (!res.ok || !res.body) throw new Error();
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        const text = decoder.decode(value, { stream: true });
        setTurns((prev) =>
          prev.map((t) => (t.id === id ? { ...t, answer: t.answer + text } : t))
        );
      }
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        setTurns((prev) =>
          prev.map((t) =>
            t.id === id
              ? {
                  ...t,
                  answer:
                    t.answer || "Couldn't load a response right now. Please try again.",
                }
              : t
          )
        );
      }
    } finally {
      setTurns((prev) =>
        prev.map((t) => (t.id === id ? { ...t, streaming: false } : t))
      );
    }
  }

  const toggleTurn = (id: number) =>
    setTurns((prev) =>
      prev.map((t) => (t.id === id ? { ...t, open: !t.open } : t))
    );

  return (
    <div
      className="relative"
      // Lift the whole card above the dismiss backdrop while popped, and give it
      // perspective so the overlay can translate toward the viewer in 3D.
      style={{ perspective: 1400, zIndex: selected ? 50 : undefined }}
    >
      {/* Base card — holds grid space; recedes when a sibling is selected. */}
      <motion.button
        type="button"
        onClick={onSelect}
        animate={{
          scale: dimmed ? 0.97 : 1,
          opacity: dimmed ? 0.55 : 1,
        }}
        whileHover={dimmed || selected ? undefined : { y: -4, scale: 1.015 }}
        transition={SPRING}
        className="group concept-card-shell relative block w-full rounded-2xl border bg-card p-5 text-left"
        style={{ visibility: selected ? "hidden" : "visible" }}
      >
        {/* Faint hover glow bloom (opacity-only — cheap). */}
        <span
          aria-hidden
          className="pointer-events-none absolute -inset-4 -z-10 opacity-0 blur-2xl transition-opacity duration-500 group-hover:opacity-60"
          style={{ background: HOVER_GLOW }}
        />
        <div className="flex items-start justify-between gap-2">
          <span className="font-semibold tracking-tight">{concept.term}</span>
          <Sparkles className="size-4 shrink-0 text-muted-foreground opacity-0 transition group-hover:text-primary group-hover:opacity-100" />
        </div>
        <p className="mt-1.5 text-pretty text-sm leading-relaxed text-muted-foreground">
          {concept.definition}
        </p>
      </motion.button>

      {/* Popped / selected overlay: comes toward the viewer in 3D and hosts the
          fluid AI panel + conversation. Absolutely positioned so it never
          reflows the grid, and free to grow with content (§3). */}
      <AnimatePresence>
        {selected && (
          <motion.div
            initial={{ opacity: 0, scale: 0.92, z: 0, y: 6 }}
            animate={{ opacity: 1, scale: 1.04, z: 24, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, z: 0, y: 6 }}
            transition={SPRING}
            className="absolute inset-x-0 top-0 z-40 origin-top"
          >
            <div className="relative max-h-[72vh] overflow-y-auto overflow-x-hidden rounded-2xl border border-primary/30 bg-card/95 shadow-2xl ring-luxe backdrop-blur-xl">
              {/* Underlying AI glow — idle at rest, active while thinking. */}
              <AiGlow
                mode={thinking ? "active" : "idle"}
                blur={44}
                className={cn(
                  "transition-opacity duration-500",
                  thinking ? "opacity-60" : "opacity-25"
                )}
              />

              <div className="relative p-5">
                <div className="flex items-start justify-between gap-2">
                  <span className="flex items-center gap-2 font-semibold tracking-tight">
                    <Sparkles className="size-4 text-primary" />
                    {concept.term}
                  </span>
                  <button
                    type="button"
                    onClick={onDismiss}
                    aria-label="Close"
                    className="grid size-7 shrink-0 place-items-center rounded-lg text-muted-foreground transition hover:bg-accent hover:text-foreground"
                  >
                    <X className="size-4" />
                  </button>
                </div>
                <p className="mt-1.5 text-pretty text-sm leading-relaxed text-muted-foreground">
                  {concept.definition}
                </p>

                {/* Options (only before a conversation starts), staggered in. */}
                <AnimatePresence initial={false}>
                  {turns.length === 0 && (
                    <motion.div
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, height: 0 }}
                      className="mt-4 grid gap-2"
                    >
                      {ACTIONS.map((a, idx) => (
                        <motion.button
                          key={a.mode}
                          type="button"
                          initial={{ opacity: 0, y: 8, scale: 0.96 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          transition={{ ...SPRING, delay: 0.05 + idx * 0.07 }}
                          onClick={() => ask(a.prompt(concept.term), a.label)}
                          className="flex items-center gap-2.5 rounded-xl border bg-background/50 px-3 py-2.5 text-left text-sm transition hover:border-primary/40 hover:bg-accent"
                        >
                          <a.icon className="size-4 text-primary" />
                          {a.label}
                        </motion.button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Conversation */}
                <div className="mt-4 space-y-3">
                  <AnimatePresence initial={false}>
                    {turns.map((turn) => (
                      <motion.div
                        key={turn.id}
                        layout
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        transition={SPRING}
                        className="rounded-xl border bg-background/40"
                      >
                        <button
                          type="button"
                          onClick={() => toggleTurn(turn.id)}
                          className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left"
                        >
                          <span className="line-clamp-1 text-xs font-medium text-foreground/80">
                            {turn.label}
                          </span>
                          <motion.span
                            animate={{ rotate: turn.open ? 0 : -90 }}
                            transition={SPRING}
                            className="text-muted-foreground"
                          >
                            <ChevronDown className="size-4" />
                          </motion.span>
                        </button>
                        <AnimatePresence initial={false}>
                          {turn.open && (
                            <motion.div
                              key="body"
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: "auto", opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={SPRING}
                              className="overflow-hidden"
                            >
                              <div className="px-3 pb-3 text-pretty text-sm leading-relaxed text-foreground/90">
                                {turn.answer}
                                {turn.streaming && <StreamingCaret />}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>

                {/* Chat input — the 4th element / follow-up box (§2). */}
                <ChatInput
                  onSubmit={(q) => ask(q, q)}
                  busy={thinking}
                  placeholder={
                    turns.length === 0
                      ? "Ask anything about this…"
                      : "Ask a follow-up…"
                  }
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/** Blinking caret shown while a response streams in. */
function StreamingCaret() {
  return (
    <motion.span
      aria-hidden
      animate={{ opacity: [1, 0.2, 1] }}
      transition={{ duration: 1, repeat: Infinity, ease: "easeInOut" }}
      className="ml-0.5 inline-block h-[1.1em] w-[2px] translate-y-[2px] rounded-full bg-primary align-baseline"
    />
  );
}

/** Rounded capsule input with a circular up-arrow submit, soft AI focus glow. */
function ChatInput({
  onSubmit,
  busy,
  placeholder,
}: {
  onSubmit: (value: string) => void;
  busy: boolean;
  placeholder: string;
}) {
  const [value, setValue] = useState("");

  function submit() {
    const v = value.trim();
    if (!v || busy) return;
    onSubmit(v);
    setValue("");
  }

  return (
    <div className="group relative mt-4">
      {/* Soft palette glow that blooms on focus (opacity-only). */}
      <span
        aria-hidden
        className="pointer-events-none absolute -inset-1 rounded-full opacity-0 blur-md transition-opacity duration-300 group-focus-within:opacity-70"
        style={{ background: HOVER_GLOW }}
      />
      <div className="relative flex items-center rounded-full border bg-background/70 pl-4 pr-1 transition group-focus-within:border-primary/50">
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              submit();
            }
          }}
          placeholder={placeholder}
          className="h-11 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
        />
        <button
          type="button"
          onClick={submit}
          disabled={!value.trim() || busy}
          aria-label="Send"
          className="grid size-9 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground transition enabled:hover:scale-105 disabled:opacity-40"
        >
          <ArrowUp className="size-4" />
        </button>
      </div>
    </div>
  );
}
