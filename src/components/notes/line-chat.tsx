"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowUp,
  ChevronDown,
  Lightbulb,
  Plus,
  Quote,
  Sparkles,
  Telescope,
  X,
} from "lucide-react";
import { GLASS_LIGHT } from "@/components/app/glass";
import { cn } from "@/lib/utils";
import { MathText } from "./math-text";

/** Spring shared with the key-concept cards for a consistent, lightly bouncy feel. */
const SPRING = { type: "spring" as const, stiffness: 320, damping: 26 };

const POPUP_WIDTH = 360;
const GAP = 12;

type SourceStatus = "lecture" | "edited" | "research";

// ── shared context ──────────────────────────────────────────────────────────
// NoteView provides note-level context + the "Add to note" handler so deeply
// nested askable blocks don't need it drilled through the recursive renderer.

interface LineChatValue {
  noteTitle?: string;
  subject?: string;
  summary?: string;
  /** Whether the note has a rich-text body that AI bullets can be spliced into. */
  canAddToNote: boolean;
  /**
   * Regenerate `lineText` in the note body, folding in the `deeper` answer, and
   * persist. `sourceExcerpt` gives the rewrite the line's lecture source.
   */
  onAddToNote: (lineText: string, deeper: string, sourceExcerpt?: string) => void;
}

const LineChatContext = createContext<LineChatValue | null>(null);

export function LineChatProvider({
  value,
  children,
}: {
  value: LineChatValue;
  children: React.ReactNode;
}) {
  return (
    <LineChatContext.Provider value={value}>{children}</LineChatContext.Provider>
  );
}

// ── askable block ─────────────────────────────────────────────────────────────

/**
 * Wraps the inline content of a note block (list item, paragraph, or heading)
 * and reveals a small ✨ "Ask Atlas" button at its end on hover/focus. Clicking
 * it opens a side-anchored {@link LineChatPopup} scoped to that line. The button
 * is a separate trigger from the 800ms hover-source bubble, so both coexist.
 */
export function AskableBlock({
  text,
  sourceExcerpt,
  sourceStatus = "lecture",
  children,
}: {
  text: string;
  sourceExcerpt?: string;
  sourceStatus?: SourceStatus;
  children: React.ReactNode;
}) {
  const ctx = useContext(LineChatContext);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);

  if (!ctx || !text.trim()) return <>{children}</>;

  return (
    <span ref={ref} className="group/ask relative">
      {children}
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Ask Atlas about this line"
        className="ml-1.5 inline-flex size-5 translate-y-[2px] items-center justify-center rounded-full border border-black/[0.12] bg-white text-[#0d0d0d]/70 opacity-0 transition hover:-translate-y-px hover:border-black/30 hover:text-[#0d0d0d] focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/25 group-hover/ask:opacity-100 motion-reduce:transition-none"
      >
        <Sparkles className="size-3" />
      </button>
      <AnimatePresence>
        {open && (
          <LineChatPopup
            anchorRef={ref}
            line={text}
            sourceExcerpt={sourceExcerpt}
            sourceStatus={sourceStatus}
            ctx={ctx}
            onClose={() => setOpen(false)}
          />
        )}
      </AnimatePresence>
    </span>
  );
}

// ── popup ─────────────────────────────────────────────────────────────────────

interface Turn {
  id: number;
  label: string;
  question: string;
  answer: string;
  streaming: boolean;
  open: boolean;
  /** True for "Go deeper" turns — these expose the "Add to note" action. */
  deeper: boolean;
}

const PRESETS: {
  key: string;
  label: string;
  icon: typeof Sparkles;
  deeper: boolean;
  prompt: (line: string) => string;
}[] = [
  {
    key: "clarify",
    label: "Clarify / explain this",
    icon: Sparkles,
    deeper: false,
    prompt: (l) =>
      `Explain this note line in plain, simple language a first-year student would understand: "${l}".`,
  },
  {
    key: "why",
    label: "Why does this matter",
    icon: Lightbulb,
    deeper: false,
    prompt: (l) =>
      `Explain why this note line matters — its significance, where it's used, and why it's worth knowing: "${l}".`,
  },
  {
    key: "deeper",
    label: "Go deeper",
    icon: Telescope,
    deeper: true,
    prompt: (l) =>
      `Go deeper on this note line: "${l}". Add detail, nuance, and context beyond what the line already says, while staying tightly on this exact topic.`,
  },
];

