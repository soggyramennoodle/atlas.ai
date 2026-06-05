/**
 * The marketing canvas: a clean white field with a faint blueprint line grid,
 * masked so it fades out toward the edges and never competes with content. No
 * colour, no glow. The living multicolor AI glow is reserved for AI-powered
 * surfaces, so the landing page reads calm and rivo-minimal. Fully static and
 * painted once (fixed, pointer-events-none).
 */
export function MarketingBackground() {
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-background"
    >
      <div className="absolute inset-0 bg-blueprint [mask-image:radial-gradient(115%_85%_at_50%_-5%,black,transparent_72%)]" />
    </div>
  );
}
