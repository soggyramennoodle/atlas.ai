# Auth surface cinematic redesign — design spec

**Date:** 2026-06-11
**Status:** Approved by Adeeb (brainstorm session)
**Scope:** `/login`, `/signup`, all `AuthForm` states, `AccountLockedModal`. Nothing else.

## Goal

Migrate the auth surface from the legacy rivo-light system (Geist bold, `rounded-[4px]`,
green `text-primary`, boxed `bg-card`) to the cinematic-light marketing language
(`#fafafa` canvas, ink `#0d0d0d`, Inter Tight headings with one Instrument Serif italic
accent, pill geometry, hairline borders, `[0.22,1,0.36,1]` easing). This is a render-layer
reskin: **all auth logic is preserved exactly** — Supabase OTP, email lookup, passkey
sign-in, resend cooldown (90s), error toasts, `next` param handling, OAuth redirect.

## Design tokens (canonical for this surface)

- Canvas: `#fafafa`; ink: `#0d0d0d`; muted ink: `rgba(13,13,13,0.55)`, hints `0.4–0.45`
- Headings: `font-heading` (Inter Tight), weight 400, tight tracking (≈ `-1px` at display
  sizes); exactly one accent phrase per heading in `font-instrument italic`
- Eyebrows: Inter Tight 12px, weight 500, `tracking-[2px]`, `rgba(13,13,13,0.45)`, uppercase
- Controls: pill geometry (`rounded-full`). Secondary buttons/inputs: white bg, border
  `border-black/[0.12]`, ink text. Primary CTA: `bg-[#0d0d0d]` text white, trailing
  ArrowUpRight in a white circle (landing CTA pattern). Hover `scale-[1.02]`,
  active `scale-[0.98]`.
- Hairline dividers: `bg-black/[0.08]`
- Card shadow (where used): `shadow-[0_8px_30px_rgba(0,0,0,0.05)]`
- Motion: ease `[0.22,1,0.36,1]`; entry = opacity + y (+ optional blur) staggered reveals;
  state swaps = soft blur in/out (the Synergeus Card-1 Q&A pattern: exit `blur(8px), y:-6`,
  enter from `blur(8px), y:8`, 0.5–0.6s). Respect `useReducedMotion`.

## Architecture

1. **Route group:** move `src/app/login/` and `src/app/signup/` into `src/app/(auth)/`
   (URLs unchanged). New `src/app/(auth)/layout.tsx` loads Inter Tight + Instrument Serif
   via `next/font/google` with the same variables as the marketing layout
   (`--font-inter-tight`, `--font-instrument-serif`) and applies `font-heading` +
   `bg-[#fafafa]`. The app shell never loads these fonts.
2. **`AuthShell`** (`src/components/auth/auth-shell.tsx`): becomes the split stage.
   - Desktop (`lg+`): two-column grid/flex. Left = scrollable form column with Atlas logo
     top-left, form content vertically centered (max-w ~26rem), legal/footer microcopy at
     bottom. Right = story panel inset with padding (panel does not touch viewport edges),
     `rounded-[24px]`, full column height.
   - Mobile: single column. Compact story banner (see below) above the form. Logo centered
     at top.
   - The blueprint-grid `MarketingBackground` is dropped from this surface; the canvas is
     plain `#fafafa`.
3. **New `AuthStoryPanel`** (`src/components/auth/auth-story-panel.tsx`, client):
   - Background: new cinematic still from `public/auth/` (Higgsfield-generated), cover.
   - Overlays, reusing the StoryCard recipe: soft-light green tint gradient, radial
     highlight, inset top highlight, lower dark gradient (`#040504` up).
   - Desktop only: two story progress bars (existing `.story-bar-1/2` CSS, 6s cycle) and
     two rotating headline slides synchronized to them, re-mounting with the soft reveal:
     slide copy (brand voice, no user data, no fake numbers):
     - "Capturing" / *every lecture*
     - "Mastering" / *every subject*
   - Bottom row: white "Atlas is listening" chip with pulsing red dot (reused pattern).
     No numeric chips.
   - **Mobile banner variant** (`compact` prop or media queries): height ~160–200px,
     `rounded-[20px]`, **no story bars, no rotation** — single static slide (first
     headline), same tint and gradient. May render as the same component with a prop.
