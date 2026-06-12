# Atlas User App — Cinematic Redesign (Design Spec)

Date: 2026-06-11
Status: Approved direction, pending plan
Prior art: `docs/superpowers/specs/2026-06-11-auth-cinematic-redesign-design.md`, `atlas-landing-redesign-prompt.md`, `atlas-marketing-pages-tuning-prompt.md`

## Goal

Convert the entire user app — dashboard, capture/processing, note view, settings, onboarding, admin — from rivo-light (Geist, boxy 4px, green #0a5736) to the cinematic-light design language already shipped on marketing and auth, with a new **liquid-glass** surface vocabulary. Zero functionality loss. The only deliberate feature deltas: the theme system is retired (light-only) and the green identity is dropped.

## Locked decisions (user-approved)

1. **Full cinematic conversion.** App adopts Inter Tight + Instrument Serif italic accents; green identity dropped entirely. Marketing and app become one continuous brand.
2. **Backdrop strategy B — "editorial light with glass moments."** Canvas stays `#fafafa`. Imagery lives in a contained hero band (dashboard); glass cards float over that band. The rest of each page is clean hairline editorial. Not full-viewport imagery.
3. **Processing glow A — "aurora through glass."** The glow survives as the brand's single color moment: a soft multicolor (blue/violet/peach/mint) conic blur bleeding from *behind* a frosted glass card. Replaces `AiGlow`.
4. **Scope: everything, student-first order.** Dashboard → capture → note view → settings → onboarding → admin. Admin gets the same system at pragmatic density (no hero band).
5. **Light-only.** Theme provider/selector/sync removed from the app. Deliberate retirement, not accidental loss.
6. **Note view = editorial reading page.** The note reads like an article on `#fafafa`; glass is reserved for chrome (sticky header, transcript sheet, line-chat popover, floating actions).
7. **Sidebar B — dark liquid-glass rail.** Floating, inset from viewport edge, rounded; *genuinely* glassy per Apple's liquid-glass: real translucency (`rgba(13,13,13,~0.6)` + heavy `backdrop-blur`), specular top edge (`inset 0 1px 0 rgba(255,255,255,…)`), inner hairline border. Not a flat dark fill. Canvas visibly scrolls behind it.
8. **Imagery art direction B — "abstract mist."** Near-monochrome warm-gray diffused light, generated via Higgsfield (GPT Image 2). Chosen asset committed at `public/app/hero-mist.jpg` (1920w, ~98KB). Source: Higgsfield job `e792367d`. All future in-app imagery (empty states, additional bands) follows this family.
9. **Approach: primitives first, then surfaces.** Phase 0 builds the shared kit; each surface then converts using it. One commit per phase, pushed to main.

Out of scope (noted for later): user-selectable hero themes / user-uploaded hero imagery; cinematic dark mode.

## Design tokens (app scope)

Same as marketing/auth: canvas `#fafafa`, ink `#0d0d0d`, hairline `border-black/[0.12]`, divider `bg-black/[0.08]`, ease `[0.22,1,0.36,1]`, pill geometry (`rounded-full` controls, generous radii on cards), Inter Tight headings weight 400 tight tracking with exactly one Instrument Serif italic accent phrase per heading. Fonts loaded in the `(app)` layout via `next/font` (scoped exactly like `(auth)`; marketing/auth bundles untouched). Rivo tokens (Geist, 4px radii, greens) retired from app surfaces; `globals.css` token edits require a full `.next` wipe (Turbopack cache gotcha).

### Liquid-glass recipes

- **Light glass** (over imagery): `bg-white/50`, `backdrop-blur-xl`, `border border-white/55`, `shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]`, ink text.
- **Ink glass** (rail, dark chips, tour bubbles): `bg-[#0d0d0d]/60`, `backdrop-blur-xl`, `border border-white/[0.18]`, `shadow-[inset_0_1px_0_rgba(255,255,255,0.25)]`, white text.
- Exact alphas tuned once in the primitives and never hand-rolled per page.

## Phase 0 — Primitive kit

New shared module(s) under `src/components/app/`:

- `GlassPanel` — core surface, `variant="light" | "ink"`, optional specular edge off for nested use.
- Pill primitives — promote the auth constants (`PILL_PRIMARY`, `PILL_SECONDARY`, `PILL_INPUT`, `GHOST_LINK`, `INK_LINK`, `ARROW_BADGE`) from `auth-form.tsx` into a shared export consumed by both auth and app.
- `HeroBand` — contained rounded imagery stage using `public/app/hero-mist.jpg`, slots for glass chips. Dashboard-first; smaller variants allowed elsewhere.
- `AuroraGlow` — conic multicolor blur rendered behind a `GlassPanel`; slow rotation/scale breathing. `useReducedMotion` → static soft gradient. Replaces `src/components/ui/ai-glow.tsx` everywhere; AiGlow deleted in final sweep.
- `(app)` layout: load fonts, remove theme infrastructure, restyle shell.
- Shell: dark liquid-glass rail (decision 7) with active item as white-glass pill; admin badge, unread count, avatar, mobile glass drawer and glass top bar preserved.

## Surfaces

### Dashboard
Hero band: mist imagery; greeting chip (light glass, serif-italic name), headline stat chip (ink glass), profile-incomplete link as small glass pill inside the band. Stats: hairline pill row on canvas (replaces 4 boxy stat cards; same 4 metrics + count-up if present). Record CTA: ink pill + arrow badge (auth recipe). Note cards: white, hairline, pill status chips; processing cards get a subtle aurora edge behind the card. Tips → editorial aside, serif-italic heading. Empty state: glass card inside the hero band. Untouched logic: `DashboardStaleRefresh`, `RealtimeRefresh`, streak computation, `unstable_dynamicStaleTime`, quick-record gating.

### Capture (upload page, recorder, uploader, capture panel, processing overlay, recording dock)
Editorial stage; controls pill-ified; waveform kept, recolored ink-on-light. `ProcessingOverlay`: frosted `#fafafa` overlay, AuroraGlow behind a light GlassPanel containing stage copy ("Atlas is *writing your notes*"), rotating `ThinkingStatus` lines, progress bar (ink on hairline track). All states preserved: determinate/indeterminate progress, 20s long-run hint, safe-to-leave, and all issue kinds (`silent`/`timeout`/`failed`/`capacity`) restyled ink-on-light with alert glyphs (no `text-destructive`), retry/clear/discard/download actions intact. Recording dock: floating ink-glass pill, waveform + timer + controls inside.

### Note view
Editorial article on `#fafafa`: Inter Tight title with one serif-italic accent, course capsule as hairline pill, hairline dividers between summary / key concepts / sections. Concept cards → editorial list with pill chips. Glass chrome: sticky header (light glass) on scroll, transcript panel as glass side sheet, line-chat popover as glass card, note actions as pill row. TipTap rich editor restyled via typography only — zero behavior change; bodyHtml flow untouched. Processing/enrichment watchers keep all states, aurora treatment inline. Source bubbles, title editor, session logic untouched.

### Settings
Editorial sections with hairline dividers (no card grid). Identity card → strip with avatar; memory panel and passkeys panel → clean lists with pill actions. Theme selector removed (decision 5). All server actions/API behavior identical.

### Onboarding
Onboarding flow, UI tour, spotlight overlay → pills + ink-glass tour bubbles. Passkey-enrollment prompt (left old-style in the auth pass) converted now.

### Admin (7 pages)
Same system, pragmatic density: editorial tables, hairlines, pill actions, glass for sticky chrome only, no hero band. Every action preserved: user ban/unban, gemini restore, logout-all, site announcements, newsroom CRUD/editor, feedback inbox (unread logic), processing monitor, jobs list/refresh.

### Toasts / global
Marketing/auth toast language already cinematic; app toasts adopt the same recipe (light glass, ink text). Access-revocation guard and account-locked modal already converted (auth pass) — verify only.

## Functionality-safety protocol

- Per surface, before conversion: inventory interactive elements, watchers, realtime hooks, error/empty/loading states from current code. After: re-check the same inventory.
- Restyle-only rule: no changes to data fetching, server actions, API calls, or state logic. Markup, classes, motion only.
- Known gotchas: `react-hooks/set-state-in-effect` lint rule (use `Promise.resolve(v).then(set)`); `useReducedMotion` gating required on all framer inline transitions; focus-visible rings on all pills/inputs; preview tool quirks (port 3001 strays, native-setter for inputs, retake first screenshot).

## Verification (per phase)

- Desktop + mobile screenshots from dev server; exercise live states where safe.
- Grep acceptance in touched files: no `rounded-[4px]`, `font-bold`, `text-primary`, `bg-card`, `text-destructive`, no Geist references.
- Fonts loaded only in intended layout files.
- Lint clean (11 pre-existing errors in unrelated files excepted); full test suite (92 tests) green.
- `.next` wipe after `globals.css` token changes.

## Process & handoff

- One commit per phase, pushed to main: Phase 0 kit → dashboard → capture → notes → settings → onboarding → admin → final sweep (delete AiGlow, theme files, rivo tokens, dead styles).
- Subagent-driven execution per the implementation plan (writing-plans next).
- Living progress file `docs/superpowers/plans/2026-06-11-app-cinematic-redesign-PROGRESS.md` updated after every phase: done (with SHAs), in flight, next, locked decisions, asset URLs — so any agent can resume cold.
