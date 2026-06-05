"use client";

import { motion, useReducedMotion, type HTMLMotionProps } from "framer-motion";

/**
 * rivo-style blur-up reveal: content rises a little, un-blurs and settles to
 * full scale as it scrolls into view. A configurable delay lets groups stagger.
 * Collapses to a plain fade (no transform/blur) under reduced-motion.
 */
export function Reveal({
  delay = 0,
  y = 24,
  children,
  ...props
}: { delay?: number; y?: number } & HTMLMotionProps<"div">) {
  const reduce = useReducedMotion();

  const hidden = reduce
    ? { opacity: 0 }
    : { opacity: 0, y, scale: 0.98, filter: "blur(4px)" };
  const shown = reduce
    ? { opacity: 1 }
    : { opacity: 1, y: 0, scale: 1, filter: "blur(0px)" };

  return (
    <motion.div
      initial={hidden}
      whileInView={shown}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.7, delay, ease: [0.22, 1, 0.36, 1] }}
      {...props}
    >
      {children}
    </motion.div>
  );
}
