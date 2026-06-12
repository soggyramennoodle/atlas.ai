# Auth Surface Cinematic Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reskin `/login`, `/signup` (all five `AuthForm` states) and the account-locked screen in the cinematic-light marketing language — split editorial stage with a story media panel — without touching any auth logic.

**Architecture:** Move `login/` + `signup/` into a new `(auth)` route group whose layout loads Inter Tight + Instrument Serif (same scoping pattern as `(marketing)`). `AuthShell` becomes the split stage (form column + story panel; compact banner on mobile). `AuthForm` keeps every handler/state and only swaps its rendered markup, with soft blur transitions between states. `AccountLockedModal` becomes a full-viewport dark (`#0d0d0d`) stage and self-loads the display fonts since it renders inside the app shell.

**Tech Stack:** Next.js 16 App Router, Tailwind v4, framer-motion, `next/font/google`, lucide-react, Supabase auth (untouched). Spec: `docs/superpowers/specs/2026-06-11-auth-cinematic-redesign-design.md`.

**Verification approach:** This is a pure render-layer reskin with no new logic, so tasks verify via `npm run lint`, `npm run test` (existing suite must stay green), grep-based acceptance checks, and browser preview checks instead of new unit tests.

**Known facts an engineer needs:**
- `.font-heading` / `.font-instrument` utilities and `.story-bar-1/2` + `@keyframes story-fill-1/2` already exist in `src/app/globals.css` — do NOT redefine them. The font utilities resolve `var(--font-inter-tight)` / `var(--font-instrument-serif)`, which the new `(auth)` layout provides.
- Route groups `(folder)` do not change URLs (`src/app/(auth)/login/page.tsx` still serves `/login`).
- `next/font` is scoped to the component it's used in; it works in client components (used that way in the locked modal).
- The ONLY import that references the moved files is `src/components/auth/auth-form.tsx:20` → `@/app/login/actions`.
- Per memory: if `globals.css` tokens were edited, Turbopack needs a `.next` wipe — this plan does NOT edit `globals.css`, so no wipe needed.
- Easing constant everywhere: `[0.22, 1, 0.36, 1]`.

---

### Task 1: Story panel still (ORCHESTRATOR TASK — requires Higgsfield MCP)

This task is executed by the orchestrating session directly (subagents may lack MCP access).

**Files:**
- Create: `public/auth/story-login.jpg`

- [ ] **Step 1: Generate the still via Higgsfield MCP**

Use `generate_image` with a prompt along these lines (portrait, photographic):

> Cinematic editorial photograph, a university student in a large lecture hall, taking notes on a laptop, soft directional window light, shallow depth of field, muted desaturated film grade with gentle green undertone, quiet focused mood, portrait composition, 3:4 aspect ratio, no text, no watermark

