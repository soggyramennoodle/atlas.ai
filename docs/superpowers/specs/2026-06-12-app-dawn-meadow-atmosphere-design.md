# Dawn-meadow app atmosphere + dashboard refinement

**Date:** 2026-06-12
**Status:** Design — awaiting implementation plan
**Surface:** App shell (`(app)` layout), dashboard, record/upload screen

## Problem

The dashboard reads "plain and bland," and the liquid glass "doesn't even look
glassy." Two root causes, confirmed in code:

1. **The layout is a centered island.** `dashboard/page.tsx` wraps everything in
   `mx-auto max-w-6xl`, leaving dead canvas on both sides — it reads like a
   marketing page, not an app.
2. **Light glass on a near-white canvas can't look like glass.** `GLASS_LIGHT`
   (`bg-white/50` + `blur-lg`) sits on the `#f4f3f1` canvas with essentially
   nothing behind it to refract. Glassiness is a function of what's *behind* the
   pane; there's currently nothing there.

The current app backdrop (`AppCanvas`) is a flat radial light-wash + grain, and
the only real imagery (`HeroBand` → `hero-mist.jpg`) is confined to a small tile
on the dashboard.

## Decision

Stay in the established **cinematic-light** identity (do **not** go dark / full
dark-glass). Instead:

- Give the whole app a quiet, on-brand **atmospheric scene** behind everything,
  so glass finally has something to refract.
- **Left-align** and widen the dashboard so it reads as an app.
- Split surfaces into **opaque reading cards** vs **translucent floating chrome**
  so legibility never suffers.

