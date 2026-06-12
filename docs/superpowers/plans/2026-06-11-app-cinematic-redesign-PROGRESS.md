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
| 2 | Capture (upload, recorder, uploader, processing overlay, dock) | DONE | (phase-2 commit) |
| 3 | Note view | todo | — |
| 4 | Settings | todo | — |
| 5 | Onboarding + UI tour + passkey prompt | todo | — |
| 6 | Admin (7 pages) | todo | — |
| 7 | Final sweep (theme files, rivo tokens, dead styles) | todo | — |

## Phase 2 notes (capture, DONE)

- pills.tsx grew inline variants: PILL_PRIMARY_INLINE / PILL_SECONDARY_INLINE / PILL_ICON (auto-width pills for action rows).
- ProcessingOverlay rewritten: aurora-through-glass — AiGlow full bloom behind a light GlassPanel; stage titles have serif-italic accents (STAGE_TITLE JSX map replaced STAGE_COPY); all states preserved (progress, long-run hint via glass card, keep-tab-open amber pill, capacity orange + emerald close-hint, failed pill actions). Light-only (dark: variants dropped).
- Recorder: white rounded-3xl control box; recording = red pulsing dot in hairline chip, paused = amber; waveform ink gradient (amber when paused); shadcn Buttons -> pills; Enclave/saved badges -> hairline pills; SourceCards -> rounded-2xl hairline; FluidTranscript ink text + white glow shadow.
- Uploader: dashed rounded-3xl dropzone, hairline file card, PILL_PRIMARY generate; all chunking/progress/watcher logic untouched.
- RecordingDock: ink liquid-glass (GLASS_INK), white/glass mini pills, amber paused accents.
- thinking-status default class -> ink/60.

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
