import Image from "next/image";
import { cn } from "@/lib/utils";
import { AiGlow } from "@/components/ui/ai-glow";

/**
 * Liquid-glass surface recipes (spec: app cinematic redesign). Tuned once
 * here — never hand-rolled per page. Both read as real glass: translucent
 * fill, heavy backdrop blur, specular top edge, hairline inner border.
 */
/** Warm paper canvas for the app surface — a touch darker than the marketing
 *  #fafafa so white cards and light glass actually read as raised surfaces. */
export const CANVAS = "#f4f3f1";

/* Tileable monochrome film grain (SVG feTurbulence). Encoded once; rendered
   at very low opacity over the whole canvas by AppCanvas. */
const GRAIN_SVG =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E";

/**
 * The app's atmospheric backdrop: a soft light wash falling from the top of
 * the viewport plus an ultra-subtle film grain, both fixed and non-interactive.
 * Pure CSS — no animation, no compositing cost beyond two static layers.
 * Parent must be `isolate` so the -z-10 layers sit above its background.
 */
export function AppCanvas() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10">
      {/* Light falling from above — keeps the warm canvas from going flat. */}
      <div className="absolute inset-x-0 top-0 h-[46rem] bg-[radial-gradient(120%_100%_at_50%_-30%,rgba(255,255,255,0.85),rgba(255,255,255,0)_62%)]" />
      {/* A faint cool breath low in the frame, like the mist asset. */}
      <div className="absolute bottom-[-12rem] left-1/2 h-[28rem] w-[110%] -translate-x-1/2 rounded-[100%] bg-[radial-gradient(60%_100%_at_50%_100%,rgba(13,13,13,0.05),rgba(13,13,13,0)_70%)]" />
      {/* Film grain. */}
      <div
        className="absolute inset-0 opacity-[0.08]"
        style={{ backgroundImage: `url("${GRAIN_SVG}")`, backgroundSize: "160px 160px" }}
      />
    </div>
  );
}

/** The standard raised white card on the warm canvas: hairline + soft ambient
 *  shadow. Use this instead of bare `bg-white border-black/[0.08]` so every
 *  card separates from the canvas the same way. */
export const CARD =
  "rounded-3xl border border-black/[0.08] bg-white shadow-[0_1px_2px_rgba(13,13,13,0.04),0_24px_60px_-44px_rgba(13,13,13,0.35)]";

/* Perf budget: backdrop-filter cost scales with blurred area × radius, and
   in-flow glass re-samples on every scroll frame. blur-lg (16px) reads the
   same as blur-xl over our low-frequency canvas at ~2/3 the GPU cost — don't
   raise these without checking scroll perf on a low-end device. */
export const GLASS_LIGHT =
  "border border-white/55 bg-white/50 text-[#0d0d0d] shadow-[inset_0_1px_0_rgba(255,255,255,0.7),0_18px_50px_-28px_rgba(0,0,0,0.35)] ring-1 ring-black/[0.07] backdrop-blur-lg";
export const GLASS_INK =
  "border border-white/[0.16] bg-[#0d0d0d]/60 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.22),0_24px_60px_-30px_rgba(0,0,0,0.55)] backdrop-blur-lg";

/* Cheap glass for small chips/pills: tiny blurred area, safe to scatter. */
export const GLASS_CHIP =
  "border border-white/60 bg-white/60 shadow-[inset_0_1px_0_rgba(255,255,255,0.7),0_1px_2px_rgba(13,13,13,0.04)] ring-1 ring-black/[0.07] backdrop-blur-md";

export function GlassPanel({
  variant = "light",
  className,
  children,
}: {
  variant?: "light" | "ink";
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "rounded-3xl",
        variant === "light" ? GLASS_LIGHT : GLASS_INK,
        className
      )}
    >
      {children}
    </div>
  );
}

/**
 * Aurora-through-glass: the brand's single color moment. The multicolor
 * AiGlow engine blooms behind a frosted light panel so the color arrives as
 * light bleeding through glass. AiGlow already handles reduced motion at the
 * CSS layer (transform/opacity keyframes only) and pauses off-screen.
 */
export function AuroraPanel({
  active = false,
  className,
  panelClassName,
  children,
}: {
  /** "active" speeds + brightens the bloom (processing in flight). */
  active?: boolean;
  className?: string;
  panelClassName?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("relative", className)}>
      <div
        aria-hidden
        className="absolute -inset-10 -z-10 overflow-hidden rounded-[3rem]"
      >
        <AiGlow mode={active ? "active" : "idle"} density="standard" blur={56} />
      </div>
      <GlassPanel variant="light" className={panelClassName}>
        {children}
      </GlassPanel>
    </div>
  );
}

/**
 * The contained imagery stage (backdrop strategy B): abstract-mist Higgsfield
 * asset in a rounded band; glass chips slot in as children. The imagery never
 * goes full-viewport — the canvas around it stays #fafafa editorial.
 */
export function HeroBand({
  className,
  children,
  priority = false,
}: {
  className?: string;
  children: React.ReactNode;
  /** Set on above-the-fold bands (dashboard) so the image preloads. */
  priority?: boolean;
}) {
  return (
    <section
      className={cn(
        "relative overflow-hidden rounded-3xl border border-black/[0.06]",
        className
      )}
    >
      <Image
        src="/app/hero-mist.jpg"
        alt=""
        fill
        loading={priority ? "eager" : undefined}
        sizes="(min-width: 1024px) 72rem, 100vw"
        className="object-cover"
      />
      <div className="relative">{children}</div>
    </section>
  );
}