This was chosen over (a) a full-bleed photo + dark liquid glass (contradicts the
documented "backdrop strategy B" in `glass.tsx`, hurts legibility for a
text-heavy study tool, and splits the app's identity from marketing) and (b) a
layout-only fix (doesn't address "not glassy").

## Goals

- Dashboard and record screen feel atmospheric and intentional, not bland.
- Glass panels visibly read as glass.
- Text legibility is never compromised.
- Visual continuity with the landing page (same "world": grass hills + dawn sky).
- One backdrop change benefits every app page (it lives in the shell).

## Non-goals

- No dark mode / dark liquid glass.
- No full-bleed *vivid* hero photo behind text.
- No change to reading typography, IA, or data on the dashboard.
- No animation of the backdrop.
- No marketing/auth surface changes.

## Architecture

The `(app)` layout (`src/app/(app)/layout.tsx`) renders `<AppCanvas />` as a
`fixed inset-0 -z-10` backdrop behind `<AppShell>` for every app route. This is
the single integration point: enhancing `AppCanvas` propagates the scene to the
dashboard, the record screen, settings, etc. automatically.

```
AppLayout
 ├─ AppCanvas  (fixed, -z-10)   ← scene goes here
 │    ├─ <Image> dawn-meadow scene (object-cover, fixed, full viewport)
 │    ├─ white→transparent TOP wash      (legibility guard)
 │    ├─ soft BOTTOM fade to #f4f3f1     (grounds the canvas)
 │    └─ film grain (existing)
 └─ AppShell → page content (dashboard / recorder / …)
```

## Components & changes

### 1. The scene asset — `public/app/meadow-atmosphere.jpg`

Generated via Higgsfield (GPT Image 2). Direction:

- **Subject/world:** rolling grass hills under a soft dawn sky — the same world
  as `public/landing/hero-poster.jpg`, NOT a new aesthetic.
- **Re-keyed for a UI backdrop (this is the important part):**
  - High-key, desaturated, morning-fog soft. Muted sage greens, pale milky
    sky. No vivid pink, no hard sun, no strong focal subject.
  - **Composition:** hills sit low (bottom ~third); the upper two-thirds is calm,
    near-uniform pale sky. Content/glass floats over *sky*, not busy grass.
  - Light falls gently from the top.
- **Format:** wide (≥16:9), high-res, landscape. Will be rendered `object-cover`
  centered, so keep the meaningful content horizontally centered and tolerant of
  crop.
- **Glassiness caveat (tunable):** the region *behind the floating chrome* must
  retain enough soft tonal variation (a hill edge, a light gradient) for glass to
  refract. If, in-browser, the washed scene is too uniform and glass reads flat,
  the escape hatch is to **increase scene presence** — reduce the top wash
  opacity and/or regenerate the scene with more contrast/vividness (toward the
  bolder/landing-like end). Start quiet; dial up only if needed.

### 2. `AppCanvas` (`src/components/app/glass.tsx`)

Replace the flat light-wash with the layered scene described in Architecture:

- `next/image` of `meadow-atmosphere.jpg`, `fill`, `object-cover`, `priority`,
  fixed full-viewport, `aria-hidden`, `pointer-events-none`.
- **Top wash:** white → transparent vertical gradient over roughly the top
  half, opacity tuned so headings/body over the upper canvas stay high-contrast.
  This is the primary legibility guard and the primary "presence" dial.
- **Bottom fade:** soft fade to `#f4f3f1` so the hills dissolve into the canvas
  rather than ending in a hard line; keeps the existing grounded feel.
- **Grain:** keep the existing `GRAIN_SVG` layer on top at current opacity.
- Keep everything static and CSS/`<Image>`-only — no animation, no JS.

### 3. Glass recipes (`src/components/app/glass.tsx`) — the surface split

The rule: **text-heavy = opaque; floating chrome = translucent.**

- **Reading surfaces** keep `CARD` (opaque white, hairline, ambient shadow).
  Applies to: note cards, the library grid, any text-dense panel. Text never
  sits on the photo.
- **Floating chrome** uses a **strengthened** glass so the meadow shows through
  and it reads as glass. Applies to: the dashboard hero record tile, stat
  chips/pills, masthead glass, the record-screen AI panel.
  - Lower the fill opacity vs today's `bg-white/50` so the scene is visible
    through it (exact value tuned in-browser).
  - Add `saturate(…) brightness(…)` to the `backdrop-filter` alongside the
    existing blur so light bending through the pane gains the faint color/lift
    of real glass.
  - Keep the existing specular top edge (`inset 0 1px 0 …`) and hairline
    ring/border.
- `GLASS_INK` (the dark record tile) stays — it already reads fine; only verify
  it still looks right over the new scene.
- `GLASS_CHIP` gets the same lower-fill / saturate treatment, scaled for small
  area (blur budget noted in existing comments — don't raise blur radius).

### 4. Dashboard layout (`src/app/(app)/dashboard/page.tsx`)

- Replace `mx-auto max-w-6xl` with a **left-anchored** container: generous left
  padding, a wider max width (or controlled full-bleed) so the library grid
  breathes.
- Masthead: greeting + stat strip left-aligned; record tile to the right; the
  whole block anchored left instead of centered.
- Library grid: allow more columns at `lg`/`xl` now that horizontal space is
  reclaimed. Preserve the existing "newest note spans 2 cols" behavior.
- No change to data fetching, status logic, or copy.

### 5. Record/upload screen (`src/components/upload/recorder.tsx`)

- Inherits the scene automatically via `AppCanvas`.
- Apply the strengthened floating-glass recipe to the recording AI panel so the
  `AiGlow` blooms over the meadow intentionally rather than over flat canvas.
- No change to recording logic, transcript, or controls.

## Data flow

None changed. This is presentational: a new static asset, CSS/recipe edits, and
layout container changes. No new state, props, queries, or APIs.

## Legibility & accessibility

- Opaque reading cards mean body/long-form text is never over the photo.
- The top white wash keeps masthead text high-contrast against the scene.
- Verify WCAG AA contrast for: greeting/stat text over the upper canvas, and any
  text on translucent chrome, in-browser after tuning.

## Performance

- One additional static fixed `<Image>` layer (`priority`), `object-cover`, no
  animation — negligible runtime cost.
- Do not raise `backdrop-blur` radii beyond current values (existing comment in
  `glass.tsx` documents the scroll-perf budget); the saturate/brightness and
  lower fill-opacity changes are effectively free.
- Asset must be compressed (target comparable to existing landing JPEGs).

## Testing / verification

- Run the dev server via the preview tooling; verify dashboard + record screen.
- Confirm: glass reads as glass over the scene; text is legible everywhere;
  layout is left-anchored and the grid breathes; no console/network errors.
- Capture before/after screenshots of the dashboard and record screen.
- Check reduced-motion (should be unaffected — static) and a narrow viewport.
- If glass reads flat → apply the tunable escape hatch (§1) and re-verify.

## Files touched

- `public/app/meadow-atmosphere.jpg` (new asset)
- `src/components/app/glass.tsx` (`AppCanvas`, `GLASS_LIGHT`, `GLASS_CHIP`,
  possibly a new `GLASS_CHROME` recipe)
- `src/app/(app)/dashboard/page.tsx` (layout container, masthead, grid)
- `src/components/upload/recorder.tsx` (AI panel glass)

## Open questions

None blocking. Presence level starts "quiet" with a documented escape hatch to
add vividness if glass reads flat (§1).
