"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useInView } from "framer-motion";
import { ArrowUpRight, FileText } from "lucide-react";
import { AtlasMark } from "@/components/logo";

const BLOCK_1 = "/landing/insights-1.jpg";
const BLOCK_2 = "/landing/insights-2.jpg";
const PERSON_2 = "/landing/lecture-hall.jpg";

/** rAF count-up with cubic ease-out, formatted as a plain integer. */
function useCountUp(active: boolean, from: number, to: number, ms = 1200) {
  const [value, setValue] = useState(from);

  useEffect(() => {
    if (!active) return;
    let raf: number;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min((now - start) / ms, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      setValue(Math.round(from + (to - from) * eased));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [active, from, to, ms]);

  return value.toLocaleString("en-US", { maximumFractionDigits: 0 });
}

const SUBJECT_ROWS = [
  {
    label: "Biology",
    value: "96 notes",
    width: "75%",
    fill: "linear-gradient(90deg, #1DC47D 60.8%, rgba(29,196,125,0) 100%)",
  },
  {
    label: "History",
    value: "64 notes",
    width: "45%",
    fill: "linear-gradient(90deg, #B48F17 55.74%, rgba(180,143,23,0) 100%)",
  },
  {
    label: "Chemistry",
    value: "88 notes",
    width: "60%",
    fill: "linear-gradient(90deg, #FFF 52.46%, rgba(255,255,255,0) 100%)",
  },
];

export function Insights() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  const notesCount = useCountUp(isInView, 1, 248);
  const wordsCount = useCountUp(isInView, 10, 1240);

  return (
    <section
      id="insights"
      className="overflow-hidden scroll-mt-20"
      style={{ background: "#fafafa", padding: "80px 24px" }}
    >
      {/* Header */}
      <div ref={ref} style={{ textAlign: "center", marginBottom: 64 }}>
        <p
          className="font-heading"
          style={{
            fontSize: 12,
            fontWeight: 500,
            letterSpacing: 2,
            color: "rgba(0,0,0,0.45)",
            marginBottom: 16,
          }}
        >
          INSIGHTS
        </p>
        <motion.h2
          initial={{ opacity: 0, filter: "blur(12px)", y: 30 }}
          animate={isInView ? { opacity: 1, filter: "blur(0px)", y: 0 } : undefined}
          transition={{ duration: 0.8, ease: "easeOut" }}
          style={{ margin: 0, color: "#0d0d0d" }}
        >
          <span
            className="font-heading block"
            style={{
              fontSize: "clamp(2.5rem, 6vw, 72px)",
              fontWeight: 400,
              lineHeight: 1,
              letterSpacing: "-1.02px",
            }}
          >
            Smarter study
          </span>
          <span
            className="font-instrument block italic"
            style={{
              fontSize: "clamp(2.5rem, 6vw, 72px)",
              fontWeight: 400,
              lineHeight: 1,
              letterSpacing: "-1.02px",
            }}
          >
            insights at a glance
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
            color: "rgba(0,0,0,0.55)",
            marginTop: 16,
          }}
        >
          Keep your lectures, notes, and concepts in sync with real-time AI
        </motion.p>
      </div>

      {/* Cards row */}
      <div
        className="flex flex-col items-stretch lg:flex-row"
        style={{ gap: 16, maxWidth: 1200, margin: "0 auto" }}
      >
        {/* Card 1 — semester overview */}
        <motion.div
          initial={{ opacity: 0, x: -60 }}
          animate={isInView ? { opacity: 1, x: 0 } : undefined}
          transition={{ duration: 0.8, ease: "easeOut", delay: 0.3 }}
          className="relative overflow-hidden lg:flex-[1.4]"
          style={{ borderRadius: 24, minHeight: 480 }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={BLOCK_1}
            alt=""
            className="absolute inset-0 z-0 h-full w-full object-cover"
          />
          <div
            className="absolute inset-0 z-[1]"
            style={{ background: "rgba(0,0,0,0.35)" }}
          />

          {/* Glass overview card */}
          <div
            className="absolute z-[2]"
            style={{
              top: 32,
              left: 32,
              right: 32,
              borderRadius: 20,
              border: "1px solid rgba(255,255,255,0.20)",
              background: "rgba(255,255,255,0.10)",
              backdropFilter: "blur(56px)",
              WebkitBackdropFilter: "blur(56px)",
              padding: "24px 28px",
            }}
          >
            <div
              className="flex items-center justify-between"
              style={{ marginBottom: 8 }}
            >
              <span
                className="font-heading"
                style={{
                  fontSize: 11,
                  fontWeight: 500,
                  letterSpacing: 1.5,
                  color: "rgba(255,255,255,0.60)",
                }}
              >
                THIS MONTH
              </span>
              <span
                className="font-heading underline"
                style={{
                  fontSize: 11,
                  fontWeight: 500,
                  letterSpacing: 1.5,
                  color: "rgba(255,255,255,0.60)",
                }}
              >
                MONTHLY
              </span>
            </div>
            <div
              className="font-heading"
              style={{
                fontSize: 42,
                fontWeight: 400,
                letterSpacing: -1,
                color: "#fff",
                marginBottom: 24,
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {notesCount}
              <span
                style={{
                  fontSize: 15,
                  fontWeight: 400,
                  color: "rgba(255,255,255,0.55)",
                  marginLeft: 6,
                }}
              >
                notes
              </span>
            </div>
            <div
              style={{
                width: "100%",
                borderTop: "1px dashed rgba(255,255,255,0.20)",
                marginBottom: 20,
              }}
            />
            {SUBJECT_ROWS.map((row) => (
              <div key={row.label} style={{ marginBottom: 16 }}>
                <div className="flex items-center justify-between">
                  <span
                    className="font-heading"
                    style={{ fontSize: 13, color: "rgba(255,255,255,0.70)" }}
                  >
                    {row.label}
                  </span>
                  <span
                    className="font-heading"
                    style={{ fontSize: 13, color: "#fff", fontWeight: 500 }}
                  >
                    {row.value}
                  </span>
                </div>
                <div
                  style={{
                    height: 5,
                    borderRadius: 5,
                    width: "100%",
                    marginTop: 6,
                    position: "relative",
                  }}
                >
                  <div
                    className="absolute inset-0"
                    style={{
                      opacity: 0.13,
                      borderRadius: 5,
                      background:
                        "linear-gradient(90deg, #040504 0%, rgba(4,5,4,0.50) 100%)",
                    }}
                  />
                  <div
                    style={{
                      position: "absolute",
                      left: 0,
                      top: 0,
                      height: "100%",
                      width: row.width,
                      borderRadius: 5,
                      background: row.fill,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Bottom text */}
          <div className="absolute z-[2]" style={{ bottom: 22, left: 32, right: 32 }}>
            <h3
              className="font-instrument italic"
              style={{
                fontSize: 26,
                fontWeight: 400,
                color: "#fff",
                marginBottom: 8,
              }}
            >
              See your whole semester at a glance.
            </h3>
            <p
              className="font-heading"
              style={{
                fontSize: 13,
                fontWeight: 400,
                lineHeight: 1.6,
                color: "rgba(255,255,255,0.65)",
                margin: 0,
              }}
            >
              Atlas keeps your lectures, notes, and concepts effortlessly
              organized — giving you a clearer view of what you&apos;ve
              learned, where you&apos;re strong, and exactly what to review
              next.
            </p>
          </div>
        </motion.div>

        {/* Card 2 — today's capture */}
        <motion.div
          initial={{ opacity: 0, x: 60 }}
          animate={isInView ? { opacity: 1, x: 0 } : undefined}
          transition={{ duration: 0.8, ease: "easeOut", delay: 0.45 }}
          className="relative overflow-hidden lg:flex-1"
          style={{ borderRadius: 24, minHeight: 480 }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={BLOCK_2}
            alt=""
            className="absolute inset-0 z-0 h-full w-full object-cover"
          />
          <div
            className="absolute inset-0 z-[1]"
            style={{ background: "rgba(0,0,0,0.25)" }}
          />

          <span
            className="font-heading absolute z-[2] underline"
            style={{
              top: 24,
              right: 24,
              fontSize: 11,
              fontWeight: 500,
              letterSpacing: 1.5,
              color: "rgba(255,255,255,0.70)",
            }}
          >
            TODAY
          </span>

          {/* White note card */}
          <div
            className="absolute z-[2]"
            style={{
              top: 32,
              left: 32,
              width: 200,
              borderRadius: 16,
              background: "#fff",
              padding: "16px 18px",
              boxShadow: "0 8px 32px rgba(0,0,0,0.20)",
            }}
          >
            <div className="flex items-start justify-between">
              <span
                className="font-heading"
                style={{
                  fontSize: 22,
                  fontWeight: 400,
                  color: "#000",
                  letterSpacing: -0.5,
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {wordsCount}
                <span
                  style={{
                    fontSize: 12,
                    color: "rgba(0,0,0,0.45)",
                    marginLeft: 4,
                  }}
                >
                  words
                </span>
              </span>
              <FileText size={16} color="rgba(0,0,0,0.35)" />
            </div>
            <p
              className="font-heading"
              style={{
                fontSize: 12,
                color: "rgba(0,0,0,0.45)",
                marginBottom: 14,
              }}
            >
              Captured today
            </p>
            <button
              className="font-heading flex w-full items-center justify-between"
              style={{
                background: "#000",
                color: "#fff",
                fontSize: 13,
                fontWeight: 500,
                padding: "10px 14px",
                borderRadius: 9999,
                border: "none",
                cursor: "pointer",
              }}
            >
              Open note
              <span
                className="grid place-items-center"
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: "50%",
                  background: "rgba(255,255,255,0.15)",
                }}
              >
                <ArrowUpRight size={13} color="#fff" />
              </span>
            </button>
          </div>

          {/* Student portrait */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={PERSON_2}
            alt="A student"
            className="absolute z-[2]"
            style={{
              bottom: 140,
              left: "50%",
              transform: "translateX(-50%)",
              width: 200,
              height: 240,
              objectFit: "cover",
              objectPosition: "top center",
              borderRadius: 16,
            }}
          />

          {/* Brand bar */}
          <div
            className="absolute z-[3] flex items-center"
            style={{ bottom: 160, right: 24, gap: 8 }}
          >
            <span
              className="flex items-center"
              style={{
                gap: 8,
                background: "rgba(255,255,255,0.15)",
                backdropFilter: "blur(12px)",
                WebkitBackdropFilter: "blur(12px)",
                borderRadius: 9999,
                padding: "8px 16px 8px 10px",
              }}
            >
              <AtlasMark className="size-5 text-white" />
              <span
                className="font-heading"
                style={{ fontSize: 14, fontWeight: 500, color: "#fff" }}
              >
                Atlas
              </span>
            </span>
            <span
              className="grid place-items-center"
              style={{
                width: 36,
                height: 36,
                borderRadius: "50%",
                background: "rgba(255,255,255,0.15)",
                backdropFilter: "blur(12px)",
                WebkitBackdropFilter: "blur(12px)",
              }}
            >
              <ArrowUpRight size={16} color="#fff" />
            </span>
          </div>

          {/* Bottom text */}
          <div className="absolute z-[2]" style={{ bottom: 22, left: 32, right: 32 }}>
            <h3
              className="font-instrument italic"
              style={{
                fontSize: 24,
                fontWeight: 400,
                color: "#fff",
                marginBottom: 8,
              }}
            >
              Your lectures, perfectly noted.
            </h3>
            <p
              className="font-heading"
              style={{
                fontSize: 13,
                fontWeight: 400,
                lineHeight: 1.6,
                color: "rgba(255,255,255,0.65)",
                margin: 0,
              }}
            >
              Stay on top of all your courses with Atlas with notes that
              capture what matters, automatically.
            </p>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
