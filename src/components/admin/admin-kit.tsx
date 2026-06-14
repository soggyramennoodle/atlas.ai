import type { ComponentType, ReactNode } from "react";
import { ShieldCheck } from "lucide-react";
import {
  GLASS_DARK,
  GLASS_DARK_PILL,
  DARK_FIELD,
  CTA_WHITE,
} from "@/components/app/glass";
import { cn } from "@/lib/utils";

/**
 * Shared dark-liquid-glass primitives for the admin area: pragmatic density,
 * editorial type, pill controls, translucent ink surfaces over the AppCanvas
 * backdrop — no hero bands. Importable from server and client components alike
 * (no hooks here). White text throughout; bare text sitting directly on the
 * canvas carries an ink halo (TEXT_ON_INK) for legibility, while glass
 * surfaces already inherit it.
 */

/** Ink halo for white text that sits directly on the canvas (not on glass). */
export const TEXT_HALO = "[text-shadow:0_1px_3px_rgba(0,0,0,0.45)]";

/** Dark-glass card — the admin surface (replaces the old white CARD). Add
 *  padding (`p-5` etc.) at the call site. */
export const CARD = cn("rounded-3xl", GLASS_DARK);

export const ADMIN_EYEBROW =
  "inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.06] px-3.5 py-1.5 text-[11px] font-medium uppercase tracking-[0.18em] text-white/70 [text-shadow:0_1px_3px_rgba(0,0,0,0.45)]";

/* Buttons — small pills tuned for dense admin rows. */
export const ADMIN_BTN = cn(
  "inline-flex h-9 items-center justify-center gap-1.5 rounded-full px-3.5 text-xs font-medium",
  GLASS_DARK_PILL
);
export const ADMIN_BTN_PRIMARY = cn("h-9 gap-1.5 px-3.5 text-xs", CTA_WHITE);
export const ADMIN_BTN_GHOST =
  "inline-flex h-9 items-center justify-center gap-1.5 rounded-full px-3 text-xs font-medium text-white/60 outline-none transition hover:bg-white/[0.08] hover:text-white disabled:pointer-events-none disabled:opacity-60 focus-visible:ring-2 focus-visible:ring-white/40";

/* Inputs */
export const ADMIN_INPUT = cn("h-10 w-full rounded-full px-4 text-sm", DARK_FIELD);
export const ADMIN_TEXTAREA = cn(
  "w-full resize-none rounded-2xl px-4 py-3 text-sm leading-6",
  DARK_FIELD
);

/* Status badge base — tones supply colors. */
export const ADMIN_BADGE =
  "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[0.65rem] font-medium uppercase tracking-[0.12em]";

/** Standard page header: Admin chip, editorial title, quiet description. */
export function AdminHeader({
  icon: Icon = ShieldCheck,
  title,
  description,
  className,
}: {
  icon?: ComponentType<{ className?: string }>;
  title: ReactNode;
  description?: ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <span className={ADMIN_EYEBROW}>
        <Icon className="size-3.5" />
        Admin
      </span>
      <h1
        className={cn(
          "mt-4 text-3xl font-normal tracking-[-0.01em] text-white",
          TEXT_HALO
        )}
      >
        {title}
      </h1>
      {description ? (
        <p
          className={cn(
            "mt-2 max-w-3xl text-pretty text-sm leading-6 text-white/70",
            TEXT_HALO
          )}
        >
          {description}
        </p>
      ) : null}
    </div>
  );
}

/** Dashed empty-state card shared by admin lists. */
export function AdminEmpty({
  icon: Icon,
  title,
  body,
  children,
}: {
  icon: ComponentType<{ className?: string }>;
  title: string;
  body: string;
  children?: ReactNode;
}) {
  return (
    <div
      className={cn(
        "rounded-3xl border border-dashed border-white/20 bg-white/[0.04] px-6 py-16 text-center",
        TEXT_HALO
      )}
    >
      <div className="mx-auto grid size-12 place-items-center rounded-full border border-white/15 bg-white/[0.06] text-white/70">
        <Icon className="size-5" />
      </div>
      <h2 className="mt-4 font-medium text-white">{title}</h2>
      <p className="mx-auto mt-1 max-w-xs text-sm text-white/60">{body}</p>
      {children}
    </div>
  );
}

export { cn };
