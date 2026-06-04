/**
 * The shared spatial canvas that sits behind every page — the indigo-violet
 * aurora, a faint blueprint grid, and two slowly drifting blooms that give the
 * background a sense of living depth instead of a flat fill.
 *
 * Performance: fixed, `pointer-events-none`, and fully static — painted once.
 * It deliberately doesn't animate. Frosted glass (`backdrop-filter`) is used
 * pervasively across the app shell, and each such surface must re-rasterize its
 * blur every frame this backdrop moves — a drifting background multiplied into
 * an app-wide GPU stall in Chrome. A still canvas lets every glass blur be
 * cached once. Reused on both the marketing and app shells so the whole product
 * floats on one continuous background.
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

      {/* Static ambient blooms — depth from layered radials, not motion. */}
      <div className="spatial-bloom spatial-bloom--a" />
      <div className="spatial-bloom spatial-bloom--b" />
    </div>
  );
}
