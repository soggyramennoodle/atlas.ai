# Note-line chat & "Add to note" — Design

Date: 2026-06-08
Status: Approved (pending spec review)

## Summary

On the opened-note page (`src/app/(app)/notes/[id]`), let a student chat with the AI
about an **individual note line**, not just key concepts. Hovering a note block already
reveals where its information came from (the existing `SourceBullet` transcript excerpt).
This feature adds, alongside that, a **hover-revealed "Ask Atlas" button** on each note
block that opens a **side-anchored chat popup** — mirroring the key-concept popup
(`concept-card.tsx`) — scoped to that one line.

From a **Go deeper** answer, an **"Add to note"** button streams the deeper content into
the note body live (ChatGPT-style typewriter), persists it, and marks it as
AI-authored so its provenance stays honest.

## Goals

- Ask the AI to clarify / justify / expand any single note line.
- Reuse the established concept-card chat UX (AI-ring shell, spring motion, streaming
  caret, preset actions + free-text follow-up).
- Side popup positioned left/right based on available space, like `SourceBullet`.
- "Add to note" inserts AI "go deeper" content into the body, streamed live, persisted,
  and clearly marked as Atlas-added (not claimed as lecture-sourced).
- Gemini responses must never truncate mid-thought.

## Non-goals

- No change to the existing hover-for-source bubble (`SourceBullet`) behavior.
- No "Add to note" on legacy structured-only notes (no `bodyHtml`) — those get chat only.
- No new persistence model; reuse `PATCH /api/notes/[id]` and the `StructuredNotes.bodyHtml`
  field.

## Decisions (from brainstorming)

- **Trigger:** hover-revealed ✨ "Ask Atlas" button at the end of the block — keeps normal
  click and text-selection on the line untouched. Separate trigger from the 800ms
  hover-source bubble; they coexist.
- **Scope of askable blocks:** all text blocks — `<li>`, `<p>`, `<h2>`/`<h3>` (and legacy
  `SectionView` bullets/headings).
- **Source link:** keep the hover-source bubble unchanged; *also* show the line's source
  excerpt inside the popup header while chatting.
- **Presets:** *Clarify / explain this* · *Why does this matter* · *Go deeper* (free-text
  follow-up box always available).
- **Add to note:** reuse the already-streamed Go-deeper text (no second AI call); insert as
  new bullet(s) under the source line, typewriter-revealed. Limited to the rich-text body
  (`bodyHtml`) path.

## Architecture

### New: `src/app/api/lines/chat/route.ts`

Structurally identical to `src/app/api/concepts/chat/route.ts`:

- `runtime = "nodejs"`, `maxDuration = 30`.
- Auth via `createClient()` → `supabase.auth.getUser()`; 401 if absent (Gemini key never
  reaches the client).
- Body: `{ line: string; noteTitle?: string; subject?: string; summary?: string;
  sourceExcerpt?: string; messages: ChatMessage[] }`.
- Line-tuned `systemInstruction`: Atlas is helping with ONE specific line from the
  student's lecture notes; given the line text, note title/subject, summary, and the
  source excerpt (when present); stay focused on the line and directly related ideas;
  may use web search to verify/expand; concise conversational prose, no markdown headings.
- Streams plain-text tokens (`text/plain; charset=utf-8`, `Cache-Control: no-store`).
- Google Search grounding with graceful fallback (same try/catch as concepts/chat).

**No-truncation requirement (applies here and is verified in the existing concept routes):**
`thinkingConfig: { thinkingBudget: 0 }` so Gemini 2.5 thinking tokens don't consume the
output cap, and a generous `maxOutputTokens` (4096) so even a long "Go deeper" answer
completes. The stream is drained to completion before the controller closes.

### New: `src/components/notes/line-chat.tsx`

A `LineChatPopup` (+ supporting bits). Reuses the concept-card patterns:

- `ai-ring` / `ai-ring--active` shell, `SPRING`, `StreamingCaret`, `ChatInput`-style box,
  `AbortController`-guarded streaming, collapsible turns.
