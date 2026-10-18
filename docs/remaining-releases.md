# Pathira release status

Billing is deferred by explicit user instruction. Do not add checkout, subscriptions, pricing, or payment dependencies in this release series.

## Merged functionality

- PRs 1–4: recoverable browser capture; encrypted local web vault; optional cloud sync; normalized private guide/media storage; image editing and redaction; guide templates/sections/tags/folders/variables/branching; versions and exports; protected sharing, roles, comments, assignments; default workspace rollout; private previews and conflict recovery.
- PR 5: authenticated guide API, JavaScript client, and read-only local stdio MCP server. No hosted OAuth/remote MCP registration.
- PR 6: consent-based AI translation drafts with provider validation and manual review, plus assignment calendar reminders.
- PR 7: opt-in email scheduling/cancellation to the assignee's own verified email, and signed editor-authorized metadata delivery to an administrator-configured integration.
- PR 8: encrypted extension staging and migration of existing plaintext captures, keyboard image selection, and automated serious/critical accessibility checks.

## External configuration still required

AI translation: provider credentials or Netlify AI Gateway, explicit enable flag, available model ID. Email: Resend key and verified sender, explicit enable flag. Webhooks: public HTTPS destination, signing secret, workspace ID, explicit enable flag. No live AI requests, emails, or webhook deliveries were performed during implementation. Each provider remains disabled until configured. See translation-reminders.md, email-webhooks.md, and integrations.md.

## Practical limits and remaining expansion work

- Browser/extension encryption stores a nonextractable key in the same browser profile. A separate optional web-vault passphrase is available. This is not cloud end-to-end encryption or protection against scripts running in an unlocked origin.
- Masking is best effort. Review screenshots before syncing. Historical cloud versions can retain earlier images until the guide is deleted.
- Browser screen/video/voice capture is available where supported. A standalone native desktop recorder and full offline app-shell cache are not implemented.
- Calendar reminders rely on the user's calendar app. Email cancellation is explicit; completing/deleting an assignment via another client does not cancel an existing provider schedule.
- Webhook delivery is explicit and has bounded retries, stable event IDs, and acknowledgement receipts. It is not automatic change-data capture or a durable background retry queue.
- Accessibility automation checks selected flows; it is not a complete manual assistive-technology audit.
- Publishing large inline-media snapshots may exceed request limits. Retention policies, quotas, broader load testing, and anonymous analytics abuse controls remain production-scaling work.

## Database and rollback

The approved production migrations `workspace_guides_publishing_learning` and `restrict_workspace_rpc_anonymous_grants` are applied. All ten new tables have RLS, media is private, and privileged RPCs deny anonymous execution. The legacy workflow library is preserved; the older UI is available at legacy.html.

Every PR is merged only after required CI checks pass. CI covers unit tests/build, Chromium capture/workspace/mobile flows, and isolated Postgres access-control tests. Live Supabase login, private upload/download, guide save, revision conflict and anonymous-write checks passed with temporary data removed afterward.
