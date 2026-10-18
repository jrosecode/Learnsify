# Pathira — Project Handoff

## Product

**Pathira** records browser clicks across tabs, captures a screenshot for each action, and turns the ordered activity into editable step-by-step guides.

**Positioning:** Make repeatable browser work easy to document, teach, and follow.

## Canonical locations

- Production domain: https://pathira.com *(DNS cutover pending)*
- Current live site: https://pathira.netlify.app
- Privacy policy: https://pathira.netlify.app/privacy.html
- GitHub: https://github.com/jrosecode/Pathira
- Local repository: `/Users/luca/Pathira`
- Netlify project: `pathira`
- Netlify site ID: `e25d595c-9de6-402c-8bbc-5022b25b189a`
- Production branch: `main`

## Current release

- Website/app: Pathira
- Chrome extension: Pathira `1.3.0`
- Latest verified commit at handoff creation: `98d124d4d3cf62871f73a7a222829a42ce17db6a`
- Test suite: 17 tests passing
- Chrome Web Store ZIP: `store/packages/pathira.zip`

## What works

### Web application

- Responsive workflow library
- Search and category/status filters
- Create and edit guides
- Add, remove, and reorder steps
- Interactive guide player with progress
- Shareable guide links
- Lightweight local analytics
- Browser persistence with `localStorage`
- Automatic migration from the former `learnsify-workflows` storage key

### Chrome extension

- Manifest V3
- Persistent Chrome right-side panel
- Capture continues while switching tabs
- Ordered click timeline
- Compressed screenshot for every click
- Coral highlight around the clicked element
- Accessible label, element type, page title, URL, and coordinates
- Embedded-frame capture, including Google’s app launcher
- Maximum 50 captured steps per session
- Local-only extension storage
- Import captured steps into the Pathira editor

### Verified browser scenario

A real Chromium test successfully:

1. Opened Google.
2. Opened the Google apps launcher.
3. Selected YouTube.
4. Clicked YouTube Search.
5. Recorded all actions and screenshots in order.
6. Displayed them in the persistent side panel.
7. Imported them into a Pathira guide.

## Architecture

- Buildless frontend: HTML, CSS, and JavaScript in `src/`
- Build command: `npm run build`
- Build output: `dist/`
- Extension source: `extension/`
- Tests: `test/`
- Store documentation and package: `store/`
- Netlify configuration: `netlify.toml`

### Important files

- `src/index.html` — application entry
- `src/app.js` — dashboard, editor, player, and extension bridge
- `src/model.js` — workflow model helpers
- `src/styles.css` — application design system
- `src/privacy.html` — public privacy policy
- `extension/manifest.json` — Chrome extension manifest
- `extension/background.js` — capture queue, screenshots, storage, import
- `extension/content.js` — click detection and webpage bridge
- `extension/sidepanel.html` — persistent panel markup
- `extension/sidepanel.js` — live capture timeline
- `store/listing.md` — Chrome Web Store listing copy
- `store/permission-justifications.md` — permission explanations
- `store/submission-checklist.md` — release checklist

## Local development

```bash
cd /Users/luca/Pathira
npm install
npm test
npm run build
python3 -m http.server 4173 -d dist
```

Open `http://127.0.0.1:4173`.

## Load the extension locally

1. Open `chrome://extensions`.
2. Enable **Developer mode**.
3. Select **Load unpacked**.
4. Choose `/Users/luca/Pathira/extension`.
5. After extension updates, click **Reload** on the extension card.
6. Click the Pathira extension icon to open its right-side panel.

## Chrome Web Store packaging

Generate a clean store package:

```bash
npm run package:store -- --name Pathira --slug pathira
```

Output:

```text
store/packages/pathira.zip
```

Before submission, confirm:

- Chrome Web Store developer account is active.
- Public/unlisted/private visibility is selected.
- Final store screenshots and 440×280 promotional tile are uploaded.
- Privacy and data-use declarations match `store/permission-justifications.md`.
- The package is uploaded only after final owner approval.

## Deployment

GitHub `main` is connected to Netlify continuous deployment.

Normal release flow:

```bash
npm test
npm run build
git add .
git commit -m "type: concise change"
git push
```

Verify the Netlify production deploy references the exact pushed commit before declaring release success.

## Remaining blocker: Squarespace DNS

Netlify recognizes `pathira.com` and `www.pathira.com`, but Squarespace still serves its default page because the purchased domain retains Squarespace’s default DNS records.

Update DNS in Squarespace:

- `A` record: host `@` → `75.2.60.5`
- `CNAME` record: host `www` → `pathira.netlify.app`

Remove conflicting Squarespace default `A` records and the existing `www` CNAME. After propagation:

1. Confirm `pathira.com` resolves to Netlify.
2. Confirm `www.pathira.com` redirects or serves the same site.
3. Wait for Netlify TLS provisioning.
4. Verify HTTPS, production branding, assets, and privacy policy.
5. Update the Chrome Web Store privacy-policy URL to `https://pathira.com/privacy.html` only after HTTPS works.

## Privacy and safety

- Screenshots may contain sensitive information visible in the browser.
- Users should capture only content they are authorized to document.
- Capture data stays in local extension/browser storage.
- No remote executable code is used.
- No analytics or advertising service receives capture data.
- Chrome-internal pages such as `chrome://` cannot be captured.

## Known product limits

- No backend accounts or cloud synchronization
- No team permissions or server-hosted guide database
- Shared links depend on browser-local data and are not yet true cloud shares
- No automatic sensitive-data redaction
- Store submission has not been performed
- The purchased custom domain still needs DNS cutover

## Recommended next milestones

1. Complete `pathira.com` DNS and TLS.
2. Submit Pathira `1.3.0` to the Chrome Web Store.
3. Add optional screenshot redaction before storage.
4. Move workflows and screenshots from local storage to authenticated cloud storage.
5. Add real share links, workspaces, and team permissions.
6. Add extension update and migration tests for published-store releases.
