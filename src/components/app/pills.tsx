import { ArrowUpRight } from "lucide-react";

/**
 * Cinematic-light pill primitives, shared by the auth surface and the app
 * shell. Promoted from auth-form.tsx so the two surfaces can't drift; values
 * are identical to the shipped auth pass.
 */
export const PILL_SECONDARY =
  "flex h-11 w-full items-center justify-center gap-2 rounded-full border border-black/[0.12] bg-white text-sm font-medium text-[#0d0d0d] transition hover:bg-black/[0.03] active:scale-[0.99] disabled:pointer-events-none disabled:opacity-60 outline-none focus-visible:ring-2 focus-visible:ring-black/25 focus-visible:ring-offset-2";
export const PILL_PRIMARY =
  "group flex h-11 w-full items-center justify-center gap-2 rounded-full bg-[#0d0d0d] text-sm font-medium text-white transition hover:scale-[1.01] active:scale-[0.99] disabled:pointer-events-none disabled:opacity-60 outline-none focus-visible:ring-2 focus-visible:ring-black/25 focus-visible:ring-offset-2";
export const PILL_INPUT =
  "h-11 w-full rounded-full border border-black/[0.12] bg-white px-5 text-sm text-[#0d0d0d] outline-none focus-visible:ring-2 focus-visible:ring-black/25 transition placeholder:text-[#0d0d0d]/40 focus:border-black/30";
export const INK_LINK =
  "font-medium text-[#0d0d0d] underline-offset-4 hover:underline";
export const GHOST_LINK =
  "inline-flex items-center gap-1 text-sm text-[#0d0d0d]/55 transition hover:text-[#0d0d0d]";

export const EASE = [0.22, 1, 0.36, 1] as const;

/** White arrow circle that sits inside an ink PILL_PRIMARY (group hover lifts it). */
export const ARROW_BADGE = (
  <span className="grid size-6 shrink-0 place-items-center rounded-full bg-white">
    <ArrowUpRight
      size={13}
      color="#000"
      strokeWidth={2.5}
      className="transition-transform duration-300 ease-out group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
    />
  </span>
);
