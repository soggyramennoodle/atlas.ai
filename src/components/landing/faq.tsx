"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Plus } from "lucide-react";
import { Reveal } from "@/components/landing/reveal";

const FAQ = [
  {
    q: "Do I have to upload a file?",
    a: "No — recording happens right in your browser. Just press record when class starts. If you'd rather upload an existing file (MP3, M4A, WAV, AAC, OGG, FLAC), that option is there too.",
  },
  {
    q: "How thorough are the notes?",
    a: "Very. Atlas is built for students who'd rather listen than scribble, so it captures the lecture in full — sections, examples, definitions and a summary — instead of a short recap.",
  },
  {
    q: "Is my data private?",
    a: "Yes. You need an account to record lectures, and every recording is deleted after notes are generated. Your notes and personal info stay secure with Atlas Enclave, our privacy solution.",
  },
  {
    q: "Does it work for any subject?",
    a: "Any lecture-style audio — the sciences, humanities, law, medicine. It adapts to the material and pulls out the terms that matter for that subject.",
  },
];

export function Faq() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <section id="faq" className="mx-auto max-w-3xl scroll-mt-24 px-4 py-28">
      <Reveal className="text-center">
        <p className="font-mono text-xs uppercase tracking-[0.22em] text-primary">
          FAQ
        </p>
        <h2 className="mt-4 text-balance text-4xl font-semibold tracking-tight sm:text-5xl">
          Questions,{" "}
          <span className="font-serif font-normal italic text-primary">
            answered
          </span>
        </h2>
      </Reveal>

      <div className="mt-12 space-y-3">
        {FAQ.map((item, i) => {
          const isOpen = open === i;
          return (
            <Reveal key={item.q} delay={i * 0.05}>
              <div className="glass overflow-hidden rounded-2xl">
                <button
                  onClick={() => setOpen(isOpen ? null : i)}
                  className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left"
                  aria-expanded={isOpen}
                >
                  <span className="font-medium tracking-tight">{item.q}</span>
                  <motion.span
                    animate={{ rotate: isOpen ? 45 : 0 }}
                    transition={{ duration: 0.25 }}
                    className="grid size-7 shrink-0 place-items-center rounded-full border border-primary/30 text-primary"
                  >
                    <Plus className="size-4" />
                  </motion.span>
                </button>
                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                    >
                      <p className="px-6 pb-5 text-sm leading-relaxed text-muted-foreground text-pretty">
                        {item.a}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </Reveal>
          );
        })}
      </div>
    </section>
  );
}