- **Presets:** Clarify / Why it matters / Go deeper → POST `/api/lines/chat`.
- **Header:** the line text + source excerpt (label "From the lecture" / "Researched
  online") when provided.
- **Positioning:** opened anchored to the clicked block's bounding rect; choose left/right
  by which side has more room (`rect.left > window.innerWidth - rect.right`). Rendered in a
  body portal, positioned in page coordinates so it tracks scroll. Backdrop click + Esc
  dismiss.
- **"Add to note":** appears on a completed *Go deeper* turn. Calls
  `onAddToNote(answerText)` provided by `NoteView`; disabled while a previous insert is in
  flight; hidden entirely when the note has no `bodyHtml` (legacy path).

An `AskableBlock` wrapper renders its children plus the hover-revealed ✨ button and owns
opening the popup for that block (passing the block's text + optional source excerpt).

### Edited: `src/components/notes/note-view.tsx`

- Wrap askable blocks with `AskableBlock` in both `EditedNoteBody` (li/p/h2/h3) and legacy
  `SectionView` (bullets/headings). The ✨ button is independent of `SourceBullet`, so both
  hover affordances coexist.
- Lift `insertAiBlock(afterText: string, html: string)` into `NoteView`:
  - Parse current `saved.bodyHtml`, find the block whose normalized text matches
    `afterText`, splice a new `<li data-atlas-ai="1">…</li>` (or `<p data-atlas-ai="1">` for
    paragraph context) immediately after it. If multiple paragraphs, emit multiple `<li>`s.
  - Update `saved` + `draft` state and `PATCH /api/notes/{id}` with the new content
    (reusing the existing autosave status pill).
  - Mark the freshly inserted block id as "streaming" so `EditedNoteBody` reveals it with a
    typewriter animation; on completion it becomes static.
- `EditedNoteBody` changes:
  - Recognize `data-atlas-ai` blocks: render them with the **"Added by Atlas"** provenance
    treatment (via `SourceBullet` `status="ai"`).
  - **Do not increment `listItemIndex` for AI blocks** — they never consume a lecture-source
    index, so existing `bodySources` stay aligned regardless of insertion position.
  - Support a typewriter reveal for a block whose id matches the current "streaming" id;
    instant when `prefers-reduced-motion`.

### Edited: `src/components/notes/source-bubble.tsx`

- Extend the `status` union with `"ai"`.
- `"ai"` renders an amber/Atlas accent, label **"Added by Atlas"**, and a short
  "verify against your course materials — this was generated, not from the lecture" note,
  mirroring the existing `"research"` treatment.

## Data flow

1. Hover a note block → ✨ button fades in (block-level), independent of the 800ms
   source bubble.
2. Click ✨ → `LineChatPopup` opens anchored to the block; header shows line + source.
3. Preset or free-text → `POST /api/lines/chat` (streamed). Turns collapse/expand like the
   concept card.
4. On a *Go deeper* turn, **Add to note** → `insertAiBlock` splices a
   `<li data-atlas-ai="1">` after the source line, streams it in (typewriter), and
   `PATCH`es the note. Render shows the "Added by Atlas" marker; lecture-source indices
   unaffected.

## Edge cases

- **Edit after adding:** opening the TipTap editor may drop the `data-atlas-ai` marker
  (editor schema) — the block then becomes ordinary edited content. Acceptable.
- **Reduced motion:** typewriter falls back to instant insert; popup uses existing reduced
  motion handling.
- **Abort/unmount:** in-flight streams aborted via `AbortController`, as in `concept-card`.
- **Legacy notes (no `bodyHtml`):** chat works; "Add to note" button hidden.
- **Match failure on insert:** if `afterText` can't be located in `bodyHtml` (e.g. the line
  was edited concurrently), append the AI block at the end of the body rather than dropping
  it, and surface a quiet toast.
- **No source excerpt:** popup header simply omits the source row.

## Testing

- Unit: `insertAiBlock` HTML splice — inserts `data-atlas-ai` block after the matching
  block; multi-paragraph → multiple `<li>`; unmatched `afterText` → appended at end;
  existing `<li>` order/text preserved (source-index stability).
- Unit: `EditedNoteBody` source indexing skips `data-atlas-ai` blocks so a mid-body AI
  insertion leaves later `bodySources` aligned.
- Manual: hover shows ✨ without disturbing the source bubble; popup opens on the side with
  room; presets stream; long "Go deeper" answer completes without truncation; Add to note
  streams + persists + survives reload with "Added by Atlas" marker; legacy note hides the
  button.

## Files

- New: `src/app/api/lines/chat/route.ts`
- New: `src/components/notes/line-chat.tsx`
- Edited: `src/components/notes/note-view.tsx`
- Edited: `src/components/notes/source-bubble.tsx`
