import Image from "next/image";
import { cn } from "@/lib/utils";
import { AiGlow } from "@/components/ui/ai-glow";
import { BgDebugPanel } from "@/components/app/bg-debug-panel";

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
/*
 * Background tuning is driven by CSS custom properties so the dev BgDebugPanel
 * can dial them live, then the chosen values get baked into the fallbacks here:
 *   --atlas-bg-dim   dark veil opacity over the scene (tones it DOWN)   default .2
 *   --atlas-bg-haze  white veil opacity over the scene (fades it)       default 0
 *   --atlas-bg-blur  px blur applied to the scene image                 default 0
 *   --atlas-glass    dark liquid-glass fill alpha (see GLASS_DARK)       default .46
 * To lock a value: change the fallback in the relevant var() below (bg layers)
 * or in GLASS_DARK (glass fill), then the panel can be removed.
 */
export function AppCanvas() {
  return (
    <>
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10">
      {/* The scene. object-cover, centered; tolerant of crop on any viewport.
          contrast/saturate give the glass tonal variation to refract; blur is
          the tunable softness dial. */}
      <Image
        src="/app/meadow-scene.jpg"
        alt=""
        fill
        priority
        sizes="100vw"
        className="object-cover [filter:contrast(1.08)_saturate(1.12)_blur(calc(var(--atlas-bg-blur,0)*1px))]"
      />
      {/* Dark veil — the primary "tone it down" dial. Dimming the scene lets the
          dark liquid glass cohere instead of fighting a bright photo. */}
      <div className="absolute inset-0 bg-[rgba(10,12,16,var(--atlas-bg-dim,0.2))]" />
      {/* Haze veil — optional white fade if the scene should read paler. */}
      <div className="absolute inset-0 bg-[rgba(255,255,255,var(--atlas-bg-haze,0))]" />
      {/* Bottom fade — dissolves the hills into the warm canvas. */}
      <div className="absolute inset-x-0 bottom-0 h-[18vh] bg-[linear-gradient(to_top,#f4f3f1,rgba(244,243,241,0)_100%)]" />
      {/* Film grain, on top of everything. */}
      <div
        className="absolute inset-0 opacity-[0.08]"
        style={{ backgroundImage: `url("${GRAIN_SVG}")`, backgroundSize: "160px 160px" }}
      />
    </div>
    {/* Dev-only: live background/glass tuning sliders. Rendered OUTSIDE the
        -z-10 layer so it's clickable. Removed once values are locked into the
        var() fallbacks above + in GLASS_DARK. */}
    {process.env.NODE_ENV === "development" && <BgDebugPanel />}
    </>
  );
}

/** The standard raised white card on the warm canvas: hairline + soft ambient
 *  shadow. Use this instead of bare `bg-white border-black/[0.08]` so every
 *  card separates from the canvas the same way. */
export const CARD =
  "rounded-3xl border border-black/[0.08] bg-white shadow-[0_1px_2px_rgba(13,13,13,0.04),0_24px_60px_-44px_rgba(13,13,13,0.35)]";

/* LIQUID GLASS, not frost. The look is clarity + refraction, not blur: tiny
   blur radius, low white fill so the scene reads THROUGH the pane, heavy
   saturate/brightness so refracted light comes alive, and a bright specular
   rim + top highlight + inner lens glow that sell it as a curved sheet of
   glass. Legibility on the clear fill is carried by TEXT_ON_GLASS (a white
   text halo), not by frosting the surface opaque.
   Perf: blur radius is now SMALL, so backdrop-filter cost is well under the
   old blur-lg budget even with saturate added. */

/** White text-halo so dark text stays legible on clear light glass over a
 *  contrasty scene. text-shadow is inherited, so set it on the glass root. */
export const TEXT_ON_GLASS = "[text-shadow:0_1px_3px_rgba(255,255,255,0.65)]";
/** Dark text-halo for white text on the clear ink glass. */
export const TEXT_ON_INK = "[text-shadow:0_1px_3px_rgba(0,0,0,0.45)]";

/* Floating chrome (hero tile, masthead glass, panels). Clear, low blur. */
export const GLASS_LIGHT =
  "border border-white/70 bg-white/20 text-[#0d0d0d] shadow-[inset_0_1px_0_rgba(255,255,255,0.9),inset_0_-10px_24px_-14px_rgba(255,255,255,0.55),0_18px_45px_-26px_rgba(0,0,0,0.4)] ring-1 ring-black/[0.05] backdrop-blur-[3px] backdrop-saturate-[1.8] backdrop-brightness-[1.08] [text-shadow:0_1px_3px_rgba(255,255,255,0.65)]";
export const GLASS_INK =
  "border border-white/25 bg-[#0d0d0d]/42 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.3),inset_0_-10px_24px_-14px_rgba(255,255,255,0.12),0_24px_55px_-30px_rgba(0,0,0,0.6)] backdrop-blur-[3px] backdrop-saturate-[1.6] backdrop-brightness-[1.04] [text-shadow:0_1px_3px_rgba(0,0,0,0.45)]";

/* Cheap glass for small chips/pills. */
export const GLASS_CHIP =
  "border border-white/70 bg-white/22 shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_1px_2px_rgba(13,13,13,0.06)] ring-1 ring-black/[0.05] backdrop-blur-[2px] backdrop-saturate-[1.8] backdrop-brightness-[1.06] [text-shadow:0_1px_3px_rgba(255,255,255,0.65)]";

/** Liquid-glass reading card for the dashboard library (NoteCard / QuickRecord).
 *  A hair more fill than the chrome so titles + meta stay readable (the
 *  "middle" clarity), still clearly see-through. Pair with TEXT_ON_GLASS. */
export const GLASS_LIQUID_CARD =
  "rounded-3xl border border-white/70 bg-white/28 text-[#0d0d0d] shadow-[inset_0_1px_0_rgba(255,255,255,0.9),inset_0_-12px_28px_-16px_rgba(255,255,255,0.5),0_20px_50px_-30px_rgba(0,0,0,0.42)] ring-1 ring-black/[0.05] backdrop-blur-[3px] backdrop-saturate-[1.7] backdrop-brightness-[1.06] [text-shadow:0_1px_3px_rgba(255,255,255,0.65)]";

/**
 * DARK liquid glass — the primary app surface now (cards, tiles, chips,
 * buttons). White text on a translucent dark fill reads cleanly over ANY part
 * of the scene (bright sky or dark hills), which light glass could not. Same
 * family as the sidebar RAIL_GLASS. Fill alpha is the live-tunable `--atlas-glass`
 * (BgDebugPanel); bake the chosen value into the fallback below. No radius here
 * — add `rounded-*` at the call site. Pair interactive surfaces with GLASS_HOVER.
 */
export const GLASS_DARK =
  "border border-white/20 bg-[rgba(13,13,13,var(--atlas-glass,0.46))] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.28),inset_0_-12px_30px_-18px_rgba(255,255,255,0.12),0_22px_55px_-30px_rgba(0,0,0,0.62)] ring-1 ring-white/[0.06] backdrop-blur-[5px] backdrop-saturate-[1.6] [text-shadow:0_1px_3px_rgba(0,0,0,0.45)]";

/** Clean hover for interactive dark-glass surfaces (cards, buttons): a small
 *  lift, brighter top edge, deeper shadow. Reduced-motion safe. */
export const GLASS_HOVER =
  "transition-[transform,box-shadow,border-color] duration-300 ease-out hover:-translate-y-1 hover:border-white/35 hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.45),0_32px_72px_-30px_rgba(0,0,0,0.72)] motion-reduce:transition-none motion-reduce:hover:translate-y-0";

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
