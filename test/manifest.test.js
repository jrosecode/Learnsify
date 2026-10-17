import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('extension manifest is MV3 and captures all normal web tabs', async () => {
  const manifest=JSON.parse(await readFile(new URL('../extension/manifest.json',import.meta.url)));
  assert.equal(manifest.manifest_version,3);
  assert.ok(manifest.host_permissions.includes('<all_urls>'));
  assert.ok(manifest.content_scripts[0].matches.includes('<all_urls>'));
  assert.ok(manifest.permissions.includes('storage'));
  assert.ok(manifest.permissions.includes('unlimitedStorage'));
});
