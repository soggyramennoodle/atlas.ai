import type { ComponentType, ReactNode } from "react";
import { ShieldCheck } from "lucide-react";
import { CARD } from "@/components/app/glass";
import { cn } from "@/lib/utils";

/**
 * Shared cinematic-light primitives for the admin area: pragmatic density,
 * editorial type, pill controls, CARD surfaces — no hero bands. Importable
 * from server and client components alike (no hooks here).
 */

export const ADMIN_EYEBROW =
  "inline-flex items-center gap-2 rounded-full border border-black/[0.1] bg-black/[0.03] px-3.5 py-1.5 text-[11px] font-medium uppercase tracking-[0.18em] text-[#0d0d0d]/55";

/* Buttons — small pills tuned for dense admin rows. */
export const ADMIN_BTN =
  "inline-flex h-9 items-center justify-center gap-1.5 rounded-full border border-black/[0.12] bg-white px-3.5 text-xs font-medium text-[#0d0d0d] outline-none transition hover:bg-black/[0.03] active:scale-[0.99] disabled:pointer-events-none disabled:opacity-60 focus-visible:ring-2 focus-visible:ring-black/25";
export const ADMIN_BTN_PRIMARY =
  "inline-flex h-9 items-center justify-center gap-1.5 rounded-full bg-[#0d0d0d] px-3.5 text-xs font-medium text-white outline-none transition hover:bg-[#0d0d0d]/90 active:scale-[0.99] disabled:pointer-events-none disabled:opacity-60 focus-visible:ring-2 focus-visible:ring-black/25 focus-visible:ring-offset-2";
export const ADMIN_BTN_GHOST =
  "inline-flex h-9 items-center justify-center gap-1.5 rounded-full px-3 text-xs font-medium text-[#0d0d0d]/55 outline-none transition hover:bg-black/[0.04] hover:text-[#0d0d0d] disabled:pointer-events-none disabled:opacity-60 focus-visible:ring-2 focus-visible:ring-black/25";

/* Inputs */
export const ADMIN_INPUT =
  "h-10 w-full rounded-full border border-black/[0.12] bg-white px-4 text-sm text-[#0d0d0d] outline-none transition placeholder:text-[#0d0d0d]/40 focus:border-black/30 focus-visible:ring-2 focus-visible:ring-black/25 disabled:opacity-60";
export const ADMIN_TEXTAREA =
  "w-full resize-none rounded-2xl border border-black/[0.12] bg-black/[0.02] px-4 py-3 text-sm leading-6 text-[#0d0d0d] outline-none transition placeholder:text-[#0d0d0d]/40 focus:border-black/30 focus-visible:ring-2 focus-visible:ring-black/25 disabled:opacity-60";

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
      <h1 className="mt-4 text-3xl font-normal tracking-[-0.01em] text-[#0d0d0d]">
        {title}
      </h1>
      {description ? (
        <p className="mt-2 max-w-3xl text-pretty text-sm leading-6 text-[#0d0d0d]/60">
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
    <div className="rounded-3xl border border-dashed border-black/[0.14] bg-white/50 px-6 py-16 text-center">
      <div className="mx-auto grid size-12 place-items-center rounded-full border border-black/[0.1] bg-white text-[#0d0d0d]/70">
        <Icon className="size-5" />
      </div>
      <h2 className="mt-4 font-medium text-[#0d0d0d]">{title}</h2>
      <p className="mx-auto mt-1 max-w-xs text-sm text-[#0d0d0d]/55">{body}</p>
      {children}
    </div>
  );
}

export { CARD };
export { cn };
