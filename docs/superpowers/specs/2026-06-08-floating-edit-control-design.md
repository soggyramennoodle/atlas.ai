# Floating Edit / Done control — Design

Date: 2026-06-08
Status: Approved

## Problem

On the opened-note page the Edit / Done control lives only in the top toolbar.
A student reading or editing far down a long note must scroll all the way up to
hit Edit, then back down to work, then up again to Save. The edit affordance
should be reachable wherever the student is on the page.

## Decision

A **floating pill that reveals on scroll** (chosen over an always-visible pill or
a sticky toolbar): keep the top toolbar; once it scrolls out of view, a compact
Edit/Done pill fades in at bottom-right and follows the student. No duplicate
control while the toolbar is on screen.

## Behavior

- An **IntersectionObserver** watches the existing toolbar. While it intersects
  the viewport, the pill is hidden. Once it scrolls out of view, the pill fades
  in (spring fade + slide; opacity-only under `prefers-reduced-motion`). It fades
  back out when the toolbar returns to view — never two visible controls at once.
- The pill **mirrors the toolbar state exactly**:
  - View mode: `✎ Edit` → `startEditing()`.
  - Edit mode: `✓ Done` → `done()`, with the **Saving…/Saved** indicator beside
    it so save state is visible from anywhere in the note.
- Placement: `fixed bottom-6 right-4 sm:right-6`, mobile safe-area inset, `z-40`
  so the line-chat popup (`z-50`) and the AtlasCursor reading overlay (`z-[60]`)
  still sit above it.

## Code shape

- **Edited:** `src/components/notes/note-view.tsx` only. No new files, no API or
  state-model changes; reuses the existing `editMode`, `status`,
  `doneInProgress`, `startEditing`, and `done`.
- **Extract `EditControls`** — the `AutosaveIndicator` + the animated Edit/Done
  button currently inline in the toolbar — into one small presentational
  component. Both the top toolbar and the floating pill render the same
  `EditControls`, so their behavior cannot drift (avoids duplicating the Done
  button's grow/shrink-into-spinner morph).
- The floating pill is `EditControls` wrapped in a floating card (border,
  `bg-card`, shadow, rounded), shown when `!toolbarVisible`.
- A `toolbarRef` + `useEffect` IntersectionObserver sets `toolbarVisible`;
  observer disconnected on unmount.

## Edge cases

- Short notes (toolbar never leaves the viewport) → pill never appears.
- `processing` / `failed` notes early-return before the toolbar renders, so the
  pill never mounts there.
- Reduced motion → fade only, no slide.

## Testing

Scroll/observer-driven UI with no pure logic to assert. Verify via `tsc` +
`next build`, plus manual checks: pill reveals after scrolling past the toolbar
and hides on return (view + edit mode); Done + Saving/Saved both work from the
pill at the bottom of a long note; reduced-motion fades without sliding.

## Files

- Edited: `src/components/notes/note-view.tsx`
