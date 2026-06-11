"use client";

import {
  forwardRef,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { AnimatePresence, motion, useInView } from "framer-motion";
import { ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { AtlasMark } from "@/components/logo";

/* PLACEHOLDER ASSETS — swap for final Atlas media before launch. */
const BACK_3_1 =
  "https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?auto=format&fit=crop&w=900&q=75"; // dark moody
const BACK_3_2 =
  "https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&w=900&q=75"; // green-leaning
const BACK_3_3 =
  "https://images.unsplash.com/photo-1434030216411-0b793f4b4173?auto=format&fit=crop&w=900&q=75"; // textured

const EASE = [0.22, 1, 0.36, 1] as const;

const QUESTIONS = [
  {
    q: "What were the key points from today's lecture?",
    a: "Today's Biology lecture covered three core ideas: the structure of the cell membrane, passive vs. active transport, and the role of ATP. I've saved a full breakdown with definitions and a 4-line summary to your notes.",
  },
  {
    q: "Quiz me on the French Revolution.",
    a: "Sure — what year was the storming of the Bastille, and what did it symbolize? (Reveal: 1789, the start of the Revolution and the fall of royal authority.) I can generate 8 more questions straight from your History notes.",
  },
  {
    q: "Summarize chapter 4 in three bullets.",
    a: "Chapter 4 in brief: (1) supply and demand set the equilibrium price, (2) elasticity measures how quantity responds to price changes, (3) surplus and shortage occur when price is held away from equilibrium. Full notes saved.",
  },
];

/** Shared bottom title/description block, aligned across all three cards. */
function CardCaption({ title, body }: { title: string; body: string }) {
  return (
    <div className="absolute z-[2]" style={{ bottom: 28, left: 24, right: 24 }}>
      <h3
        className="font-instrument italic"
        style={{ fontSize: 26, fontWeight: 400, color: "#fff", marginBottom: 8 }}
      >
        {title}
      </h3>
      <p
        className="font-heading"
        style={{
          fontSize: 13,
          color: "rgba(255,255,255,0.65)",
          lineHeight: 1.6,
          margin: 0,
        }}
      >
        {body}
      </p>
    </div>
  );
}

export function AiIntelligence({ ctaHref }: { ctaHref: string }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });
  const [qIdx, setQIdx] = useState(0);

  useEffect(() => {
    const id = setInterval(
      () => setQIdx((i) => (i + 1) % QUESTIONS.length),
      4000,
    );
    return () => clearInterval(id);
  }, []);

  const cardBase: React.CSSProperties = {
    minHeight: 560,
    borderRadius: 24,
    overflow: "hidden",
    position: "relative",
  };

  return (
    <section
      id="ai"
      className="overflow-hidden scroll-mt-20"
      style={{ background: "#000", padding: "80px 24px" }}
    >
      {/* Header */}
      <div ref={ref} style={{ textAlign: "center", marginBottom: 64 }}>
        <p
          className="font-heading"
          style={{
            fontSize: 12,
            fontWeight: 500,
            letterSpacing: 2,
            color: "rgba(255,255,255,0.50)",
            marginBottom: 16,
          }}
        >
          AI INTELLIGENCE
        </p>
        <motion.h2
          initial={{ opacity: 0, filter: "blur(12px)", y: 30 }}
          animate={isInView ? { opacity: 1, filter: "blur(0px)", y: 0 } : undefined}
          transition={{ duration: 0.8, ease: "easeOut" }}
          style={{ margin: 0, color: "#fff" }}
        >
          <span
            className="font-heading"
            style={{
              fontSize: "clamp(2.5rem, 6vw, 72px)",
              fontWeight: 400,
              letterSpacing: "-1.02px",
            }}
          >
            Your personal{" "}
          </span>
          <span
            className="font-instrument italic"
            style={{
              fontSize: "clamp(2.5rem, 6vw, 72px)",
              fontWeight: 400,
              letterSpacing: "-1.02px",
            }}
          >
            AI tutor
          </span>
        </motion.h2>
        <motion.p
          initial={{ opacity: 0, filter: "blur(8px)", y: 20 }}
          animate={isInView ? { opacity: 1, filter: "blur(0px)", y: 0 } : undefined}
          transition={{ duration: 0.8, ease: "easeOut", delay: 0.2 }}
          className="font-heading"
          style={{
            fontSize: 16,
            fontWeight: 400,
            color: "rgba(255,255,255,0.60)",
            lineHeight: 1.6,
            textAlign: "center",
            marginTop: 16,
          }}
        >
          Experience the power of artificial intelligence working for your
          academic success
        </motion.p>
      </div>

      {/* Cards row */}
      <div
        className="flex flex-col items-stretch lg:flex-row"
        style={{ gap: 16, maxWidth: 1200, margin: "0 auto" }}
      >
        {/* Card 1 — Natural Language Queries */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={isInView ? { opacity: 1, y: 0 } : undefined}
          transition={{ duration: 0.7, ease: "easeOut", delay: 0.2 }}
          className="lg:flex-1"
          style={cardBase}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={BACK_3_1}
            alt=""
            className="absolute inset-0 z-0 h-full w-full object-cover"
          />
          <div
            className="absolute inset-0 z-[1]"
            style={{ background: "rgba(0,0,0,0.30)" }}
          />

          {/* Glass Q&A card */}
          <div
            className="absolute z-[2]"
            style={{
              top: 32,
              left: 24,
              right: 24,
              borderRadius: 20,
              border: "1px solid rgba(255,255,255,0.20)",
              background: "rgba(255,255,255,0.10)",
              backdropFilter: "blur(56px)",
              WebkitBackdropFilter: "blur(56px)",
              padding: 20,
            }}
          >
            <div
              className="flex items-center"
              style={{ gap: 10, marginBottom: 16 }}
            >
              <span
                className="grid place-items-center"
                style={{ width: 40, height: 40, borderRadius: 12, background: "#fff" }}
              >
                <AtlasMark className="size-[22px] text-black" />
              </span>
              <span
                className="font-heading"
                style={{ fontSize: 16, fontWeight: 500, color: "#fff" }}
              >
                Atlas
              </span>
            </div>
            <div
              style={{
                borderTop: "1px dashed rgba(255,255,255,0.20)",
                marginBottom: 16,
              }}
            />

            <div style={{ position: "relative", height: 160 }}>
              <AnimatePresence mode="wait">
                <motion.div
                  key={qIdx}
                  initial={{ opacity: 0, filter: "blur(8px)", y: 8 }}
                  animate={{ opacity: 1, filter: "blur(0px)", y: 0 }}
                  exit={{ opacity: 0, filter: "blur(8px)", y: -6 }}
                  transition={{ duration: 0.6, ease: EASE }}
                  style={{ position: "absolute", inset: 0 }}
                >
                  <p
                    className="font-heading"
                    style={{
                      fontSize: 16,
                      fontWeight: 500,
                      color: "#fff",
                      marginBottom: 12,
                      lineHeight: 1.4,
                    }}
                  >
                    {QUESTIONS[qIdx].q}
                  </p>
                  <div className="flex items-start" style={{ gap: 8 }}>
                    <span
                      className="grid shrink-0 place-items-center"
                      style={{
                        width: 20,
                        height: 20,
                        borderRadius: 6,
                        background: "rgba(255,255,255,0.15)",
                      }}
                    >
                      <AtlasMark className="size-3 text-white opacity-80" />
                    </span>
                    <p
                      className="font-heading"
                      style={{
                        fontSize: 12,
                        fontWeight: 400,
                        lineHeight: 1.6,
                        color: "rgba(255,255,255,0.55)",
                        margin: 0,
                      }}
                    >
                      {QUESTIONS[qIdx].a}
                    </p>
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>

            <div
              className="flex items-center justify-between"
              style={{ marginTop: 16 }}
            >
              <Link
                href={ctaHref}
                className="font-heading flex items-center"
                style={{
                  gap: 8,
                  background: "#fff",
                  color: "#000",
                  fontSize: 13,
                  fontWeight: 500,
                  padding: "6px 6px 6px 16px",
                  borderRadius: 9999,
                }}
              >
                Open notes
                <span
                  className="grid place-items-center"
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: "50%",
                    background: "#000",
                  }}
                >
                  <ArrowUpRight size={12} color="#fff" />
                </span>
              </Link>
              <Link
                href={ctaHref}
                className="font-heading underline"
                style={{
                  fontSize: 13,
                  fontWeight: 500,
                  color: "rgba(255,255,255,0.80)",
                }}
              >
                ASK ATLAS
              </Link>
            </div>
          </div>

          <CardCaption
            title="Natural Language Queries"
            body="Ask questions about your lectures and notes in plain English and get instant, accurate answers."
          />
        </motion.div>

        {/* Card 2 — Predictive Analysis */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={isInView ? { opacity: 1, y: 0 } : undefined}
          transition={{ duration: 0.7, ease: "easeOut", delay: 0.35 }}
          className="lg:flex-1"
          style={cardBase}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={BACK_3_2}
            alt=""
            className="absolute inset-0 z-0 h-full w-full object-cover"
          />
          <div
            className="absolute inset-0 z-[1]"
            style={{ background: "rgba(0,0,0,0.20)" }}
          />

          <div className="absolute z-[2]" style={{ top: 32, left: 24, right: 24 }}>
            <div
              style={{
                borderRadius: 20,
                background: "rgba(255,255,255,0.92)",
                padding: "24px 20px 20px",
                textAlign: "center",
              }}
            >
              <p
                className="font-heading"
                style={{
                  fontSize: 12,
                  fontWeight: 400,
                  color: "rgba(0,0,0,0.50)",
                  lineHeight: 1.5,
                  marginBottom: 4,
                }}
              >
                Exam readiness
                <br />
                climbing steadily
              </p>
              <div
                className="font-instrument italic"
                style={{
                  fontSize: 52,
                  fontWeight: 400,
                  color: "#000",
                  letterSpacing: -1,
                  lineHeight: 1,
                }}
              >
                92%
              </div>
              <div style={{ height: 16 }} />

              {/* Readiness chart */}
              <div
                style={{
                  width: 280,
                  maxWidth: "100%",
                  height: 145,
                  position: "relative",
                  overflow: "visible",
                  margin: "0 auto",
                }}
              >
                <svg
                  viewBox="60 -25 220 145"
                  width="100%"
                  height="100%"
                  preserveAspectRatio="none"
                  style={{ overflow: "visible" }}
                >
                  <defs>
                    <linearGradient id="areaFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="rgba(180,210,80,0.85)" />
                      <stop offset="100%" stopColor="rgba(180,210,80,0.10)" />
                    </linearGradient>
                    <clipPath id="reveal">
                      <motion.rect
                        x={60}
                        y={-25}
                        height={145}
                        initial={{ width: 0 }}
                        animate={isInView ? { width: 220 } : undefined}
                        transition={{ duration: 1.4, ease: "easeOut", delay: 0.3 }}
                      />
                    </clipPath>
                  </defs>
                  <g clipPath="url(#reveal)">
                    <path
                      d="M 60 75 L 150 20 L 280 28 L 280 120 L 60 120 Z"
                      fill="url(#areaFill)"
                    />
                    <path
                      d="M 60 75 L 150 20 L 280 28"
                      fill="none"
                      stroke="#8DB800"
                      strokeWidth={3}
                      strokeLinejoin="round"
                      strokeLinecap="round"
                    />
                    <line
                      x1={60}
                      y1={75}
                      x2={60}
                      y2={120}
                      stroke="#8DB800"
                      strokeWidth={1}
                      strokeDasharray="3 3"
                      opacity={0.6}
                    />
                    <line
                      x1={280}
                      y1={28}
                      x2={280}
                      y2={120}
                      stroke="#8DB800"
                      strokeWidth={1}
                      strokeDasharray="3 3"
                      opacity={0.6}
                    />
                  </g>
                  <motion.line
                    x1={150}
                    y1={-15}
                    x2={150}
                    y2={20}
                    stroke="#1DC47D"
                    strokeWidth={1.2}
                    initial={{ pathLength: 0 }}
                    animate={isInView ? { pathLength: 1 } : undefined}
                    transition={{ duration: 0.5, ease: "easeOut", delay: 1.4 }}
                  />
                  <motion.circle
                    cx={150}
                    cy={-15}
                    r={4.5}
                    fill="#1DC47D"
                    initial={{ scale: 0 }}
                    animate={isInView ? { scale: 1 } : undefined}
                    transition={{ duration: 0.3, ease: "easeOut", delay: 1.7 }}
                    style={{ transformOrigin: "150px -15px" }}
                  />
                </svg>
              </div>
            </div>

            {/* Tip pill */}
            <div style={{ textAlign: "center" }}>
              <span
                className="font-heading"
                style={{
                  display: "inline-block",
                  borderRadius: 9999,
                  border: "1px solid rgba(0,0,0,0.12)",
                  background: "rgba(255,255,255,0.80)",
                  backdropFilter: "blur(8px)",
                  WebkitBackdropFilter: "blur(8px)",
                  padding: "8px 16px",
                  marginTop: 16,
                  fontSize: 11,
                  color: "rgba(0,0,0,0.60)",
                  textAlign: "center",
                }}
              >
                Tip: Review your weak topics to stay on track.
              </span>
            </div>
          </div>

          <CardCaption
            title="Predictive Analysis"
            body="AI analyzes your study patterns to forecast exam readiness and exactly what to review next."
          />
        </motion.div>

        {/* Card 3 — Smart Categorization */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={isInView ? { opacity: 1, y: 0 } : undefined}
          transition={{ duration: 0.7, ease: "easeOut", delay: 0.5 }}
          className="lg:flex-1"
          style={cardBase}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={BACK_3_3}
            alt=""
            className="absolute inset-0 z-0 h-full w-full object-cover"
          />
          <div
            className="absolute inset-0 z-[1]"
            style={{ background: "rgba(0,0,0,0.30)" }}
          />

          <div
            className="absolute z-[2]"
            style={{ top: 32, left: 16, right: 16, bottom: 110 }}
          >
            <CategorizationTree isInView={isInView} />
          </div>

          <CardCaption
            title="Smart Categorization"
            body="Automatically organize your notes by subject and topic with machine learning that improves over time."
          />
        </motion.div>
      </div>
    </section>
  );
}

/* ── Categorization tree ──────────────────────────────────────────────────── */

type NodeId =
  | "root"
  | "transport"
  | "entertainment"
  | "transportDetail"
  | "entertainmentDetail"
  | "bills"
  | "billsDetail";

const NodeA = forwardRef<
  HTMLDivElement,
  { children: React.ReactNode; delay: number; isInView: boolean }
>(function NodeA({ children, delay, isInView }, ref) {
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, scale: 0.85 }}
      animate={isInView ? { opacity: 1, scale: 1 } : undefined}
      transition={{ duration: 0.45, ease: "easeOut", delay }}
      className="font-instrument italic"
      style={{
        borderRadius: 9999,
        border: "1px solid rgba(255,255,255,0.25)",
        background: "rgba(255,255,255,0.10)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        padding: "10px 20px",
        fontSize: 16,
        color: "#fff",
        display: "inline-block",
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </motion.div>
  );
});

