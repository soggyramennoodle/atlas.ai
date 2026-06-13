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
 * The app's atmospheric backdrop: a quiet, high-key dawn-meadow scene fixed
 * behind every app page, washed light enough that text stays legible and glass
 * panels finally have something to refract. Pure CSS + one static <Image> — no
 * animation. Parent must be `isolate` so the -z-10 layers sit above its bg.
 *
 * Presence is tuned by the two wash layers below: the TOP wash is the primary
 * legibility guard *and* the "quiet ↔ bold" dial. Lower its opacities (and/or
 * regenerate the scene with more contrast) if glass reads flat — see the design
 * doc's escape hatch.
 */
export function AppCanvas() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10">
      {/* The scene. object-cover, centered; tolerant of crop on any viewport. */}
      <Image
        src="/app/meadow-atmosphere.jpg"
        alt=""
        fill
        priority
        sizes="100vw"
        className="object-cover"
      />
      {/* Faint veil: barely mutes the scene so it reads as backdrop, not photo.
          Raise toward 0.2 to quiet it; lower toward 0 to make it more scenic. */}
      <div className="absolute inset-0 bg-white/[0.06]" />
      {/* Top wash — a soft white lift over just the masthead band so the big
          heading stays high-contrast. The scene must still show through, so this
          is light. Primary presence + legibility dial. */}
      <div className="absolute inset-x-0 top-0 h-[34vh] bg-[linear-gradient(to_bottom,rgba(255,255,255,0.55),rgba(255,255,255,0.12)_55%,rgba(255,255,255,0)_100%)]" />
      {/* Bottom fade — dissolves the hills into the warm canvas instead of a
          hard photo edge. */}
      <div className="absolute inset-x-0 bottom-0 h-[18vh] bg-[linear-gradient(to_top,#f4f3f1,rgba(244,243,241,0)_100%)]" />
      {/* Film grain, on top of everything. */}
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
/* Floating chrome (hero tile, masthead glass, panels) — NOT text-heavy reading
   surfaces, which stay on opaque CARD. Fill dropped to /40 so the meadow shows
   through, and backdrop saturate/brightness make light bending through the pane
   gain the faint colour-lift of real glass. Don't raise blur radius (perf). */
export const GLASS_LIGHT =
  "border border-white/55 bg-white/40 text-[#0d0d0d] shadow-[inset_0_1px_0_rgba(255,255,255,0.7),0_18px_50px_-28px_rgba(0,0,0,0.35)] ring-1 ring-black/[0.07] backdrop-blur-lg backdrop-saturate-150 backdrop-brightness-105";
export const GLASS_INK =
  "border border-white/[0.16] bg-[#0d0d0d]/55 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.22),0_24px_60px_-30px_rgba(0,0,0,0.55)] backdrop-blur-lg backdrop-saturate-150";

/* Cheap glass for small chips/pills: tiny blurred area, safe to scatter. */
export const GLASS_CHIP =
  "border border-white/60 bg-white/50 shadow-[inset_0_1px_0_rgba(255,255,255,0.7),0_1px_2px_rgba(13,13,13,0.04)] ring-1 ring-black/[0.07] backdrop-blur-md backdrop-saturate-150";

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
