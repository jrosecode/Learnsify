# Pathira

An original workflow-learning MVP inspired by publicly documented patterns in process-capture products. Create, edit, share, and play interactive step-by-step guides; track lightweight local analytics.

## Run

```bash
npm test
npm run build
python3 -m http.server 4173 -d dist
```

Data persists in the browser with localStorage. The web dashboard has no backend authentication; cross-tab capture is provided by the included browser extension.

## Capture clicks across browser tabs

Pathira includes a Chrome/Edge Manifest V3 extension in `extension/`.

1. Open `chrome://extensions` (or `edge://extensions`).
2. Enable **Developer mode**.
3. Click **Load unpacked** and select this repository's `extension` folder.
4. Refresh `https://pathira.com`.
5. Click the Pathira extension icon to open its persistent right-side panel, or open a guide and choose **Capture browser**.
6. Start capture. The panel remains open as you switch tabs and shows every click, description, and screenshot live.
7. Choose **Stop and import**, then open Pathira to add the ordered steps to your guide.

Each click is saved in order with a compressed screenshot, page title, URL, element type, accessible label/text, click coordinates, and an on-screen highlight around the clicked element. Captures are capped at 50 steps per session to keep browser storage responsive. Browser-internal pages such as `chrome://` cannot be captured because Chrome blocks extensions on those pages.