const NodeB = forwardRef<
  HTMLDivElement,
  { children: React.ReactNode; delay: number; isInView: boolean }
>(function NodeB({ children, delay, isInView }, ref) {
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, scale: 0.85 }}
      animate={isInView ? { opacity: 1, scale: 1 } : undefined}
      transition={{ duration: 0.45, ease: "easeOut", delay }}
      className="font-heading"
      style={{
        borderRadius: 12,
        background: "rgba(255,255,255,0.92)",
        padding: "10px 16px",
        fontSize: 12,
        fontWeight: 400,
        color: "rgba(0,0,0,0.75)",
        lineHeight: 1.5,
        display: "inline-block",
        maxWidth: 160,
      }}
    >
      {children}
    </motion.div>
  );
});

const CONNECTIONS: Array<{ from: NodeId; to: NodeId; delay: number }> = [
  { from: "root", to: "transport", delay: 0.25 },
  { from: "root", to: "entertainment", delay: 0.4 },
  { from: "transport", to: "transportDetail", delay: 0.6 },
  { from: "entertainment", to: "entertainmentDetail", delay: 0.78 },
  { from: "root", to: "bills", delay: 0.95 },
  { from: "bills", to: "billsDetail", delay: 1.15 },
];

type NodePoints = { topX: number; topY: number; botX: number; botY: number };

