# Releases 2–6: review branch

This branch is not a production release. `workspace.html` is an opt-in replacement workspace. The existing homepage and legacy data remain unchanged until migration approval and release validation.

## Implemented for review

- Release 2: per-account encrypted IndexedDB; optional separate vault passphrase; explicit cloud sync; normalized guides/steps, private media, optimistic revision checks; domain capture restrictions and automatic sensitive-field/text masking.
- Release 3: image crop, zoom, blur, permanent black redaction, arrows, boxes, text, click highlights; image and guide undo/redo; replace images, select/duplicate/merge/delete steps. Committing redaction clears local undo/original for that image. Previously synced versions must be deleted separately by deleting the cloud guide.
- Release 4: sections/callouts/warnings, reusable local blocks, templates, folders/tags, variables, guide merge/split, branching, cloud version comparison/restore, recapture, ZIP/HTML/Markdown exports.
- Release 5: explicit snapshot publication, account-free links, password/expiry/verified-domain restrictions, revocation, iframe snippet, authenticated comments/outdated reports, workspace roles and invitation links, branding.
- Release 6 subset: opt-in viewer progress events, completion, assignments/due dates, overdue indication, screen capture and voice recording, semantic labels/keyboard controls.

## Not completed or activated

No paid plans, checkout, creator billing, refunds, scheduled email reminders, hosted AI/translation, webhook delivery, MCP server, public integration SDK, native desktop recorder, or complete accessibility audit. These are not claimed as released. Cloud end-to-end encryption and encrypted extension staging are not implemented. The web vault is encrypted, but the extension retains pending screenshots in Chrome local storage until acknowledged. Local offline editing requires an already loaded workspace; no offline app-shell cache is provided yet. Edited images are in exports; original-image ZIP inclusion exists in the exporter but is not exposed by the UI. Preview uses a temporary same-tab sessionStorage copy. Clear the browser session to remove that copy.

## Deployment gate

Automatic approval review rejected the production migration because it adds persistent workspace roles, public RPCs, invitations, and storage permissions. Do not apply it by another route or merge/activate this workspace before explicit approval.

Review `db/releases-2-6.sql`: ten new tables, RLS, checked private functions and invoker public RPCs, and one private 20 MB media bucket. It leaves `workflow_libraries` intact. Apply once transactionally after approval. Run the isolated SQL and browser checks, then test real Supabase storage and multi-account flows in staging. Production activation should replace the homepage only after these gates pass. Existing email/password authentication and account settings are unchanged.

## Privacy and operational limits

Default browser encryption stores its key in the same profile; use the separate vault passphrase for locked-vault protection. It is not protection from malicious scripts running in an unlocked origin. Masking is best effort: review every image before upload. Publishing includes inline media in a snapshot; large guides can exceed request limits. Anonymous events are untrusted analytics, not proof of training, and require production abuse controls before broad rollout. Invite links are generated only; no email is sent. Domain restrictions require verified email even though the user requested no general signup verification. Deleting cloud media and database rows is not atomic; retry a failed deletion. Query pagination and retention/quotas are still required before large-scale use.

## Validation

`npm test` includes capture recovery and import-injection/history tests. `npm run build` bundles pinned dependencies. GitHub Actions runs real Chromium capture and workspace smoke tests and an isolated Postgres 17 migration/access-control test. Mocked workspace browser tests validate local behaviors; they do not prove production Supabase integration.