Pick the best result; prefer a frame with clear space in the lower third (the panel's headline + gradient zone).

- [ ] **Step 2: Download and place the asset**

```bash
mkdir -p public/auth
curl -L -o public/auth/story-login.jpg "<generated-image-url>"
```

- [ ] **Step 3: Resize/compress to web weight**

```bash
sips --resampleWidth 1200 public/auth/story-login.jpg --out public/auth/story-login.jpg
ls -la public/auth/story-login.jpg
```

Expected: file exists, ideally < 400KB. If still heavier, re-export at quality ~80:
`sips -s format jpeg -s formatOptions 80 public/auth/story-login.jpg --out public/auth/story-login.jpg`

**Fallback if Higgsfield is unavailable:** copy the landing still instead so the build never blocks:
`cp public/landing/story-student.jpg public/auth/story-login.jpg`

- [ ] **Step 4: Commit**

```bash
git add public/auth/story-login.jpg
git commit -m "feat(auth): add cinematic story panel still"
```

---

### Task 2: `(auth)` route group with cinematic fonts

**Files:**
- Create: `src/app/(auth)/layout.tsx`
- Move: `src/app/login/` → `src/app/(auth)/login/` (contains `page.tsx`, `actions.ts`)
- Move: `src/app/signup/` → `src/app/(auth)/signup/` (contains `page.tsx`)
- Modify: `src/components/auth/auth-form.tsx:20` (actions import path)

- [ ] **Step 1: Move the route folders**

```bash
mkdir -p "src/app/(auth)"
git mv src/app/login "src/app/(auth)/login"
git mv src/app/signup "src/app/(auth)/signup"
```

- [ ] **Step 2: Create the auth layout**

Create `src/app/(auth)/layout.tsx`:

```tsx
import { Inter_Tight, Instrument_Serif } from "next/font/google";

/* Cinematic-light language, scoped to the auth surface exactly like the
   marketing layout scopes it — the app shell never loads these fonts. */
const interTight = Inter_Tight({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-inter-tight",
});

const instrumentSerif = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
  variable: "--font-instrument-serif",
});

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      className={`${interTight.variable} ${instrumentSerif.variable} font-heading flex min-h-svh flex-1 flex-col bg-[#fafafa] text-[#0d0d0d]`}
    >
      {children}
    </div>
  );
}
```

- [ ] **Step 3: Fix the actions import in auth-form**

In `src/components/auth/auth-form.tsx`, change:

```tsx
import { lookupAuthEmail } from "@/app/login/actions";
```

to:

```tsx
import { lookupAuthEmail } from "@/app/(auth)/login/actions";
```

- [ ] **Step 4: Verify routes still serve**

Run lint + tests, then start the preview server and load both routes:

```bash
npm run lint
npm run test
```

Expected: both pass (no new errors vs. baseline). Then via preview tools: `/login` and `/signup` render (still old-styled at this point — that's expected), no 404, no console errors.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "refactor(auth): move login/signup into (auth) group with cinematic fonts"
```

---

### Task 3: `AuthStoryPanel` component

**Files:**
- Create: `src/components/auth/auth-story-panel.tsx`

- [ ] **Step 1: Create the component**

Full file. It reuses the landing StoryCard overlay recipe and the global `.story-bar-1/2` CSS (6s cycle). `compact` renders the mobile banner: single static slide, no story bars, no chip, no rotation.