function CategorizationTree({ isInView }: { isInView: boolean }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const transportRef = useRef<HTMLDivElement>(null);
  const entertainmentRef = useRef<HTMLDivElement>(null);
  const transportDetailRef = useRef<HTMLDivElement>(null);
  const entertainmentDetailRef = useRef<HTMLDivElement>(null);
  const billsRef = useRef<HTMLDivElement>(null);
  const billsDetailRef = useRef<HTMLDivElement>(null);
  const [points, setPoints] = useState<Partial<Record<NodeId, NodePoints>>>({});
  const [size, setSize] = useState({ width: 0, height: 0 });

  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const nodes: Record<NodeId, HTMLDivElement | null> = {
      root: rootRef.current,
      transport: transportRef.current,
      entertainment: entertainmentRef.current,
      transportDetail: transportDetailRef.current,
      entertainmentDetail: entertainmentDetailRef.current,
      bills: billsRef.current,
      billsDetail: billsDetailRef.current,
    };

    function measure() {
      if (!container) return;
      const crect = container.getBoundingClientRect();
      const next: Partial<Record<NodeId, NodePoints>> = {};
      (Object.keys(nodes) as NodeId[]).forEach((id) => {
        const el = nodes[id];
        if (!el) return;
        const r = el.getBoundingClientRect();
        next[id] = {
          topX: r.left + r.width / 2 - crect.left,
          topY: r.top - crect.top,
          botX: r.left + r.width / 2 - crect.left,
          botY: r.bottom - crect.top,
        };
      });
      setPoints(next);
      setSize({ width: crect.width, height: crect.height });
    }

    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(container);
    window.addEventListener("resize", measure);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="relative flex h-full flex-col items-center"
      style={{ gap: 18, zIndex: 2 }}
    >
      {/* Connector overlay */}
      {size.width > 0 && (
        <svg
          width={size.width}
          height={size.height}
          className="pointer-events-none absolute left-0 top-0"
          style={{ zIndex: 1 }}
        >
          {CONNECTIONS.map((c, i) => {
            const from = points[c.from];
            const to = points[c.to];
            if (!from || !to) return null;
            const midY = (from.botY + to.topY) / 2;
            const d = `M ${from.botX} ${from.botY} C ${from.botX} ${midY}, ${to.topX} ${midY}, ${to.topX} ${to.topY}`;
            return (
              <g key={i}>
                <motion.path
                  id={`tree-path-${i}`}
                  d={d}
                  stroke="rgba(255,255,255,0.35)"
                  strokeWidth={1}
                  fill="none"
                  initial={{ pathLength: 0, opacity: 0 }}
                  animate={isInView ? { pathLength: 1, opacity: 1 } : undefined}
                  transition={{ duration: 0.5, ease: "easeOut", delay: c.delay }}
                />
                <motion.circle
                  cx={to.topX}
                  cy={to.topY}
                  r={2.5}
                  fill="rgba(255,255,255,0.9)"
                  initial={{ opacity: 0 }}
                  animate={isInView ? { opacity: 1 } : undefined}
                  transition={{ duration: 0.3, delay: c.delay + 0.5 }}
                />
                {/* Traveling glow dot: framer fades it, native animateMotion
                    moves it along the connector path forever. */}
                <motion.circle
                  r={3}
                  fill="#fff"
                  style={{ filter: "drop-shadow(0 0 4px rgba(255,255,255,0.8))" }}
                  initial={{ opacity: 0 }}
                  animate={isInView ? { opacity: [0, 1, 1, 0] } : undefined}
                  transition={{
                    duration: 2.4,
                    delay: c.delay + 0.6,
                    repeat: Infinity,
                    repeatDelay: 1.2,
                    ease: "easeInOut",
                    times: [0, 0.1, 0.9, 1],
                  }}
                >
                  <animateMotion dur="2.4s" repeatCount="indefinite">
                    <mpath href={`#tree-path-${i}`} />
                  </animateMotion>
                </motion.circle>
              </g>
            );
          })}
        </svg>
      )}

      {/* Nodes (z 2, above the connector svg) */}
      <div style={{ zIndex: 2 }}>
        <NodeA ref={rootRef} delay={0} isInView={isInView}>
          Your notes
        </NodeA>
      </div>
      <div className="flex" style={{ gap: 16, zIndex: 2 }}>
        <NodeA ref={transportRef} delay={0.18} isInView={isInView}>
          Biology
        </NodeA>
        <NodeA ref={entertainmentRef} delay={0.36} isInView={isInView}>
          History
        </NodeA>
      </div>
      <div className="flex items-start" style={{ gap: 16, zIndex: 2 }}>
        <NodeB
          ref={transportDetailRef}
          delay={0.54}
          isInView={isInView}
        >
          Cells, genetics, evolution, ecology
        </NodeB>
        <NodeB
          ref={entertainmentDetailRef}
          delay={0.72}
          isInView={isInView}
        >
          Revolutions, treaties, empires
        </NodeB>
      </div>
      <div style={{ zIndex: 2 }}>
        <NodeA ref={billsRef} delay={0.9} isInView={isInView}>
          Chemistry
        </NodeA>
      </div>
      <div style={{ zIndex: 2 }}>
        <NodeB ref={billsDetailRef} delay={1.08} isInView={isInView}>
          Atoms, bonds, reactions, the periodic table
        </NodeB>
      </div>
    </div>
  );
}
