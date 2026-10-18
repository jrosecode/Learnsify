# Product priorities

Pathira captures any browser process and turns it into a guide your team can securely edit, share, and keep current.

The immediate scope is accounts, persistence, sharing, capture reliability, screenshot editing, organization, and portable exports. Billing and further AI development are deferred.

## Implemented foundation

- Supabase accounts and workspace memberships; private guide/media storage with row-level access controls.
- Explicit cloud sync and optional automatic syncing of future edits. Local-only guides are not available on another device until synced. Concurrent revision conflicts offer recovery rather than silent overwrite.
- Published share snapshots with account-free viewing, optional password/expiry, domain-restricted access requiring verified sign-in, and revocation. Drafts stay private. Publish again after edits to update a shared snapshot.
- Extension pause/resume, warnings, crash recovery and acknowledged import into the website. Imported captures are saved locally before acknowledgement; cloud sync is a separate operation.
- Crop, blur/redaction, arrows, boxes, text, image replacement, keyboard area selection, and undo/redo.
- Folders, tags, search, templates, sections and cloud version history.
- ZIP with JSON/HTML/Markdown and images, optional original-image export, and complete-guide printing through the browser's Save as PDF option. PDF is a print export, not a server-generated file. Original captures are available only when retained locally.

## Next reliability acceptance work

Exercise the full journey with two independent accounts/devices: capture, import, annotate/redact, sync, reopen with media, publish, anonymous view, password rejection/acceptance, revoke, export and delete. Existing CI and database access tests cover components, but are not a substitute for that full hosted acceptance journey.

Continue hardening sync visibility and retry behavior, large-media sharing limits, deletion failure recovery and storage cleanup. Do not describe local-only saving as cloud saving.

## Later collaboration scope

Memberships, editor/viewer access and comments exist. Reviewer roles, independent revision-specific approval, guide ownership transfer and append-only workspace audit history are implemented in PR #10. History begins when the migration is applied; it does not reconstruct older events.
