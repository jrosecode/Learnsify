# Capture encryption and keyboard editing

Extension 1.5 encrypts both pending capture records and completed import batches with AES-GCM before writing Chrome local storage. Descriptions, page URLs, and screenshots are encrypted together. Its nonextractable device key is retained in extension IndexedDB so a browser restart can recover captures. Existing plaintext batches are migrated when the worker recovers. The extension panel requests decrypted state from the worker; arbitrary content-script messages cannot request panel state. Import acknowledgements still control deletion.

This is device-profile encryption, not a separately locked vault or E2EE. Deleting the extension's IndexedDB key makes saved captures unrecoverable. Decryption failures stop processing and display an error rather than discarding encrypted records.

Image editing now offers numeric X/Y/width/height selection for keyboard users. Every tool can be applied through these controls. Bounds and load state are checked before applying. Automated axe checks reject serious/critical violations in the workspace, and Chromium exercises keyboard redaction, private previews, local persistence, and encrypted capture recovery. Manual screen-reader and broader accessibility review remain separate work.
