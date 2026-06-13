# Dark Liquid Glass migration — continuation doc

**Goal:** move the whole app surface to **dark liquid glass + white text** (same
family as the sidebar `RAIL_GLASS`), because light glass + dark text failed for
legibility over the bright meadow scene. Pair it with a **toned-down background**
(no new image generation — just tunable veil/blur layers) so the dark elements
cohere instead of fighting a bright photo.

This is staged: **Stage 1 = dashboard (DONE), Stage 2 = notes view, Stage 3 =
record/upload screen.** Read this whole file before touching code.

---

## The design system (already built in `src/components/app/glass.tsx`)

Use these — never hand-roll a glass surface.

- **`GLASS_DARK`** — the primary surface now. Translucent dark fill + white text,
  hairline white border, specular top edge. **No radius baked in** — add
  `rounded-3xl` (cards/tiles/panels) or `rounded-full` (chips/pills) at the call
  site. Fill alpha is the live var `--atlas-glass` (see slider protocol).
- **`GLASS_HOVER`** — clean hover for *interactive* dark-glass surfaces (cards,
  buttons): slow easeOutExpo lift + brighter top edge + deeper shadow. Add it
  alongside `GLASS_DARK` on links/buttons, NOT on static panels (Tips). It's just
  the string `"glass-lift"` → the real CSS class lives in `globals.css`.

> ⚠️ **Tailwind v4 gotcha (cost a round-trip):** arbitrary values with TOP-LEVEL
> commas silently emit nothing — `transition-[transform,box-shadow,border-color]`
> and `[transition:a,b,c]` both produced NO transition, so hovers read as
> *instant*. Commas inside `cubic-bezier(...)` / `ease-[...]` are fine (inside
> parens). Rules: for multi-property transitions use a real CSS class (see
> `.glass-lift`) or the bare `transition` utility (it covers transform/shadow/
> border/opacity/etc. with no comma) + `duration-* ease-[...]`. Don't hand-write
> comma'd `transition-[...]`.
- **`TEXT_ON_INK`** — dark text-halo (`text-shadow`) for white text; already
  inside `GLASS_DARK`. For **floating** white text that sits directly on the
  scene (headings, not on glass), use a stronger glow:
  `text-white [text-shadow:0_2px_20px_rgba(0,0,0,0.5)]`.
- Legacy light recipes still exported (`GLASS_LIGHT`, `GLASS_INK`,
  `GLASS_LIQUID_CARD`, `GLASS_CHIP`, `CARD`, `HeroBand`, `GlassPanel`) — these are
  what we're migrating AWAY from. `HeroBand`/`GlassPanel` are no longer used on
  the dashboard; once Stages 2–3 are done, check for remaining refs and delete the
  dead ones.

### Conversion patterns (the recipe used on the dashboard)

| Old (light) | New (dark) |
|---|---|
| `GLASS_LIQUID_CARD` / `CARD` / `GLASS_LIGHT` panel | `cn(GLASS_DARK, "rounded-3xl ...")` (+ `GLASS_HOVER` if interactive) |
| `GLASS_CHIP` pill | `cn(GLASS_DARK, "rounded-full ...")` |
| `text-[#0d0d0d]` (main) | `text-white` |
| `text-[#0d0d0d]/55–60` (muted) | `text-white/65–70` |
| `text-[#0d0d0d]/45` (faint label) | `text-white/55` |
| `border-black/[0.1–0.12]` | `border-white/20–25` |
| hover `bg-white/40`, `border-black/25` | rely on `GLASS_HOVER`; drop the white-fill hovers |
| white halo `text-shadow:...rgba(255,255,255,..)` | dark halo `...rgba(0,0,0,0.45–0.5)` |

**Keep these LIGHT/solid on purpose (do not darken):**
- **Primary CTA buttons stay white solid** (`bg-white text-[#0d0d0d]`) — the
  brightest thing on the page = the one primary action. (Dashboard record tile,
  empty-state CTA both do this.)
- The little **mic/icon badge circles** inside dark cards are `bg-white
  text-[#0d0d0d]` for contrast (see `quick-record.tsx`).
- The **AiGlow / AuroraPanel rainbow + processing glow** = the brand's single
  color moment. Keep the rainbow border/`ai-ring`; just put it on dark glass
  instead of white (see Stage 2, summary + concept-open).

---

## Background — LOCKED ✅ (slider removed)

The dev `BgDebugPanel` has been **deleted** and the dialed-in values baked into the
`var()` fallbacks in `glass.tsx`:

| var | locked value |
|---|---|
| `--atlas-bg-dim` | `0.48` (AppCanvas dark-veil layer) |
| `--atlas-bg-haze` | `0` |
| `--atlas-bg-blur` | `0` |
| `--atlas-glass` | `0.49` (GLASS_DARK fill) |

