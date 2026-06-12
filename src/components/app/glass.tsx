import Image from "next/image";
import { cn } from "@/lib/utils";
import { AiGlow } from "@/components/ui/ai-glow";

/**
 * Liquid-glass surface recipes (spec: app cinematic redesign). Tuned once
 * here — never hand-rolled per page. Both read as real glass: translucent
 * fill, heavy backdrop blur, specular top edge, hairline inner border.
 */
export const GLASS_LIGHT =
  "border border-white/55 bg-white/50 text-[#0d0d0d] shadow-[inset_0_1px_0_rgba(255,255,255,0.7),0_18px_50px_-28px_rgba(0,0,0,0.35)] backdrop-blur-xl";
export const GLASS_INK =
  "border border-white/[0.16] bg-[#0d0d0d]/60 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.22),0_24px_60px_-30px_rgba(0,0,0,0.55)] backdrop-blur-xl";

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
