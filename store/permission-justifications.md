# Chrome Web Store permission justifications

## Single purpose
Capture user-initiated browser clicks and screenshots, show them in a persistent side panel, and convert them into ordered instructional steps.

## `sidePanel`
Provides the persistent right-side capture timeline requested by users. It shows click descriptions and screenshots while users switch between tabs.

## `storage`
Stores capture state, click metadata, screenshots, and the most recently completed capture locally so a workflow survives tab changes and can be imported into the guide editor.

## `unlimitedStorage`
Screenshots can exceed Chrome's standard extension-storage quota during longer user-initiated captures. Captures are compressed and limited to 50 steps per session.

## `tabs`
Associates each captured action with the active tab's page title and URL, opens the companion editor on user request, and captures the visible tab after a click.

## `<all_urls>` host access
The extension's single purpose is documenting workflows across the websites the user chooses. Content scripts must observe user clicks and identify accessible labels on those pages. Capture starts only after an explicit user action. Chrome-internal pages remain inaccessible.

## Remote code
None. All executable JavaScript is packaged with the extension. The extension does not download or execute remote code.

## Data handling
Captured screenshots, page URLs, titles, click coordinates, and labels are stored locally. They are not sold or sent to an analytics or advertising service. Data moves to the companion website only when the user explicitly imports a capture, where it remains in that browser's local storage.
