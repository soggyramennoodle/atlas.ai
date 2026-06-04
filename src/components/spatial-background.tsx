/**
 * The shared spatial canvas that sits behind every page — the indigo-violet
 * aurora, a faint blueprint grid, and two slowly drifting blooms that give the
 * background a sense of living depth instead of a flat fill.
 *
 * Performance: fixed and `pointer-events-none`, painted once. The only motion
 * is `transform`/`opacity` on the two promoted bloom layers (compositor-only —
 * no reflow, no repaint), and it is fully disabled under
 * `prefers-reduced-motion`. Reused on both the marketing and app shells so the
 * whole product floats on one continuous background.
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

      {/* Drifting ambient blooms — transform-only motion for living depth. */}
      <div className="spatial-bloom spatial-bloom--a" />
      <div className="spatial-bloom spatial-bloom--b" />
    </div>
  );
}
