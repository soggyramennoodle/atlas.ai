/**
 * The shared spatial canvas that sits behind every page — the indigo-violet
 * aurora, a faint blueprint grid, and two slowly drifting blooms that give the
 * background a sense of living depth instead of a flat fill.
 *
 * Performance: fixed and `pointer-events-none`. The static aurora + grid are
 * painted once; the only motion is `transform`/`opacity` on the two promoted
 * bloom layers (compositor-only). The drift is cheap on its own — the past
 * Chrome stall came from many `backdrop-filter` glass surfaces re-blurring this
 * moving backdrop every frame, so that stack was thinned out (see globals.css
 * `.spatial-bloom`). Keep live backdrop-filter surfaces over this layer few.
 * Drift is disabled under `prefers-reduced-motion`. Reused on both the
 * marketing and app shells so the whole product floats on one background.
 */
export function SpatialBackground() {
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
    >
      {/* Static aurora wash + architectural grid (masked to fade downward). */}
      <div className="absolute inset-0 bg-aurora opacity-70" />
      <div className="absolute inset-0 bg-grid opacity-30 [mask-image:radial-gradient(75%_60%_at_50%_0%,black,transparent)]" />

      {/* Slowly drifting ambient blooms — the living "glow" of the canvas. */}
      <div className="spatial-bloom spatial-bloom--a" />
      <div className="spatial-bloom spatial-bloom--b" />
    </div>
  );
}