```tsx
"use client";

import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";

const PANEL_IMAGE = "/auth/story-login.jpg";
const EASE = [0.22, 1, 0.36, 1] as const;

/* Brand-voice slides only — never user data or invented numbers. */
const SLIDES = [
  { lead: "Capturing", accent: "every lecture" },
  { lead: "Mastering", accent: "every subject" },
] as const;

/**
 * The auth stage's cinematic media panel: the landing StoryCard language at
 * panel scale. Desktop shows story bars + two rotating brand slides + the
 * "Atlas is listening" chip; `compact` is the mobile banner — one static
 * slide, no carousel furniture.
 */
export function AuthStoryPanel({ compact = false }: { compact?: boolean }) {
  const reduce = useReducedMotion();
  const [slide, setSlide] = useState(0);

  // Slide timer synchronized with the story-fill bars (desktop only).
  useEffect(() => {
    if (compact || reduce) return;
    const first = setTimeout(() => setSlide(1), 3000);
    let half: ReturnType<typeof setTimeout>;
    const cycle = setInterval(() => {
      setSlide(0);
      half = setTimeout(() => setSlide(1), 3000);
    }, 6000);
    return () => {
      clearTimeout(first);
      clearTimeout(half);
      clearInterval(cycle);
    };
  }, [compact, reduce]);

  const active = SLIDES[compact ? 0 : slide];

  return (
    <div
      className={
        compact
          ? "relative h-40 w-full overflow-hidden rounded-[20px] bg-[#1a1a1a]"
          : "relative h-full min-h-[520px] w-full overflow-hidden rounded-[24px] bg-[#1a1a1a]"
      }
      style={{
        boxShadow:
          "0 8px 30px rgba(0,0,0,0.12), inset 0 1px 0 rgba(255,255,255,0.18), inset 0 0 0 1px rgba(255,255,255,0.06)",
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={PANEL_IMAGE}
        alt="A student taking notes in a lecture hall"
        className="absolute inset-0 h-full w-full object-cover"
        style={{ objectPosition: "center 30%" }}
      />

      {/* Soft-light green tint */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          mixBlendMode: "soft-light",
          background:
            "linear-gradient(160deg, rgba(220,255,90,0.65) 0%, rgba(170,230,70,0.35) 40%, rgba(80,140,40,0.25) 100%)",
        }}
      />
      {/* Radial highlight */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(circle at 30% 15%, rgba(230,255,120,0.25), transparent 55%)",
        }}
      />
      {/* Lower dark gradient */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0"
        style={{
          height: compact ? "75%" : "55%",
          background:
            "linear-gradient(0deg, #040504 20.54%, rgba(29,37,9,0) 100%)",
        }}
      />

      {/* Story progress bars — desktop only */}
      {!compact && (
        <div
          className="absolute z-20 flex"
          style={{ top: 24, left: 24, right: 24, gap: 6 }}
        >
          {["story-bar-1", "story-bar-2"].map((cls) => (
            <div
              key={cls}
              className={cls}
              style={{
                height: 3,
                flex: 1,
                borderRadius: 9999,
                background: "rgba(0,0,0,0.25)",
                overflow: "hidden",
              }}
            >
              <div
                className="story-bar-fill"
                style={{
                  height: "100%",
                  width: "100%",
                  borderRadius: 9999,
                  background: "rgba(0,0,0,0.95)",
                  transform: "scaleX(0)",
                }}
              />
            </div>
          ))}
        </div>
      )}

      {/* Headline — re-mounts per slide on desktop, static when compact */}
      <motion.h3
        key={compact ? "static" : slide}
        initial={compact ? false : { opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: EASE }}
        className="absolute z-10 text-white"
        style={{
          left: 24,
          right: 24,
          bottom: compact ? 20 : 88,
          fontSize: compact ? 26 : 38,
          lineHeight: compact ? "27px" : "40px",
          letterSpacing: -0.5,
          margin: 0,
          textShadow: "0 2px 18px rgba(0,0,0,0.35)",
        }}
      >
        <span className="font-heading font-semibold">{active.lead}</span>{" "}
        <span className="font-instrument italic font-normal">
          {active.accent}
        </span>
      </motion.h3>

      {/* Bottom chip — desktop only */}
      {!compact && (
        <div
          className="absolute z-10 flex items-center"
          style={{ left: 24, right: 24, bottom: 24, gap: 10 }}
        >
          <span
            className="font-heading flex items-center"
            style={{
              gap: 8,
              background: "rgba(255,255,255,0.96)",
              color: "#0a0a0a",
              fontSize: 13,
              fontWeight: 500,
              padding: "9px 16px",
              borderRadius: 9999,
              boxShadow:
                "0 6px 18px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.9)",
            }}
          >
            <span className="relative flex size-2 items-center justify-center">
              <span className="absolute inline-flex size-2 animate-ping rounded-full bg-[#e5484d] opacity-60" />
              <span className="relative inline-flex size-2 rounded-full bg-[#e5484d]" />
            </span>
            Atlas is listening
          </span>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Lint**

```bash
npm run lint
```

Expected: clean.

- [ ] **Step 3: Commit**

```bash
git add src/components/auth/auth-story-panel.tsx
git commit -m "feat(auth): cinematic story panel component"
```

---

### Task 4: `AuthShell` split stage

**Files:**
- Modify: `src/components/auth/auth-shell.tsx` (full rewrite)

- [ ] **Step 1: Rewrite the shell**

Replace the entire contents of `src/components/auth/auth-shell.tsx` with:

```tsx
import Link from "next/link";
import { Logo } from "@/components/logo";
import { AuthStoryPanel } from "@/components/auth/auth-story-panel";

/**
 * The auth stage: split editorial layout on desktop (naked form column on the
 * #fafafa canvas + inset cinematic story panel), single column on mobile with
 * a compact story banner above the form.
 */
