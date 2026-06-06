"use client";

import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Plus } from "lucide-react";
import { Reveal } from "@/components/landing/reveal";

const FAQ = [
  {
    q: "Do I have to upload a file?",
    a: "No. Recording happens right in your browser, so just press record when class starts. If you'd rather upload an existing file (MP3, M4A, WAV, AAC, OGG, FLAC), that option is there too.",
  },
  {
    q: "How thorough are the notes?",
    a: "Very. Atlas is built for students who'd rather listen than scribble, so it captures the lecture in full: sections, examples, definitions and a summary, instead of a short recap.",
  },
  {
    q: "Is my data private?",
    a: "Yes. You need an account to record lectures, and every recording is deleted after notes are generated. Your notes and personal info stay secure with Atlas Enclave, our privacy solution.",
  },
  {
    q: "Does it work for any subject?",
    a: "Any lecture-style audio: the sciences, humanities, law, medicine. It adapts to the material and pulls out the terms that matter for that subject.",
  },
];

export function Faq() {
  const [open, setOpen] = useState<number | null>(0);
  const reduce = useReducedMotion();

  return (
    <section
      id="faq"
      className="mx-auto max-w-[1200px] scroll-mt-20 px-4 py-20 sm:px-6 md:py-28"
    >
      <div className="grid gap-12 lg:grid-cols-12 lg:gap-10">
        <Reveal className="lg:col-span-5">
          <div className="lg:sticky lg:top-24">
            <h2 className="text-balance text-4xl font-bold leading-[1.02] tracking-[-0.03em] sm:text-5xl">
              Questions,
              <br />
              answered.
            </h2>
            <p className="mt-4 max-w-sm text-pretty text-muted-foreground">
              Still wondering about something? Reach us any time at{" "}
              <a
                href="mailto:hello@atlasai.ca"
                className="text-primary hover:underline"
              >
                our inbox
              </a>
              .
            </p>
          </div>
        </Reveal>

        <div className="lg:col-span-7">
          <div className="overflow-hidden rounded-[4px] border border-border">
            {FAQ.map((item, i) => {
              const isOpen = open === i;
              return (
                <div
                  key={item.q}
                  className="border-t border-border bg-card first:border-t-0"
                >
                  <button
                    onClick={() => setOpen(isOpen ? null : i)}
                    className="flex w-full items-center justify-between gap-4 px-5 py-5 text-left transition-colors hover:bg-secondary sm:px-6"
                    aria-expanded={isOpen}
                  >
                    <span className="font-medium tracking-tight">{item.q}</span>
                    <motion.span
                      animate={{ rotate: isOpen ? 45 : 0 }}
                      transition={{ duration: reduce ? 0 : 0.25 }}
                      className="grid size-7 shrink-0 place-items-center rounded-[4px] border border-border text-foreground"
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
                        transition={{
                          duration: reduce ? 0 : 0.3,
                          ease: [0.22, 1, 0.36, 1],
                        }}
                      >
                        <p className="px-5 pb-5 text-sm leading-relaxed text-muted-foreground text-pretty sm:px-6">
                          {item.a}
                        </p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
