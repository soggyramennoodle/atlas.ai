# Email Signature Generator — design

**Date:** 2026-06-12
**Status:** Approved (pending spec review)

## Summary

An admin-only tool that produces a consistent, on-brand Atlas email signature.
A staff member fills a short form, sees a live preview, and clicks **Copy
signature** to put a formatted signature on the clipboard — pasting straight
into Gmail / Outlook / Apple Mail with the Atlas wordmark and layout intact.
Modeled on McMaster's brand email-signature generator.

No backend, no database, no new dependencies. Pure client form + one pure
markup helper + a unit test.

## Audience & brand

- **Who:** Atlas team members (admins) generating their own signatures.
- **Brand:** Atlas. Black `atlas-lockup-3d.png` wordmark, canonical domain
  `atlasai.ca`. **Monochrome** — no color accent (green is retired branding).
  Hierarchy comes from weight, size, and letter-spacing, matching the
  cinematic-light marketing aesthetic.

## Route & access

- New page: `src/app/(app)/admin/signature/page.tsx`.
- Server component; guards with `getNewsroomAdmin()` → `notFound()` when not an
  admin, identical to every other admin page (hides the area's existence).
- Add a `Signature` card (lucide `Mail` icon) to the `ACTIONS` array in
  `src/app/(app)/admin/page.tsx`.

## UI (the admin tool itself — cinematic-light)

Two-column on `lg`, stacked on mobile.

- **Header:** `AdminHeader` from `admin-kit`, `Mail` icon, editorial title
  ("Email **signature**" with the second word in the usual styled treatment),
  quiet description.
- **Left — form.** Fields use `ADMIN_INPUT` pills with small uppercase labels:
  - Full name — required
  - Job title — required
  - Email — required
  - Phone — optional
  - Pronouns — optional
  - CTA label + CTA URL — optional pair (e.g. "Book a demo" → a URL)
  Empty optional fields are simply omitted from output (no dangling
  separators or empty lines).
- **Right — preview.** A sticky `CARD` with a white inner surface rendering the
  live signature via `dangerouslySetInnerHTML`, so **preview === pasted
  result**. Beneath it:
  - **Copy signature** — `ADMIN_BTN_PRIMARY` (primary action)
  - **Copy HTML source** — `ADMIN_BTN` (secondary)
  Each shows a transient "Copied ✓" state for ~1.5s.

## The signature markup (email-safe — different rules from the app)

Email clients strip `<style>`, flexbox, custom-font embedding, and most modern
CSS. Therefore the signature is **table-based with fully inline styles**.

Layout:

```
[Atlas logo]  │  Adeeb Rahman  he/him
  ~140px      │  Founder · Atlas
              │  atlasai.ca · adeeb@atlasai.ca · +1 …
              │  Book a demo →
```

- Outer `<table>` (role="presentation", `cellpadding=0 cellspacing=0`).
- **Left cell:** the wordmark `<img>` at a fixed display width (~140px) with
  explicit `width`/`height` attributes (Outlook needs them). `src` is the
  **absolute** URL `https://atlasai.ca/brand/atlas-lockup-3d.png` — relative
  paths do not load in recipients' inboxes.
- **Divider:** a thin neutral rule (`#0d0d0d` at low opacity, e.g. a 1px
  bordered cell) between logo and text — not colored.
- **Right cell (text block):**
  - **Name** — `#0d0d0d`, bold, ~15px. Pronouns, if present, appended in a
    lighter grey at smaller size on the same line.
  - **Title** — `Job title · Atlas`, muted grey ~13px.
  - **Contact line** — small grey ~12px: `atlasai.ca` link, email `mailto:`
    link, and (if present) phone `tel:` link, joined by ` · ` separators.
    Only present pieces appear.
  - **CTA** — if both label and URL are present, a plain text link
    (`label →`), `#0d0d0d`, no fill (filled buttons break in Outlook).
- **Font:** every text node carries
  `font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif`.
  Inter shows for recipients who have it; everyone else gets a near-identical
  system sans. (Web fonts cannot be embedded in a pasted signature — this stack
  is the robust path. No serif accent: Instrument Serif won't render in email.)

## Core unit — `buildSignatureHtml(fields)`

- Location: `src/lib/email-signature.ts`.
- Signature:
  ```ts
  type SignatureFields = {
    fullName: string;
    jobTitle: string;
    email: string;
    phone?: string;
    pronouns?: string;
    ctaLabel?: string;
    ctaUrl?: string;
  };
  function buildSignatureHtml(fields: SignatureFields): string;
  ```
- **Pure** — deterministic string output, no DOM, no React. Drives both the
  preview and the clipboard, guaranteeing they match.
- **HTML-escapes** every interpolated value (a name with `&`, `<`, `>`, `"`
  must not break or inject markup). URLs validated/escaped for the `href`.
- Optional fields omitted cleanly when blank/whitespace-only.

## Copy mechanism

In the client component (`src/components/admin/signature-generator.tsx`):

- **Copy signature:** async Clipboard API writing one `ClipboardItem` with both
  `text/html` (the built markup) and `text/plain` (a sensible plaintext
  fallback). Pastes formatted into Gmail/Outlook/Apple Mail.
  - **Fallback** for browsers without `ClipboardItem`: render the markup into a
    hidden node, select it, `document.execCommand('copy')`.
- **Copy HTML source:** copies the raw markup string as `text/plain` via
  `navigator.clipboard.writeText`.
- Both wrapped in try/catch; on failure show a brief "Copy failed" state.

## Testing

- Unit-test `buildSignatureHtml` (vitest — project already configured):
  - required fields (name, title, email) render in output;
  - each optional field omitted when absent, present when supplied;
  - no dangling ` · ` separators when middle contact pieces are missing;
  - HTML special chars in values are escaped (no raw `<script>` / broken
    attributes);
  - CTA only renders when **both** label and URL are present.
- Clipboard interaction is verified manually in the browser preview (Copy →
  paste into a Gmail compose) — not unit-tested.

## Out of scope (YAGNI)

- Persisting signatures or per-user defaults.
- Multiple templates / layout variants.
- Light/dark signature variants.
- Photo/avatar (not requested).
- Making org name/logo/colors configurable (hardcoded to Atlas).