export function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-svh flex-1 flex-col lg:flex-row">
      {/* Form column */}
      <div className="flex flex-1 flex-col px-6 pb-8 pt-6 sm:px-10 lg:px-14">
        <div className="flex justify-center lg:justify-start">
          <Link href="/">
            <Logo beta />
          </Link>
        </div>

        {/* Mobile story banner — no bars, no rotation */}
        <div className="mt-6 lg:hidden">
          <AuthStoryPanel compact />
        </div>

        <div className="flex flex-1 items-center">
          <div className="mx-auto w-full max-w-[26rem] py-10">{children}</div>
        </div>

        <p className="mx-auto w-full max-w-[26rem] text-xs text-[#0d0d0d]/45 text-pretty">
          By continuing you agree to use Atlas responsibly with content you
          have the right to record.
        </p>
      </div>

      {/* Story panel — desktop only */}
      <div className="hidden p-4 lg:flex lg:w-[44%] xl:w-[46%]">
        <AuthStoryPanel />
      </div>
    </main>
  );
}
```

Note: `MarketingBackground` import is gone on purpose (plain `#fafafa` canvas comes from the `(auth)` layout). Do not delete `src/components/marketing-background.tsx` — other surfaces use it.

- [ ] **Step 2: Verify in browser**

With the preview server running, check `/login`:
- Desktop (default width): two columns, story panel right with rotating slides + bars + chip.
- Resize to 390px: single column, compact banner above the form, no story bars in banner.
- No console errors; image loads from `/auth/story-login.jpg`.

- [ ] **Step 3: Commit**

```bash
git add src/components/auth/auth-shell.tsx
git commit -m "feat(auth): split editorial auth stage with story panel"
```

---

### Task 5: `AuthForm` restyle — pill primitives + main state

**Files:**
- Modify: `src/components/auth/auth-form.tsx`

All handlers, state, effects, and the `GoogleIcon` component stay byte-identical. Only imports and JSX change. This task restyles the main state; Task 6 restyles the four sub-states and adds the blur transitions.

- [ ] **Step 1: Update imports and add pill class constants**

At the top of `src/components/auth/auth-form.tsx`, replace the icon/UI imports:

```tsx
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Fingerprint,
  Loader2,
  Mail,
} from "lucide-react";
```

Remove these imports (no longer used after Task 6 completes; if lint complains mid-task, leave removal for Task 6):

```tsx
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
```

Below the `RESEND_COOLDOWN` constant, add:

```tsx
/* Cinematic-light pill primitives for the auth surface. */
const PILL_SECONDARY =
  "flex h-11 w-full items-center justify-center gap-2 rounded-full border border-black/[0.12] bg-white text-sm font-medium text-[#0d0d0d] transition hover:bg-black/[0.03] active:scale-[0.99] disabled:pointer-events-none disabled:opacity-60";
const PILL_PRIMARY =
  "group flex h-11 w-full items-center justify-center gap-2 rounded-full bg-[#0d0d0d] text-sm font-medium text-white transition hover:scale-[1.01] active:scale-[0.99] disabled:pointer-events-none disabled:opacity-60";
const PILL_INPUT =
  "h-11 w-full rounded-full border border-black/[0.12] bg-white px-5 text-sm text-[#0d0d0d] outline-none transition placeholder:text-[#0d0d0d]/40 focus:border-black/30";
const GHOST_LINK =
  "inline-flex items-center gap-1 text-sm text-[#0d0d0d]/55 transition hover:text-[#0d0d0d]";
const INK_LINK = "font-medium text-[#0d0d0d] underline-offset-4 hover:underline";
const ARROW_BADGE = (
  <span className="grid size-6 shrink-0 place-items-center rounded-full bg-white">
    <ArrowUpRight
      size={13}
      color="#000"
      strokeWidth={2.5}
      className="transition-transform duration-300 ease-out group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
    />
  </span>
);
```

