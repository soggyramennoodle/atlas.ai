# Atlas — teaser

A short SaaS motion-graphic teaser for **Atlas**, built with
[Remotion](https://www.remotion.dev/). It reconstructs the real Atlas UI
(sidebar, dashboard stat cards, the AI-summary note card with its living edge
glow, the live-capture chip) and flies the pieces in from 3D space before they
fall flat into place — closing on a partial tease of the URL.

This is a **self-contained Remotion project** that lives alongside the Next.js
app. It has its own `package.json`/`node_modules` and does not touch the app
build.

## Run it

```bash
cd teaser
npm install
npm run dev      # open Remotion Studio to scrub/preview
npm run render   # render to out/atlas-teaser.mp4 (1920×1080, 30fps)
npm run still    # export a poster frame to out/poster.png
```

## What's in it

| Beat | Scene | Notes |
| --- | --- | --- |
| Cold open | `scenes/SceneLogo` | Brand shards converge in 3D; the mark rotates flat out of space (slow fade). |
| Promise | `scenes/SceneTagline` | "Sit back / and listen." — snappy, the real hero headline. |
| Product | `scenes/SceneAssemble` | The dashboard hovers in 3D, then springs flat into the real layout. |
| Sign-off | `scenes/SceneOutro` | URL teased: `atlas.` resolves, the TLD only ever ghosts in. |

### Design system

`src/theme.ts` carries the exact brand tokens pulled from the app
(`src/app/globals.css`, `src/app/icon.svg`): the forest-green primary
(`#0a5736`), the night canvas (`#08080C`), the boxy 4px geometry, and the
living emerald→teal→blue→violet→coral→honey "AI" gradient that signals a
surface was written by Atlas.

Animation timing follows the brief: **slow, cinematic fades** for the cold open
and sign-off; **fast, snappy fades** as UI elements land. Helpers live in
`src/anim.ts` (`slowFade`, `snapFade`, `settle3d`, `settleSpring`).

### Fonts

Atlas runs on **Geist** (Sans + Mono). The render environment can't fetch
Google Fonts, so the OFL Geist `woff2` files are bundled in `public/fonts` and
loaded locally via `@remotion/fonts` (see `src/fonts.ts`).

### Teaser, not a reveal

Copy is intentionally sparse, the note card fades into the canvas, and the URL
is never fully shown — enough to intrigue, not enough to give it all away.
