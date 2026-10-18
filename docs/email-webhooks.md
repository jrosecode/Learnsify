# Optional email reminders and integration delivery

Billing remains excluded.

## Email reminders

Users schedule reminders from their own assignment's Email reminder button. The server verifies the current Supabase user and assignment ownership, then uses only that user's confirmed account email. It ignores client-supplied recipient fields. Reminders can be scheduled from one minute to 30 days ahead; times entered in the UI are converted from the user's local time to UTC.

Enable with Functions-scoped `PATHIRA_REMINDERS_ENABLED=true`, `RESEND_API_KEY`, and `PATHIRA_EMAIL_FROM` (a sender verified with Resend). No service-role Supabase key is needed. Resend performs the future delivery; no cron worker is required. Status and cancellation are available in the same dialog. Reminder text is generic and contains no guide contents. Cancel the reminder if you finish early: completing/deleting an assignment through another client does not automatically cancel the provider's existing schedule. Provider cancellation may fail if delivery already occurred.

Netlify Blobs stores provider receipts in a strongly consistent store separated by deployment context. Retries reuse a payload-derived Resend idempotency key. A provider success followed by a storage failure requires retrying with the same time; provider deduplication has its own retention limit. This is not an exactly-once delivery guarantee. Delivered/cancelled receipt cleanup is an operational retention task.

## Signed integration events

Configure `PATHIRA_WEBHOOK_ENABLED=true`, `PATHIRA_WEBHOOK_URL` (an administrator-controlled public HTTPS destination), `PATHIRA_WEBHOOK_SECRET` (32+ characters), and `PATHIRA_WEBHOOK_WORKSPACE_ID`. The app's Send integration event action requires a synced guide and explicit confirmation. The server independently checks owner/editor/admin access in that configured workspace. Viewers cannot send events. This is an explicit delivery action, not automatic change-data capture.

Payload: stable event ID, event type `guide.updated`, guide ID, workspace ID, revision, and title. No guide instructions or media are sent. `X-Pathira-Signature` is lowercase HMAC-SHA256 of `X-Pathira-Timestamp + '.' + rawBody`. Verify signatures with constant-time comparison, reject timestamps outside your accepted replay window, and deduplicate by `X-Pathira-Event`. Repeated delivery of the same guide revision uses the same event ID. Redirects are rejected. The function retries transient failures up to three times with an eight-second timeout per attempt. Acknowledgements are recorded; failed deliveries can be retried manually. There is no durable background retry queue.

## Activation and validation

All endpoints fail closed when configuration is missing. No email or integration payload was sent during implementation. Tests use simulated providers and exercise ownership, unverified/disabled behavior, recipient isolation, signatures, retries and duplicate acknowledgements. Configure and verify provider accounts/destinations before enabling either feature.