- [ ] **Step 2: Replace the main-state JSX**

Replace the final `return (...)` block (the one starting `<div className="rounded-[4px] border border-border bg-card p-8 ...">`) with:

```tsx
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-[2px] text-[#0d0d0d]/45">
        {isSignup ? "Get started" : "Welcome back"}
      </p>
      <h1 className="mt-3 text-[2.35rem] font-normal leading-[1.02] tracking-[-0.03em] text-balance">
        {isSignup ? (
          <>
            Start <span className="font-instrument italic">learning smarter</span>
          </>
        ) : (
          <>
            Pick up{" "}
            <span className="font-instrument italic">where you left off</span>
          </>
        )}
      </h1>
      <p className="mt-3 text-sm text-[#0d0d0d]/55">
        {isSignup
          ? "Start turning lectures into notes in minutes."
          : "Sign in to your Atlas library."}
      </p>

      <div className="mt-8 grid gap-3">
        <button
          type="button"
          className={PILL_SECONDARY}
          onClick={() => signInWith("google")}
          disabled={authBusy}
        >
          {redirecting === "google" ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <GoogleIcon />
          )}
          Continue with Google
        </button>

        {!isSignup && passkeysSupported && (
          <button
            type="button"
            className={PILL_SECONDARY}
            onClick={() => void signInWithPasskey()}
            disabled={authBusy}
          >
            {passkeySigningIn ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Fingerprint className="size-4" />
            )}
            Sign in with passkey
          </button>
        )}
      </div>

      <div className="my-6 flex items-center gap-3 text-xs text-[#0d0d0d]/45">
        <span className="h-px flex-1 bg-black/[0.08]" />
        or with email
        <span className="h-px flex-1 bg-black/[0.08]" />
      </div>

      <form onSubmit={(e) => void handleEmailContinue(e)} className="space-y-3">
        <label htmlFor="email" className="sr-only">
          Email
        </label>
        <input
          id="email"
          type="email"
          autoComplete="email"
          required
          placeholder="you@university.edu"
          className={PILL_INPUT}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <button type="submit" disabled={authBusy} className={PILL_PRIMARY}>
          {(continuing || sending) && (
            <Loader2 className="size-4 animate-spin" />
          )}
          Continue
          {ARROW_BADGE}
        </button>
      </form>

      <p className="mt-5 text-xs text-[#0d0d0d]/45 text-pretty">
        {isSignup
          ? "We'll email you a secure link to finish creating your account."
          : "Enter your email to sign in with a passkey or magic link."}
      </p>

      {!isSignup && (
        <p className="mt-3 text-xs text-[#0d0d0d]/45 text-pretty">
          Institutional emails (e.g. @mcmaster.ca, @mail.utoronto.ca) may be
          blocked by your school&apos;s security filters. Use a personal email
          for the best experience.{" "}
          <Link
            href="/sign-in-help"
            className="group inline-flex items-center gap-1 font-medium text-[#0d0d0d] underline-offset-4 hover:underline"
          >
            Learn more
            <ArrowRight className="size-3 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </p>
      )}

      <p className="mt-6 text-sm text-[#0d0d0d]/55">
        {isSignup ? "Already have an account? " : "New to Atlas? "}
        <Link href={isSignup ? "/login" : "/signup"} className={INK_LINK}>
          {isSignup ? "Sign in" : "Create one"}
        </Link>
      </p>
    </div>
  );
```

(The standalone "Learn more" paragraph is folded into the institutional-email note; on the signup side there is no institutional note, matching current behavior where it was login-only. The `ArrowRight` import is reused for it.)

- [ ] **Step 3: Lint + browser check**

```bash
npm run lint
```

Expected: clean except possibly unused `Button`/`Input`/`Label`/`cn`/`Mail`/`ArrowLeft` warnings if Task 6 hasn't run yet (sub-states still use them — they should still be imported at this point; only remove imports that are truly unused).

Browser: `/login` shows eyebrow, display heading with italic accent, pill controls; Google button and email submit still trigger their flows (clicking Continue with a real-looking unknown email should land on the old-styled "No account found" — restyled next task).

