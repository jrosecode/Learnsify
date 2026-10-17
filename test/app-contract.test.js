import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('editor exposes browser capture start and stop integration', async () => {
  const source=await readFile(new URL('../src/app.js',import.meta.url),'utf8');
  assert.match(source,/LEARNSIFY_START_CAPTURE/);
  assert.match(source,/LEARNSIFY_STOP_CAPTURE/);
  assert.match(source,/LEARNSIFY_CAPTURE_RESULT/);
});
