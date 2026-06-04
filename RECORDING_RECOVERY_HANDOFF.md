# Recording Recovery Handoff

Implemented a first pass of mid-session recording recovery.

What changed:
- Added `src/lib/recording-draft.ts`, an IndexedDB-backed local draft store.
- `RecordingProvider` now writes MediaRecorder chunks every 4 seconds and saves metadata/transcript progress.
- On app reload, the provider restores the active user's saved draft as a recorded clip.
- Recovered clips can be generated, discarded, downloaded after failure, or resumed by appending a new recording segment.
- Successful note generation and explicit discard clear the local draft.
- The upload path still uses the existing R2 presign + `/api/notes` flow; cloud upload only happens after the user generates notes.

Important limitation:
- A browser cannot upload to Cloudflare while Wi-Fi is down. This implementation saves locally while offline/interrupted, then uploads the recovered blob when the user is online again.

Still needs validation:
- Install dependencies / local Next docs, then run lint/build.
- Manual browser test: start recording, wait for a chunk, refresh/kill tab, confirm recovery, resume, stop, generate.
- Consider replacing local-only recovery with a resumable cloud uploader later if Atlas needs cross-device recovery.