- [ ] **Step 4: Commit**

```bash
git add src/components/auth/auth-form.tsx
git commit -m "feat(auth): cinematic main auth form state"
```

---

### Task 6: `AuthForm` sub-states + blur transitions

**Files:**
- Modify: `src/components/auth/auth-form.tsx`

- [ ] **Step 1: Add framer-motion and restructure the step renders**

Add imports:

```tsx
import { AnimatePresence, motion } from "framer-motion";
```

Add an easing constant next to the pill constants:

```tsx
const EASE = [0.22, 1, 0.36, 1] as const;
```

Convert the four early-return blocks (`magic-sent`, `no-account`, `already-exists`, `sign-in-choice`) plus the main return into a single `renderStep()` function, and make the component's return:

```tsx
  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={step}
        initial={{ opacity: 0, filter: "blur(8px)", y: 8 }}
        animate={{ opacity: 1, filter: "blur(0px)", y: 0 }}
        exit={{ opacity: 0, filter: "blur(8px)", y: -6 }}
        transition={{ duration: 0.45, ease: EASE }}
      >
        {renderStep()}
      </motion.div>
    </AnimatePresence>
  );
```

where `renderStep()` contains `if (step === "magic-sent") return (...)` etc. with the JSX below, and the Task 5 main-state JSX as the final return.

- [ ] **Step 2: Replace the `magic-sent` JSX**

```tsx
    return (
      <div>
        <span className="grid size-12 place-items-center rounded-full border border-black/[0.12] bg-white text-[#0d0d0d]">
          <Mail className="size-5" />
        </span>
        <h2 className="mt-6 text-[2rem] font-normal leading-[1.05] tracking-[-0.02em]">
          Check <span className="font-instrument italic">your email</span>
        </h2>
        <p className="mt-3 text-sm text-[#0d0d0d]/55 text-pretty">
          We sent a magic link to <strong className="font-medium text-[#0d0d0d]">{email}</strong>.
          Click it to sign in, no password needed.
        </p>
        <p className="mt-1 text-xs text-[#0d0d0d]/45 text-pretty">
          Nothing in your inbox? Check your junk or spam folder.
        </p>

        <div className="mt-8 grid gap-4">
          <button
            type="button"
            className={PILL_PRIMARY}
            onClick={() => void resend()}
            disabled={cooldown > 0 || sending}
          >
            {sending && <Loader2 className="size-4 animate-spin" />}
            {cooldown > 0 ? `Resend email in ${cooldown}s` : "Resend email"}
          </button>
          <button type="button" onClick={goBack} className={GHOST_LINK}>
            <ArrowLeft className="size-3.5" />
            Go back
          </button>
        </div>
      </div>
    );
```

- [ ] **Step 3: Replace the `no-account` JSX**

```tsx
    return (
      <div>
        <h2 className="text-[2rem] font-normal leading-[1.05] tracking-[-0.02em]">
          No account <span className="font-instrument italic">found yet</span>
        </h2>
        <p className="mt-3 text-sm text-[#0d0d0d]/55 text-pretty">
          We couldn&apos;t find an Atlas account for{" "}
          <strong className="font-medium text-[#0d0d0d]">{email}</strong>.
        </p>
        <div className="mt-8 grid gap-4">
          <Link href="/signup" className={PILL_PRIMARY}>
            Create an account
            {ARROW_BADGE}
          </Link>
          <button type="button" onClick={goBack} className={GHOST_LINK}>
            <ArrowLeft className="size-3.5" />
            Try a different email
          </button>
        </div>
      </div>
    );
```

- [ ] **Step 4: Replace the `already-exists` JSX**

