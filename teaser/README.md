# Atlas — teaser

A short, vertical SaaS motion-graphic teaser for **Atlas**, built for an
**Instagram Reel** with [Remotion](https://www.remotion.dev/). It never reveals
the full product — instead it teases cropped fragments of the real UI (the
glowing AI-summary card, the live waveform, a stat number, the active nav pill)
as they hinge flat onto a tilted 3D floor, and closes by dropping the URL.

This is a **self-contained Remotion project** that lives alongside the Next.js
app. It has its own `package.json`/`node_modules` and does not touch the app
build.

## Format

**1080×1920 (9:16), 30fps, ~20s.**

## Run it

```bash
cd teaser
npm install
npm run dev      # open Remotion Studio to scrub/preview
npm run render   # render to out/atlas-teaser.mp4
npm run still    # export a poster frame to out/poster.png
```

## What's in it

| Beat | Scene | Notes |
| --- | --- | --- |
| Cold open (slow) | `scenes/SceneLogo` | Brand shards converge in 3D; the mark rotates flat out of space on a slow fade. |
| The tease (slow) | `scenes/ScenePlane` | UI fragments stand on a receding 3D floor and hinge down flat, one by one, as the camera slowly travels forward. You only catch cropped pieces. |
| Details (fast) | `scenes/SceneDetails` | Punchy close-up flashes of tiny product details — the glow, the waveform, a number, the active pill. |
| Promise | `scenes/SceneTagline` | "Sit back / and listen." — the real hero headline. |
| Sign-off | `scenes/SceneUrlDrop` | The URL is dropped clearly: **atlasai.ca**, with an AI-gradient underline. |

### Tease, not a reveal

Almost nothing is fully legible — fragments bleed off the frame edges, the floor
pans before you can read a whole card, and the dashboard is never shown intact.
There is no personal data in frame (the profile reads "User").

### Design system

`src/theme.ts` carries the exact brand tokens pulled from the app
(`src/app/globals.css`, `src/app/icon.svg`): the forest-green primary
(`#0a5736`), the night canvas (`#08080C`), the boxy 4px geometry, the Atlas mark
path, and the living emerald→teal→blue→violet→coral→honey "AI" gradient that
signals a surface was written by Atlas (rebuilt as the note card's animated edge
glow in `components/AiGlow.tsx`).

Pacing follows the brief: **slow** on the cold open and the floor lay-down,
**fast** on the detail flashes. Helpers live in `src/anim.ts` (`slowFade`,
`snapFade`, `settle3d`, `settleSpring`).

### Fonts

Atlas runs on **Geist** (Sans + Mono). The render environment can't fetch Google
Fonts (its proxy presents an untrusted CA), so the OFL Geist `woff2` files are
bundled in `public/fonts` and embedded as base64 data URLs at render time
(`scripts/embed-fonts.mjs`) — no network needed.
