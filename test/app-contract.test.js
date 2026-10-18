import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('editor exposes browser capture start and stop integration', async () => {
  const source=await readFile(new URL('../src/app.js',import.meta.url),'utf8');
  assert.match(source,/PATHIRA_START_CAPTURE/);
  assert.match(source,/PATHIRA_STOP_CAPTURE/);
  assert.match(source,/PATHIRA_CAPTURE_RESULT/);
  assert.match(source,/step-screenshot/);
  assert.match(source,/s\.screenshot/);
});

test('extension captures and compresses the visible tab for each click', async () => {
  const background=await readFile(new URL('../extension/background.js',import.meta.url),'utf8');
  assert.match(background,/captureVisibleTab/);
  assert.match(background,/OffscreenCanvas/);
  assert.match(background,/screenshot/);
});