4. **`AuthForm`** (`src/components/auth/auth-form.tsx`): logic untouched; render restyled.
   - **Main state:** eyebrow `WELCOME BACK` (login) / `GET STARTED` (signup); heading
     login: "Pick up " + *where you left off*; signup: "Start " + *learning smarter*
     (display size ~clamp(2rem→2.75rem), weight 400). Subcopy in muted ink.
     Controls in order: Google pill (white, official G icon), passkey pill (login only,
     when supported), hairline "or with email" divider, email pill input, ink Continue
     pill CTA with arrow-circle. Helper microcopy (institutional-email warning,
     sign-in-help link, login/signup cross-link) in muted ink; links are ink with
     underline on hover — **no green `text-primary`, no `font-bold`** (weights 400/500
     only).
   - **Sub-states** (magic-sent, no-account, already-exists, sign-in-choice): rendered in
     the same left column, swapped with the soft blur transition; the story panel never
     re-mounts. No boxed cards — same naked-column treatment with icon-in-hairline-ring,
     heading with serif accent ("Check " + *your email*; "No account " + *found yet*;
     "You already " + *have an account*; "Choose how " + *to sign in*), pill actions.
     Resend cooldown button and "Go back" ghost link keep current behavior.
5. **`AccountLockedModal`** (`src/components/account-locked-modal.tsx`): dark cinema.
   - Full-viewport opaque `#0d0d0d` stage (still `role="dialog"`, `z-[200]`). Remove the
     red radial gradients and pulse entirely.
   - Centered column: lock icon in a hairline ring (`border-white/20`, `bg-white/[0.06]`),
     heading "Account " + *locked* (banned) / "Signed out " + *by Atlas* (global_logout)
     in white with the serif accent, muted `white/55` body copy, white pill
     "Contact hello@atlasai.ca" (mailto), ghost pill "Exit Atlas" (`border-white/20`).
   - Fonts: this modal renders inside the app shell where Inter Tight isn't loaded — the
     modal must load/scope the display fonts itself (acceptable approaches decided at
     implementation: scoped `next/font` variables applied on the modal root).
   - Both `AccessRevocationKind` copies keep their current text bodies.

## Assets

- 1–2 portrait-leaning cinematic stills generated via Higgsfield MCP, saved under
  `public/auth/` (e.g. `story-login.jpg`). Mood: student/lecture, cinematic light,
  desaturated grade that sits well under the green soft-light tint. Optimized (<400KB).

## Out of scope

- `auth/callback`, `auth/confirm`, `auth/signout` (route handlers, no UI)
- `passkey-enrollment-prompt.tsx` (renders inside the app shell; separate effort)
- Onboarding, dashboard, `/sign-in-help` (covered by the marketing tuning prompt)
- `MarketingBackground` component itself (still used by other surfaces)

## Acceptance

- `/login` and `/signup` render the split stage on desktop and banner-over-form on mobile;
  all five form states styled in the new language; every flow (Google, passkey, magic
  link send/resend/cooldown, no-account, already-exists, error toast on bad link) works
  as before.
- Ban modal renders the dark stage for both kinds.
- No `rounded-[4px]`, `font-bold`/`font-extrabold`, `text-primary`, `bg-card`, or
  `text-destructive` left in the touched files (grep check).
- App dashboard unaffected: Geist/green untouched, no new fonts loaded outside
  `(auth)`/marketing and the locked modal.
- Lighthouse-reasonable: stills compressed, fonts subset by next/font, panel image lazy
  on mobile if below the fold.
