# PR #3: workspace rollout and session continuity

PR #2 is merged and its database migrations are applied. This follow-up makes the new workspace the default homepage. The former application remains available at `legacy.html` for troubleshooting.

Changes:
- Preserve invitation and shared-guide destinations through login using an allowlist of same-origin pages.
- Load cloud guides on startup so a second device sees existing work.
- Reconcile refreshes without overwriting dirty local drafts; remove clean guides deleted from the server and preserve locally cached images when the revision is unchanged.
- Route the old creation form into local-first workspace creation rather than writing to the old library.
- Test the actual homepage in Chromium, including mobile layout and encrypted local reload.

Validation: 33 local tests and production build pass. CI runs Chromium and isolated database checks. Live Supabase integration checks are reported in the PR after execution; no credentials are stored in this repository.

This PR does not implement billing, automated AI translation, scheduled email reminders, or MCP. Those remain separate work. No new database migration is required for this PR.
