"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowUpRight, Megaphone } from "lucide-react";
import { HeroVideo } from "@/components/landing/hero-video";
import { StoryCard } from "@/components/landing/story-card";
import { UNIVERSITIES } from "@/components/landing/universities-marquee";
import type { SiteAnnouncement } from "@/lib/types";

const EASE = [0.22, 1, 0.36, 1] as const;

export function Hero({
  ctaHref,
  announcement,
}: {
  ctaHref: string;
  announcement: SiteAnnouncement | null;
}) {
  return (
    <section className="relative overflow-hidden bg-[#fafafa]" style={{ minHeight: "100svh" }}>
      <HeroVideo />

      {/* Dark overlay */}
      <div
        aria-hidden
        className="absolute inset-0 z-[1]"
        style={{
          background:
            "linear-gradient(to bottom, rgba(250,250,250,0.92) 0%, rgba(250,250,250,0.55) 50%, rgba(250,250,250,0.94) 100%)",
        }}
      />

      {/* Hero content */}
      <div className="relative z-10 flex min-h-[100svh] flex-col items-center justify-center px-4 pb-44 pt-28 lg:pb-56 lg:pt-20">
        {announcement ? (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: EASE }}
            className="font-heading mb-6 inline-flex max-w-lg items-center gap-2 rounded-full border border-black/10 bg-white/70 px-4 py-2 text-[13px] font-medium leading-snug text-black/80 shadow-[0_8px_30px_rgba(0,0,0,0.06)] backdrop-blur-[12px]"
          >
            <Megaphone className="size-4 shrink-0 text-black/55" />
            <span className="text-pretty">{announcement.message}</span>
          </motion.div>
        ) : null}

        <motion.h1
          initial={{ opacity: 0, y: -40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, ease: EASE }}
          className="text-center text-[#0d0d0d]"
          style={{
            margin: 0,
            fontSize: "clamp(2.9rem, 8.2vw, 102px)",
            lineHeight: 0.94,
            letterSpacing: "-1.02px",
            fontWeight: 400,
          }}
        >
          <span className="font-heading block">Atlas redefines</span>
          <span className="block">
            <span className="font-heading">the </span>
            <span className="font-instrument italic">way you learn</span>
          </span>
        </motion.h1>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.25, ease: EASE }}
        >
          <Link
            href={ctaHref}
            className="font-heading flex items-center"
            style={{
              marginTop: 32,
              background: "#0d0d0d",
              color: "#fff",
              fontSize: 15,
              fontWeight: 500,
              paddingLeft: 24,
              paddingRight: 8,
              paddingTop: 6,
              paddingBottom: 6,
              borderRadius: 9999,
              gap: 8,
            }}
          >
            Start for free
            <span
              className="grid place-items-center"
              style={{
                width: 24,
                height: 24,
                borderRadius: 9999,
                background: "#fff",
              }}
            >
              <ArrowUpRight size={14} color="#000" strokeWidth={2.5} />
            </span>
          </Link>
        </motion.div>

        <StoryCard />
      </div>

      {/* Bottom-left: university marquee. In-flow on mobile, pinned on lg. */}
      <div className="relative z-10 px-6 pb-10 lg:absolute lg:bottom-10 lg:left-10 lg:p-0">
        <p
          className="font-heading"
          style={{
            fontSize: 21,
            lineHeight: 1.2,
            color: "rgba(13,13,13,0.55)",
            marginBottom: 18,
          }}
        >
          Loved by students at
        </p>
        <div className="overflow-hidden" style={{ width: "min(430px, 100%)" }}>
          <div
            className="flex w-max animate-marquee-hero will-change-transform"
            style={{ gap: 54 }}
          >
            {[0, 1].map((track) => (
              <div
                key={track}
                aria-hidden={track === 1}
                className="flex shrink-0 items-center"
                style={{ gap: 54 }}
              >
                {UNIVERSITIES.map((u) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    key={`${track}-${u.name}`}
                    src={u.src}
                    alt={u.name}
                    loading="lazy"
                    className="w-auto shrink-0 object-contain"
                    style={{
                      height: 30,
                      filter: "brightness(0) opacity(0.5)",
                    }}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom-right: positioning paragraph */}
      <div className="relative z-10 max-w-[430px] px-6 pb-12 lg:absolute lg:bottom-10 lg:right-10 lg:p-0">
        <p
          className="font-heading"
          style={{
            color: "#0d0d0d",
            fontSize: 21,
            lineHeight: 1.4,
            marginBottom: 12,
          }}
        >
          Atlas is your all-in-one study companion, now powered by your own
          intelligent AI note-taker.
        </p>
        <Link
          href="/#insights"
          className="font-heading underline"
          style={{ color: "#0d0d0d", fontSize: 21 }}
        >
          Learn more
        </Link>
      </div>
    </section>
  );
}