Also: the old white bottom fade (`#f4f3f1` → transparent) was replaced with a soft
**black bottom vignette** (`rgba(0,0,0,0.5)` → transparent, `h-[26vh]`) so the foot
of the scene grounds instead of fading to a flat band. To re-tune later, just edit
those fallbacks (or temporarily re-add a slider that sets the same `:root` vars).

---

## Stage 1 — Dashboard ✅ DONE

Files changed (all in `src/components/dashboard/` unless noted):
- `glass.tsx` — added `GLASS_DARK`, `GLASS_HOVER`, the `--atlas-*` vars + tunable
  AppCanvas veil/blur layers, and wired in `BgDebugPanel`. Added `bg-debug-panel.tsx`.
- `note-card.tsx` — `GLASS_LIQUID_CARD` → `GLASS_DARK + GLASS_HOVER`; chips, meta,
  subject capsule, status chips all white-on-dark; failed chip = red-tinted glass.
- `quick-record.tsx` — dark glass + `GLASS_HOVER`; mic badge flipped to white circle.
- `stat-cards.tsx` — `GLASS_CHIP` → `GLASS_DARK` pills, white text.
- `tips.tsx` — `CARD` → `GLASS_DARK` (no hover; it's static).
- `empty-state.tsx` — rewritten: dark-glass panel (no `HeroBand` image), white CTA.
- `greeting.tsx` — floating heading flipped to **white + dark halo**.
- `dashboard/page.tsx` — hour tile: `HeroBand`+`GlassPanel ink` → pure `GLASS_DARK`
  (no own image), white CTA kept; "X total" chip → dark glass; "Your library"
  heading + profile link → white + dark halo.

**User decisions locked:** dark glass = primary surface; white text; primary CTAs
stay white solid; floating headings = **white + dark halo**; rainbow/glow kept as
the one color accent on dark glass.

---

## Stage 2 — Notes view ✅ DONE

Converted the whole notes view to dark glass + white text (build passes):
- `glass.tsx` — added `GLASS_DARK_PILL` + `DARK_FIELD` primitives; `AuroraPanel`
  gained a `variant` prop (used `ink` for the processing state).
- `globals.css` — scoped `.note-surface .note-prose` dark theme (white text/
  headings/bullets/caret/selection) so the body + TipTap editor read white-on-dark
  only inside the dark plate; newsroom/other prose untouched.
- `notes/[id]/page.tsx` — "Library" back link → dark glass pill; ReportButton given
  a dark className override (its REPORT_PILL supports it via tailwind-merge).
- `note-actions.tsx` — ghost pills, export dropdown, delete-confirm (red) → dark.
- `note-session.tsx` / `note-title-editor.tsx` / `course-capsule.tsx` — meta + the
  big title sit on the scene → white + dark halo; inline editors → dark fields;
  save buttons → white solid.
- `summary-card.tsx` — `GLASS_DARK`, kept the rainbow `processing-glow`; regenerate
  pill + caret recolored.
- `transcript-panel.tsx` — `GLASS_DARK`, white text, white-on-dark icon badge.
- `note-view.tsx` — note body now wrapped in one `GLASS_DARK .note-surface` plate
  that grows with content; `NOTE_GHOST_PILL`/`NOTE_INPUT`, headings, enriching
  banner, SectionView, ConceptBlock, Add-concept, ProcessingNoteState (AuroraPanel
  `ink`), Done button (white), floating edit pill (dark), autosave + AI-stream text.
- `rich-note-editor.tsx` — editor box + sticky toolbar → dark glass; active tool
  button = white solid; `.note-surface` wrapper so editing is white-on-dark.
- `concept-card.tsx` — base cards → `GLASS_DARK` + `rounded-3xl` (rounder); the
  OPENED overlay stays dark (`GLASS_DARK`, was flipping to white) with `ai-ring`
  kept; dismiss scrim darkened; inner chat surfaces + send button recolored.
- `line-chat.tsx` — ask button, popup panel (`GLASS_DARK` + `ai-ring`), presets,
  turns, Add-to-note (violet on dark), caret, chat input → dark.
- `source-bubble.tsx` — hover excerpt bubble → dark glass; decoration/label colors
  for lecture/research/ai recolored for dark.

Deliberately kept bright: the "Atlas finished reading" cursor popup (meant to pop)
and all primary send/save CTAs (white solid).

## Stage 2 — Notes view (original notes, now done)

Entry: `src/app/(app)/notes/[id]/page.tsx` (back-link at line ~64 is
`text-[#0d0d0d]/55` → white). Components in `src/components/notes/`. The user
called these out specifically:

- **The note body itself** → contain it in a **dark-glass rounded box**, white
  text, that **expands with content** (don't fix its height). Today the note/rich
  text renders without a glass plate. → `src/components/notes/note-view.tsx`
  (+ `rich-note-editor.tsx`). Note the inline `BTN`/input recipes at note-view.tsx
  lines ~73/76 are light (`bg-white text-[#0d0d0d]`) — convert.
- **Summary box** → dark glass but **keep the rainbow border** (it's the color
  moment). `summary-card.tsx` line ~90 is `bg-white border-black/[0.08]` → dark
  glass; keep/relocate the AuroraPanel/`ai-ring` around it. White text for the
  body (line ~129 `text-[#0d0d0d]/80`). The "regenerate"-style button (lines
  ~114–116) → dark-glass pill.
- **Key concept cards** → dark glass; **round the corners more** (currently
  `rounded-2xl` with a white gradient fill at `concept-card.tsx` line ~232 → make
  it `GLASS_DARK rounded-3xl`); when **opened** keep dark glass — today the open
  state uses `GLASS_LIGHT` + `bg-white/90` (lines ~269–271) which turns it WHITE;
  must stay dark. Keep the `ai-ring` rainbow on the open state.
- **Transcript** → dark glass. `transcript-panel.tsx` uses `GLASS_LIGHT` +
  `bg-white/65` (lines ~22–25) and a white icon badge + dark text (~33–37). →
  `GLASS_DARK`, white text, keep the icon badge white-on-dark for contrast.
- **"Library" / un-boxed text & capsules** → buttons/capsules become dark-glass;
  the course capsule (`course-capsule.tsx`), `note-actions.tsx` (export/delete/
  download menus), `note-title-editor.tsx`, `source-bubble.tsx`, `line-chat.tsx`
  all carry light `bg-white`/`#0d0d0d` surfaces → convert with the table above.
  Add `GLASS_HOVER` to the interactive ones.

Grep to find every light surface left in the notes view:
```
grep -rnE "GLASS_LIGHT|GLASS_INK|GLASS_CHIP|GLASS_LIQUID_CARD|bg-white|#0d0d0d" src/components/notes
```
Per-file hit list (from the survey): course-capsule, note-session,
note-title-editor, note-actions, transcript-panel, rich-note-editor, concept-card,
note-view, line-chat, summary-card, source-bubble.

**Watch:** preserve the `ai-ring`/AiGlow rainbow accents; keep TipTap
(`rich-note-editor`) editing affordances working — selection/caret colors may need
white. The note box must grow with content (no clipped/fixed height).

---

## Stage 3 — Record / upload screen ✅ DONE

Converted the whole capture + processing flow to dark glass (build passes):
- `glass.tsx` — added `CTA_WHITE` (white solid primary, size-agnostic).
- `upload/page.tsx` — heading/intro → white + dark halo.
- `capture-panel.tsx` — Record/Upload toggle → dark glass track, active segment
  = white pill.
- `recorder.tsx` — control box → `GLASS_DARK`; status chip/clock/badges → white;
  `WaveRibbon` flipped to `tone="light"`; SourcePicker cards → dark glass; primary
  actions (Stop/Finish/Generate) → `CTA_WHITE`, secondary → `GLASS_DARK_PILL`
  (local `REC_ICON`/`REC_SECONDARY`); FluidTranscript words → white + dark halo.
- `uploader.tsx` — dropzone + selected-file card → dark glass; Generate → `CTA_WHITE`.
- `processing-overlay.tsx` — scrim flipped DARK (`bg-[#0a0c10]/85`) so the AiGlow
  aurora blooms through; panel → `GlassPanel variant="ink"`; progress/chips/buttons
  recolored (local `PO_PRIMARY`/`PO_SECONDARY`).
- `thinking-status.tsx` — default text → white.
- `recording-dock.tsx` — already dark glass (the reference); untouched.
- `wave-ribbon.tsx` — already had `tone` support; untouched (callers pass tone).

Note: a stray untracked `src/components/upload/capture-panel 2.tsx` (duplicate,
unused, not imported) exists — left alone, not committed. Safe to delete.

**Migration complete.** Background tuner already removed; if anything still reads
light, grep `text-\[#0d0d0d\]|bg-white\b|border-black` per surface.

---

## Verify before claiming done

- `npx tsc --noEmit` clean.
- Run the app (`/run` skill or the project's dev command) and eyeball the
  dashboard, a note, and the record screen over the scene — check white text
  legibility at the user's chosen `--atlas-bg-dim`.
- Don't delete `bg-debug-panel.tsx` until the user gives final slider values and
  they're baked into the `var()` fallbacks.
