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
import { AiGlow } from "@/components/ui/ai-glow";
import { MathText } from "./math-text";
import { GLASS_LIGHT } from "@/components/app/glass";
import { cn } from "@/lib/utils";

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
            className="fixed inset-0 z-30 cursor-default bg-[#f4f3f1]/45 backdrop-blur-[2px]"
          />
        )}
      </AnimatePresence>

      <div className="grid gap-4 sm:grid-cols-2">
        {concepts.map((concept, i) => (
          <ConceptCard
            key={`${i}-${selected === i ? "selected" : "base"}`}
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
  const idRef = useRef(0);
  const abortRef = useRef<AbortController | null>(null);

  const thinking = turns.some((t) => t.streaming);

  useEffect(() => {
    turnsRef.current = turns;
  }, [turns]);

  useEffect(() => {
    return () => abortRef.current?.abort();
  }, []);

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
        // No backdrop-blur on the grid cards: a whole grid of blur layers
        // re-samples on every scroll frame. Translucent fill + specular keeps
        // the glassy read; the popped overlay carries the real blur.
        className="group relative block w-full rounded-2xl border border-white/60 bg-white/75 p-5 text-left shadow-[inset_0_1px_0_rgba(255,255,255,0.75),0_1px_2px_rgba(13,13,13,0.04),0_18px_44px_-30px_rgba(13,13,13,0.3)] ring-1 ring-black/[0.07] transition-[box-shadow] duration-300 ease-out hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.75),0_2px_4px_rgba(13,13,13,0.05),0_24px_60px_-30px_rgba(13,13,13,0.4)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/25 focus-visible:ring-offset-2"
        style={{ visibility: selected ? "hidden" : "visible" }}
      >
        <div className="flex items-start justify-between gap-2">
          <span className="font-medium tracking-tight text-[#0d0d0d]">{concept.term}</span>
          <Sparkles className="size-4 shrink-0 text-[#0d0d0d]/45 opacity-0 transition group-hover:text-[#0d0d0d]/70 group-hover:opacity-100" />
        </div>
        <p className="mt-1.5 text-pretty text-sm leading-relaxed text-[#0d0d0d]/55">
          <MathText text={concept.definition} />
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
            {/* AI panel — signed by the fluid edge ring; brighter while thinking.
                The glow shell never scrolls (so the outer bloom isn't clipped);
                the inner wrapper carries the scroll. While thinking, the brand
                aurora bleeds through the frosted panel from behind. */}
            <AnimatePresence>
              {thinking && (
                <motion.div
                  aria-hidden
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                  className="absolute -inset-8 -z-10 overflow-hidden rounded-[2.5rem]"
                >
                  <AiGlow mode="active" density="standard" blur={48} />
                </motion.div>
              )}
            </AnimatePresence>
            <div
              className={cn(
                "ai-ring relative rounded-2xl",
                GLASS_LIGHT,
                thinking && "ai-ring--active"
              )}
            >
              <div className="relative max-h-[72vh] overflow-y-auto overflow-x-hidden rounded-2xl p-5">
                <div className="flex items-start justify-between gap-2">
                  <span className="flex items-center gap-2 font-medium tracking-tight text-[#0d0d0d]">
                    <Sparkles className="size-4 text-[#0d0d0d]/70" />
                    {concept.term}
                  </span>
                  <button
                    type="button"
                    onClick={onDismiss}
                    aria-label="Close"
                    className="grid size-7 shrink-0 place-items-center rounded-full text-[#0d0d0d]/55 outline-none transition hover:bg-black/[0.05] hover:text-[#0d0d0d] focus-visible:ring-2 focus-visible:ring-black/25"
                  >
                    <X className="size-4" />
                  </button>
                </div>
                <p className="mt-1.5 text-pretty text-sm leading-relaxed text-[#0d0d0d]/55">
                  <MathText text={concept.definition} />
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
                          className="flex items-center gap-2.5 rounded-2xl border border-black/[0.1] bg-white/70 px-3 py-2.5 text-left text-sm text-[#0d0d0d] outline-none transition hover:-translate-y-0.5 hover:border-black/25 hover:bg-white focus-visible:ring-2 focus-visible:ring-black/25"
                        >
                          <a.icon className="size-4 text-[#0d0d0d]/70" />
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
                        className="rounded-2xl border border-black/[0.1] bg-white/70"
                      >
                        <button
                          type="button"
                          onClick={() => toggleTurn(turn.id)}
                          className="flex w-full items-center justify-between gap-2 rounded-2xl px-3 py-2 text-left outline-none focus-visible:ring-2 focus-visible:ring-black/25"
                        >
                          <span className="line-clamp-1 text-xs font-medium text-[#0d0d0d]/75">
                            {turn.label}
                          </span>
                          <motion.span
                            animate={{ rotate: turn.open ? 0 : -90 }}
                            transition={SPRING}
                            className="text-[#0d0d0d]/55"
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
                              <div className="px-3 pb-3 text-pretty text-sm leading-relaxed text-[#0d0d0d]/80">
                                <MathText text={turn.answer} />
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
      className="ml-0.5 inline-block h-[1.1em] w-[2px] translate-y-[2px] rounded-full bg-[#0d0d0d]/70 align-baseline"
    />
  );
}

/** Pill input with a compact up-arrow submit. */
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
      <div className="relative flex items-center rounded-full border border-black/[0.12] bg-white pl-4 pr-1 transition group-focus-within:border-black/30">
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
          className="h-11 flex-1 bg-transparent text-sm text-[#0d0d0d] outline-none placeholder:text-[#0d0d0d]/40"
        />
        <button
          type="button"
          onClick={submit}
          disabled={!value.trim() || busy}
          aria-label="Send"
          className="grid size-9 shrink-0 place-items-center rounded-full bg-[#0d0d0d] text-white outline-none transition focus-visible:ring-2 focus-visible:ring-black/25 enabled:hover:-translate-y-0.5 enabled:hover:scale-105 disabled:opacity-40"
        >
          <ArrowUp className="size-4" />
        </button>
      </div>
    </div>
  );
}