```tsx
    return (
      <div>
        <h2 className="text-[2rem] font-normal leading-[1.05] tracking-[-0.02em]">
          You already{" "}
          <span className="font-instrument italic">have an account</span>
        </h2>
        <p className="mt-3 text-sm text-[#0d0d0d]/55 text-pretty">
          <strong className="font-medium text-[#0d0d0d]">{email}</strong> is
          already registered with Atlas.
        </p>
        <div className="mt-8 grid gap-4">
          <Link
            href={`/login?email=${encodeURIComponent(email)}`}
            className={PILL_PRIMARY}
          >
            Sign in instead
            {ARROW_BADGE}
          </Link>
          <button type="button" onClick={goBack} className={GHOST_LINK}>
            <ArrowLeft className="size-3.5" />
            Try a different email
          </button>
        </div>
      </div>
    );
```

- [ ] **Step 5: Replace the `sign-in-choice` JSX**

```tsx
    return (
      <div>
        <h2 className="text-[2rem] font-normal leading-[1.05] tracking-[-0.02em]">
          Choose how <span className="font-instrument italic">to sign in</span>
        </h2>
        <p className="mt-3 text-sm text-[#0d0d0d]/55">
          For <strong className="font-medium text-[#0d0d0d]">{email}</strong>
        </p>

        <div className="mt-8 grid gap-3">
          <button
            type="button"
            className={PILL_PRIMARY}
            onClick={() => void signInWithPasskey()}
            disabled={authBusy}
          >
            {passkeySigningIn ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Fingerprint className="size-4" />
            )}
            Use passkey
          </button>
          <button
            type="button"
            className={PILL_SECONDARY}
            onClick={() => void sendMagicLink(false)}
            disabled={authBusy}
          >
            {sending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Mail className="size-4" />
            )}
            Send magic link
          </button>
        </div>

        <button type="button" onClick={goBack} className={`${GHOST_LINK} mt-6`}>
          <ArrowLeft className="size-3.5" />
          Go back
        </button>
      </div>
    );
```

- [ ] **Step 6: Remove now-unused imports**

`Button`, `buttonVariants`, `Input`, `Label`, and `cn` are no longer referenced — delete those import lines.

- [ ] **Step 7: Lint, tests, browser check**

```bash
npm run lint
npm run test
```

Expected: clean / green. Browser on `/login`: enter `definitely-not-a-user-$(random)@example.com`, submit → soft blur transition into "No account *found yet*"; "Try a different email" blurs back. On `/signup`: enter the same → magic-sent state appears with resend cooldown counting down from 90.

- [ ] **Step 8: Commit**

```bash
git add src/components/auth/auth-form.tsx
git commit -m "feat(auth): cinematic sub-states with soft blur transitions"
```

---

### Task 7: `AccountLockedModal` dark cinema

**Files:**
- Modify: `src/components/account-locked-modal.tsx` (full rewrite)

- [ ] **Step 1: Rewrite the modal**

Replace the entire contents of `src/components/account-locked-modal.tsx` with:

