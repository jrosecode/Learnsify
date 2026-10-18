# Core product completion plan

Billing and additional AI are excluded.

1. Reliability: preserve accurate per-guide cloud status, retry transient sync failures with bounded backoff and reconnect recovery, filter duplicate events without dropping intentional manual captures. Confirm existing manual capture and zoom controls.
2. Editing and organization: show repositioned click highlights in editor, viewer and exports; add personal favorites/filter and authoritative owner display.
3. Collaboration: reviewer membership; submit a specific cloud revision for review; independent reviewer/admin approval or changes requested; invalidate approvals on edits; prevent publishing an unapproved submitted revision. Transfer guide ownership only to an existing editor/admin or workspace owner. Record scoped, append-only change history without guide content or passwords.
4. Durability: mark cloud deletions before removing objects, immediately revoke sharing, block concurrent edits/uploads, retain retryable deletion state, and finalize only when storage is empty. Reject oversized inline publication with a clear export alternative rather than an opaque request failure.
5. Verification: unit tests for retry/filter behavior; browser checks for favorites and image highlights; SQL tests for reviewer boundaries, approval invalidation, ownership, audit isolation and interrupted deletion. Apply the additive migration only after tests pass; verify the live schema and merge the tested PR to main.

Hosted two-account acceptance requires independent authenticated sessions. Do not claim a simulated SQL identity test is a hosted browser test or create unsolicited invitations/emails.
