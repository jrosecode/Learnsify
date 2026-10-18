# Capture reliability release candidate (1.4.0)

Implemented: event checkpoints before screenshots; explicit interruption recovery; pause/resume; manual screenshots; per-step failures and retry; duplicate flags; visible 50-step cutoff and storage warning; import acknowledgement after cloud persistence; stable step IDs for replay protection; no clearing pending captures on start or upgrade.

Capture resumes in a paused state after a service-worker restart. Resume or finish from the panel. Screenshots are post-click and queued at least 600 ms apart. If the active tab or URL changes before a screenshot, the step is retained with an error rather than capturing a different page. Retry requires returning to the original tab and URL.

## Verification

`npm test`: 25 passing tests, including mocked Chrome storage, interrupted sessions, failed screenshot recovery, import acknowledgement, and capture limits.

`npm run build`: passes.

Real Chromium verification passed in GitHub Actions: event checkpoints, screenshots, pause/resume, manual capture, browser restart recovery, pending import retention, overwrite protection, and batch acknowledgement. The side-panel preview was inspected at 400px width. Local browser downloads were unavailable; the remote tests use real Chromium with the unpacked extension.

Run `node scripts/capture-smoke.cjs` in an environment with Playwright and Chromium installed. It loads the unpacked extension, tests screenshots, pause/resume, browser restart, and acknowledged imports. Additional exploratory coverage should include rapid clicks, multiple windows, long navigation, and failed cloud saves.

Package the extension after verification: `npm run package:store -- --name Pathira --slug pathira`. The existing store ZIP remains the earlier release until this gate passes.

## Remaining roadmap

This candidate implements Release 1 only. Undo/redo, timing controls, local database encryption, storage normalization, editing, publishing, collaboration, billing, and later expansion remain separate planned releases.
