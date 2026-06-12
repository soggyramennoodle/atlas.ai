# App Cinematic Redesign — Living Progress

> Handoff file. Any agent can resume from here cold. Update after every phase.
> Spec (all locked decisions, glass recipes, per-surface designs):
> `docs/superpowers/specs/2026-06-11-app-cinematic-redesign-design.md`

## Locked decisions (short form)

Full cinematic conversion of the user app (Inter Tight + Instrument Serif, no green, light-only, theme system retired). Canvas `#fafafa` editorial with glass moments (strategy B). Sidebar = floating dark **liquid-glass** rail (real translucency + blur + specular edge, Apple-liquid-glass quality — user emphasized this). Processing = aurora-through-glass (AiGlow engine kept, now behind frosted GlassPanel — NOT deleted; spec's "delete AiGlow" amended: it already is the aurora engine with compositor-only perf + IntersectionObserver pausing). Note view = editorial reading page, glass chrome only. Imagery = abstract mist family, asset committed at `public/app/hero-mist.jpg` (Higgsfield job e792367d). Admin = same system, pragmatic density, no hero band. Future idea (out of scope): user-selectable hero themes / uploads.

## Phase order & status

| Phase | Surface | Status | Commit |
|---|---|---|---|
| 0 | Primitive kit + fonts + shell (rail, mobile bar/drawer) | DONE | e41747a6 |
| 1 | Dashboard | DONE | b4b9422f |
| 2 | Capture (upload, recorder, uploader, processing overlay, dock) | DONE | 6b04352d |
| 3 | Note view | todo | — |
| 4 | Settings | todo | — |
| 5 | Onboarding + UI tour + passkey prompt | todo | — |
| 6 | Admin (7 pages) | todo | — |
| 7 | Final sweep (theme files, rivo tokens, dead styles) | todo | — |

## ➜ RESUME HERE: Phase 3 (note view) is next

**2026-06-11 late update:** a parallel session left UNCOMMITTED Phase 3 conversions in the working tree (all 13 note files, ~3.4k insertions, on-contract per spot-check of course-capsule). Next agent: review that diff against the contract below, run the verification battery, then commit it as the Phase 3 commit — don't redo the work blind, and don't discard it.

Session ended cleanly at the Phase 2/3 boundary (usage limit). Nothing is half-converted. The next agent should execute Phases 3–7 in order, one commit per phase, updating this file after each. The complete style contract below was written for a Phase 3 subagent — use it verbatim (it works for phases 4–6 too; swap the file list).

### Style contract (apply to every remaining surface)

Files for Phase 3 (restyle ONLY): `src/app/(app)/notes/[id]/page.tsx` + all of `src/components/notes/` (note-view, note-session, summary-card, concept-card, transcript-panel, line-chat, note-actions, note-title-editor, course-capsule, source-bubble, rich-note-editor, processing-watcher, enrichment-watcher). Do NOT touch actions.ts or lib/.

- Note view = **editorial reading page**: article-like on #fafafa. Glass for *chrome only*: sticky header (light glass), transcript panel (glass side sheet), line-chat popover (glass card), floating action rows. Reading content stays plain white/canvas + hairline dividers.
- Consume (never modify): `src/components/app/glass.tsx` (GlassPanel light|ink, GLASS_LIGHT/GLASS_INK, AuroraPanel, HeroBand) and `src/components/app/pills.tsx` (PILL_PRIMARY/SECONDARY/INPUT, *_INLINE, PILL_ICON, GHOST_LINK, INK_LINK, ARROW_BADGE, EASE). Converted exemplars: processing-overlay.tsx, dashboard/note-card.tsx, app-sidebar.tsx.
- Class mapping: text-muted-foreground → text-[#0d0d0d]/55 (60 for body); border-border → border-black/[0.08] cards / [0.12] chips; bg-card → bg-white; bg-secondary hover → bg-black/[0.03]; text-primary/bg-primary → ink; text-foreground → text-[#0d0d0d]; rounded-[4px]/[6px] → rounded-full (controls/chips) or rounded-2xl/3xl (cards); font-bold/semibold → font-normal headings / font-medium UI; eyebrows = text-[11px] font-medium uppercase tracking-[0.2em] text-[#0d0d0d]/45.
- One serif accent per major heading: `<span className="font-instrument italic">…</span>` (fonts already loaded by (app) layout).
- Errors: ink text + Alert glyph, never text-destructive/red blocks. Functional colors: amber warnings, orange capacity, emerald success, red-500 only as tiny recording dot.
- shadcn Button/Badge → pill classes; restyle dropdown/dialog content (rounded-2xl bg-white border-black/[0.08]).
- AI glow surfaces (summary/concepts): keep AiGlow energy but as light through frosted glass (AuroraPanel pattern). Inline glow rings (processing-glow CSS) adapt via border-radius:inherit.
- Motion: keep existing; ease [0.22,1,0.36,1]; gate anything new with useReducedMotion. Lint rule: no sync setState in effects (`Promise.resolve(v).then(set)`).
- Preserve: every data-tour, aria-label, focus-visible ring (add `focus-visible:ring-2 focus-visible:ring-black/25` where shadcn's is lost), every state branch (loading/empty/error/processing/enrichment/held), TipTap behavior (typography-only restyle), watcher/realtime logic.

### Verification per phase (all must pass before commit)
`npx eslint <touched files>` clean · `npm test` 92/92 · grep in touched files finds none of: rounded-[4px], rounded-[6px], font-bold, font-semibold, text-primary, bg-card, text-destructive, text-muted-foreground, border-border, bg-secondary, text-foreground, bg-background · `curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/<route>` compiles (307 = auth redirect = fine; check /tmp/atlas-dev.log for compile errors). Commit straight to main + push, message style: `feat(app): phase N — …` with Co-Authored-By Claude trailer.

### Remaining phases after 3
- Phase 4 settings: editorial sections + hairline dividers, no card grid; identity strip, memory + passkeys as lists with pill actions. Theme selector already removed from sidebar; delete settings' theme UI if present (light-only is a locked decision).
- Phase 5 onboarding: onboarding-flow (uses MarketingBackground — swap to plain #fafafa or HeroBand moment), ui-tour + spotlight-overlay (tour bubbles = ink glass), auth/passkey-enrollment-prompt.tsx (was out of scope in auth pass — convert now).
- Phase 6 admin (7 pages + components in src/components/admin/): same system, pragmatic density, editorial tables, pill actions, glass only for sticky chrome, NO hero band. Preserve all actions (ban, gemini restore, logout-all, announcements, newsroom CRUD, feedback inbox unread logic, processing monitor).
- Phase 7 final sweep: delete theme-provider/theme-sync/theme-selector (check root layout's ThemeProvider — marketing may still need it; verify before removing), remove rivo tokens/dead CSS from globals.css if genuinely unused by marketing (CAUTION: marketing/auth share globals.css), restyle ReportButton dialog (report-dialog.tsx still rivo-styled — its dialog uses bg-card/rounded-[4px]), delete unused shadcn components only if nothing imports them. `.next` wipe after globals.css edits.

## Phase 2 notes (capture, DONE)

- pills.tsx grew inline variants: PILL_PRIMARY_INLINE / PILL_SECONDARY_INLINE / PILL_ICON (auto-width pills for action rows).
- ProcessingOverlay rewritten: aurora-through-glass — AiGlow full bloom behind a light GlassPanel; stage titles have serif-italic accents (STAGE_TITLE JSX map replaced STAGE_COPY); all states preserved (progress, long-run hint via glass card, keep-tab-open amber pill, capacity orange + emerald close-hint, failed pill actions). Light-only (dark: variants dropped).
- Recorder: white rounded-3xl control box; recording = red pulsing dot in hairline chip, paused = amber; waveform ink gradient (amber when paused); shadcn Buttons -> pills; Enclave/saved badges -> hairline pills; SourceCards -> rounded-2xl hairline; FluidTranscript ink text + white glow shadow.
- Uploader: dashed rounded-3xl dropzone, hairline file card, PILL_PRIMARY generate; all chunking/progress/watcher logic untouched.
- RecordingDock: ink liquid-glass (GLASS_INK), white/glass mini pills, amber paused accents.
- thinking-status default class -> ink/60.

## Phase 1 notes (dashboard, DONE)

- Hero band: greeting in light GlassPanel + ink GlassPanel with hours headline + white record pill. Stats pill row carries recordings/concepts/streak (hours moved to the ink chip — the page now passes 3 stats).
- NoteCard keeps processing-glow / capacity-glow rings (CSS uses border-radius:inherit, adapts to rounded-3xl). Status chips: failed = ink pill, capacity = orange (kept as a functional warning color), processing/ready = hairline pills.
- EmptyRecordings = HeroBand + light GlassPanel + PILL_PRIMARY CTA.
- Greeting/QuickRecord/Tips: serif-italic accents, hairline geometry. All data-tour ids, refresh components, streak logic untouched.
- NOT yet visually verified in a browser (no preview tool in session) — user should eyeball /dashboard.

## Phase 0 design (DONE)

- `src/components/app/pills.tsx` — NEW: shared cinematic pill constants (PILL_PRIMARY/SECONDARY/INPUT, INK_LINK, GHOST_LINK, EASE, ARROW_BADGE) promoted from `auth-form.tsx`; auth-form now imports them (values unchanged).
- `src/components/app/glass.tsx` — NEW: `GLASS_LIGHT`/`GLASS_INK` class recipes, `GlassPanel` (light|ink), `AuroraPanel` (AiGlow behind a light GlassPanel), `HeroBand` (mist imagery stage, next/image fill).
- `src/app/(app)/layout.tsx` — loads Inter Tight + Instrument Serif (same scoping as `(auth)`), `font-heading` wrapper `bg-[#fafafa] text-[#0d0d0d]`, adds `MarketingThemeLock`, REMOVES: ThemeSync, theme_preference from the profile query, MarketingBackground.
- `src/components/app/app-sidebar.tsx` — liquid-glass rail: desktop `fixed left-3 inset-y-3 w-60 rounded-3xl` ink glass; nav pills (active = white glass pill via layoutId); custom white logo lockup (shared `Logo` stays green/ink for marketing — don't reuse it on the dark rail); ThemeSelector removed; teaser card + profile -> white/[0.06] inner glass; mobile top bar = light glass; mobile drawer = ink glass sheet. ALL functionality kept: tour ids, admin item + unread badge, ReportButton, signout form, privacy/terms.
- `src/components/app/app-shell.tsx` — content offset for floating rail (`lg:pl-[16.25rem]`).

## Verification per phase

Lint + 92 tests green; grep in touched files: no rounded-[4px]/font-bold/text-primary/bg-card/text-destructive/Geist; useReducedMotion on framer transitions; focus-visible on pills; screenshots desktop+mobile. `.next` wipe needed after globals.css token edits (Turbopack). Lint rule gotcha: no direct setState in effects (`Promise.resolve(v).then(set)`).

## Gotchas / context for a cold agent

- Project rule: commit straight to main and push, one commit per phase.
- AGENTS.md: Next 16 — check `node_modules/next/dist/docs/` before unfamiliar Next APIs (font/image patterns here copy existing in-repo usage, already Next-16-safe).
- shadcn token classes (`bg-card`, `text-primary`, …) are pervasive in app components; they get replaced per surface phase, not globally.
- `ReportButton` (feedback) renders a shadcn Button on the dark rail — restyle deferred to Phase 7 polish if it reads okay; it must keep working.
- Dev server sometimes strays to port 3001; first screenshot after navigate/resize often tiny — retake.
- Brainstorm mockups (user-approved visuals) live in `.superpowers/brainstorm/4138-1781232176/content/` — backdrop-strategy.html (chose B), processing-glow.html (chose A), sidebar-style.html (chose B + "actually glassy"), art-direction.html (chose B mist).