type Pos = {
  top: number;
  left: number;
  maxHeight: number;
  side: "left" | "right" | "center";
};

function LineChatPopup({
  anchorRef,
  line,
  sourceExcerpt,
  sourceStatus,
  ctx,
  onClose,
}: {
  anchorRef: React.RefObject<HTMLSpanElement | null>;
  line: string;
  sourceExcerpt?: string;
  sourceStatus: SourceStatus;
  ctx: LineChatValue;
  onClose: () => void;
}) {
  const [turns, setTurns] = useState<Turn[]>([]);
  const turnsRef = useRef<Turn[]>([]);
  const idRef = useRef(0);
  const abortRef = useRef<AbortController | null>(null);
  const [pos, setPos] = useState<Pos | null>(null);

  const thinking = turns.some((t) => t.streaming);

  useEffect(() => {
    turnsRef.current = turns;
  }, [turns]);

  useEffect(() => () => abortRef.current?.abort(), []);

  // Esc dismisses.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  // Anchor the popup beside the line, on whichever side has more room; recompute
  // on scroll/resize so it stays glued to the line.
  useLayoutEffect(() => {
    const place = () => {
      const el = anchorRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const roomRight = vw - r.right;
      const roomLeft = r.left;
      const fitsRight = roomRight >= POPUP_WIDTH + GAP * 2;
      const fitsLeft = roomLeft >= POPUP_WIDTH + GAP * 2;

      let side: Pos["side"];
      let left: number;
      if (fitsRight && roomRight >= roomLeft) {
        side = "right";
        left = r.right + GAP;
      } else if (fitsLeft) {
        side = "left";
        left = r.left - GAP - POPUP_WIDTH;
      } else {
        // Narrow viewport: center horizontally under the line.
        side = "center";
        left = Math.max(GAP, (vw - Math.min(POPUP_WIDTH, vw - GAP * 2)) / 2);
      }

      const top = Math.max(GAP, Math.min(r.top, vh - 120));
      const maxHeight = vh - top - GAP;
      setPos({ top, left, maxHeight, side });
    };

    place();
    window.addEventListener("scroll", place, true);
    window.addEventListener("resize", place);
    return () => {
      window.removeEventListener("scroll", place, true);
      window.removeEventListener("resize", place);
    };
  }, [anchorRef]);

  const ask = useCallback(
    async (question: string, label: string, deeper: boolean) => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      const id = ++idRef.current;

      const history = turnsRef.current.flatMap((t) => [
        { role: "user" as const, content: t.question },
        { role: "assistant" as const, content: t.answer },
      ]);

      setTurns((prev) => [
        ...prev.map((t) => ({ ...t, open: false })),
        { id, label, question, answer: "", streaming: true, open: true, deeper },
      ]);

      try {
        const res = await fetch("/api/lines/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            line,
            noteTitle: ctx.noteTitle,
            subject: ctx.subject,
            summary: ctx.summary,
            sourceExcerpt,
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
                      t.answer ||
                      "Couldn't load a response right now. Please try again.",
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
    },
    [line, sourceExcerpt, ctx]
  );

  const toggleTurn = (id: number) =>
    setTurns((prev) =>
      prev.map((t) => (t.id === id ? { ...t, open: !t.open } : t))
    );

  function addToNote(text: string) {
    ctx.onAddToNote(line, text, sourceExcerpt);
    onClose();
  }

  const sourceLabel =
    sourceStatus === "research" ? "Researched online" : "From the lecture";

  if (typeof document === "undefined" || !pos) return null;

  return createPortal(
    <>
      {/* Tap-outside backdrop. */}
      <motion.button
        type="button"
        aria-label="Dismiss"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 z-40 cursor-default bg-[#f4f3f1]/45 backdrop-blur-[2px]"
      />

      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 6 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 6 }}
        transition={SPRING}
        style={{
          position: "fixed",
          top: pos.top,
          left: pos.left,
          width: Math.min(POPUP_WIDTH, window.innerWidth - GAP * 2),
          zIndex: 50,
        }}
      >
        <div
          className={cn(
            "ai-ring relative rounded-2xl",
            GLASS_LIGHT,
            thinking && "ai-ring--active"
          )}
        >
          <div
            className="relative overflow-y-auto overflow-x-hidden rounded-2xl p-4"
            style={{ maxHeight: pos.maxHeight }}
          >
            {/* Header: the line + its provenance. */}
            <div className="flex items-start justify-between gap-2">
              <span className="flex items-center gap-2 text-sm font-medium tracking-tight text-[#0d0d0d]">
                <Sparkles className="size-4 shrink-0 text-[#0d0d0d]/70" />
                Ask about this line
              </span>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="grid size-7 shrink-0 place-items-center rounded-full text-[#0d0d0d]/55 outline-none transition hover:bg-black/[0.05] hover:text-[#0d0d0d] focus-visible:ring-2 focus-visible:ring-black/25"
              >
                <X className="size-4" />
              </button>
            </div>
            <p className="mt-2 text-pretty text-sm leading-relaxed text-[#0d0d0d]/85">
              “{line}”
            </p>
            {sourceExcerpt && (
              <p className="mt-2 flex gap-1.5 text-pretty text-xs leading-relaxed text-[#0d0d0d]/55">
                <Quote className="mt-0.5 size-3 shrink-0 text-[#0d0d0d]/50" />
                <span>
                  <span className="font-medium text-[#0d0d0d]/70">
                    {sourceLabel}:
                  </span>{" "}
                  <span className="italic">{sourceExcerpt}</span>
                </span>
              </p>
            )}

            {/* Presets (before a conversation starts). */}
            <AnimatePresence initial={false}>
              {turns.length === 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mt-4 grid gap-2"
                >
                  {PRESETS.map((p, idx) => (
                    <motion.button
                      key={p.key}
                      type="button"
                      initial={{ opacity: 0, y: 8, scale: 0.96 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      transition={{ ...SPRING, delay: 0.05 + idx * 0.07 }}
                      onClick={() => ask(p.prompt(line), p.label, p.deeper)}
                      className="flex items-center gap-2.5 rounded-2xl border border-black/[0.1] bg-white/70 px-3 py-2.5 text-left text-sm text-[#0d0d0d] outline-none transition hover:-translate-y-0.5 hover:border-black/25 hover:bg-white focus-visible:ring-2 focus-visible:ring-black/25"
                    >
                      <p.icon className="size-4 text-[#0d0d0d]/70" />
                      {p.label}
                    </motion.button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Conversation. */}
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
                          {/* "Add to note" — only on a completed Go-deeper turn,
                              and only when the note has a rich-text body. */}
                          {turn.deeper &&
                            !turn.streaming &&
                            turn.answer.trim() &&
                            ctx.canAddToNote && (
                              <div className="px-3 pb-3">
                                <button
                                  type="button"
                                  onClick={() => addToNote(turn.answer)}
                                  className="inline-flex items-center gap-1.5 rounded-full border border-violet-500/40 bg-violet-500/10 px-3 py-1.5 text-xs font-medium text-violet-700 outline-none transition hover:-translate-y-px hover:bg-violet-500/20 focus-visible:ring-2 focus-visible:ring-black/25"
                                >
                                  <Plus className="size-3.5" />
                                  Add to note
                                </button>
                              </div>
                            )}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>

            <ChatInput
              onSubmit={(q) => ask(q, q, false)}
              busy={thinking}
              placeholder={
                turns.length === 0 ? "Ask anything about this line…" : "Ask a follow-up…"
              }
            />
          </div>
        </div>
      </motion.div>
    </>,
    document.body
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
    <div className="relative mt-4 flex items-center rounded-full border border-black/[0.12] bg-white pl-4 pr-1 transition focus-within:border-black/30">
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
        className="h-10 flex-1 bg-transparent text-sm text-[#0d0d0d] outline-none placeholder:text-[#0d0d0d]/40"
      />
      <button
        type="button"
        onClick={submit}
        disabled={!value.trim() || busy}
        aria-label="Send"
        className="grid size-8 shrink-0 place-items-center rounded-full bg-[#0d0d0d] text-white outline-none transition focus-visible:ring-2 focus-visible:ring-black/25 enabled:hover:-translate-y-0.5 enabled:hover:scale-105 disabled:opacity-40"
      >
        <ArrowUp className="size-4" />
      </button>
    </div>
  );
}