```tsx
"use client";

import { useState } from "react";
import { Inter_Tight, Instrument_Serif } from "next/font/google";
import { Loader2, Lock, LogOut, Mail } from "lucide-react";
import { motion } from "framer-motion";
import type { AccessRevocationKind } from "@/lib/types";

/* This modal renders inside the app shell (Geist), so it carries the
   cinematic display fonts itself — next/font is scoped per component. */
const interTight = Inter_Tight({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-inter-tight",
});

const instrumentSerif = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  style: ["italic"],
  variable: "--font-instrument-serif",
});

const SUPPORT_EMAIL = "hello@atlasai.ca";

const COPY: Record<
  AccessRevocationKind,
  { lead: string; accent: string; body: string }
> = {
  banned: {
    lead: "Account",
    accent: "locked",
    body: "This account has been locked and can't stay signed in. If you think this is a mistake, reach out and we'll help sort it out.",
  },
  global_logout: {
    lead: "Signed out",
    accent: "by Atlas",
    body: "Atlas ended your session for maintenance or security. Sign in again when you're ready to continue.",
  },
};

export function AccountLockedModal({
  kind,
  onExit,
}: {
  kind: AccessRevocationKind;
  onExit: () => Promise<void>;
}) {
  const [pending, setPending] = useState(false);
  const copy = COPY[kind];

  async function handleExit() {
    if (pending) return;
    setPending(true);
    try {
      await onExit();
    } finally {
      setPending(false);
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className={`${interTight.variable} ${instrumentSerif.variable} font-heading fixed inset-0 z-[200] flex items-center justify-center bg-[#0d0d0d] p-6`}
      role="dialog"
      aria-modal="true"
      aria-labelledby="account-locked-title"
    >
      <div className="w-full max-w-sm text-center">
        <span className="mx-auto grid size-12 place-items-center rounded-full border border-white/20 bg-white/[0.06] text-white">
          {kind === "banned" ? (
            <Lock className="size-5" />
          ) : (
            <LogOut className="size-5" />
          )}
        </span>
        <h2
          id="account-locked-title"
          className="mt-6 text-[2rem] font-normal leading-[1.05] tracking-[-0.02em] text-white"
        >
          {copy.lead}{" "}
          <span className="font-instrument italic">{copy.accent}</span>
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-white/55 text-pretty">
          {copy.body}
        </p>

        <div className="mt-8 grid gap-3">
          <a
            href={`mailto:${SUPPORT_EMAIL}`}
            className="flex h-11 w-full items-center justify-center gap-2 rounded-full bg-white text-sm font-medium text-[#0d0d0d] transition hover:scale-[1.01] active:scale-[0.99]"
          >
            <Mail className="size-4" />
            Contact {SUPPORT_EMAIL}
          </a>
          <button
            type="button"
            onClick={handleExit}
            disabled={pending}
            className="flex h-11 w-full items-center justify-center gap-2 rounded-full border border-white/20 text-sm font-medium text-white transition hover:bg-white/[0.06] active:scale-[0.99] disabled:pointer-events-none disabled:opacity-60"
          >
            {pending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <LogOut className="size-4" />
            )}
            Exit Atlas
          </button>
        </div>
      </div>
    </motion.div>
  );
}
```

- [ ] **Step 2: Lint + tests**

```bash
npm run lint
npm run test
```

Expected: clean / green. (The modal only appears for revoked accounts, so browser verification is by code review here; the guard's props/contract are unchanged.)

- [ ] **Step 3: Commit**

```bash
git add src/components/account-locked-modal.tsx
git commit -m "feat(auth): dark cinema account-locked screen"
```

---

### Task 8: Acceptance pass + push

**Files:** none (verification only)

- [ ] **Step 1: Grep acceptance check (per spec)**

```bash
grep -nE "rounded-\[4px\]|font-bold|font-extrabold|text-primary|bg-card|text-destructive|buttonVariants" \
  src/components/auth/auth-form.tsx \
  src/components/auth/auth-shell.tsx \
  src/components/auth/auth-story-panel.tsx \
  src/components/account-locked-modal.tsx
```

Expected: no output.

- [ ] **Step 2: Confirm font scoping**

```bash
grep -rn "Inter_Tight\|Instrument_Serif" src/ --include="*.tsx" -l
```

Expected: exactly `src/app/(marketing)/layout.tsx`, `src/app/(auth)/layout.tsx`, `src/components/account-locked-modal.tsx`.

- [ ] **Step 3: Full browser pass with screenshots**

Desktop `/login`: stage, panel slides rotating in sync with bars, form entry animations. Desktop `/signup`: GET STARTED eyebrow, "Start *learning smarter*". Mobile (390px) `/login`: banner (no bars) + form + passkey button (if the test browser supports WebAuthn). Trigger no-account and magic-sent states. Screenshot each for the user.

- [ ] **Step 4: Dashboard regression check**

Load `/dashboard` (logged-in session in preview, or just confirm it compiles and renders the login redirect): Geist/green app styling unchanged, no Inter Tight in app network/font requests.

- [ ] **Step 5: Final lint + tests, then push**

```bash
npm run lint && npm run test
git push origin main
```

Expected: clean, green, pushed.
