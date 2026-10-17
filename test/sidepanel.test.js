import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const manifest=JSON.parse(await readFile(new URL('../extension/manifest.json',import.meta.url)));
const background=await readFile(new URL('../extension/background.js',import.meta.url),'utf8');
const sidepanel=await readFile(new URL('../extension/sidepanel.js',import.meta.url),'utf8').catch(()=> '');
const html=await readFile(new URL('../extension/sidepanel.html',import.meta.url),'utf8').catch(()=> '');

test('extension registers a persistent Chrome side panel',()=>{
  assert.equal(manifest.side_panel.default_path,'sidepanel.html');
  assert.ok(manifest.permissions.includes('sidePanel'));
  assert.equal(manifest.action.default_popup,undefined);
  assert.match(background,/setPanelBehavior/);
});

test('side panel renders live ordered clicks and screenshots',()=>{
  assert.match(html,/id="capture-list"/);
  assert.match(html,/id="toggle-capture"/);
  assert.match(sidepanel,/chrome\.storage\.onChanged/);
  assert.match(sidepanel,/screenshot/);
  assert.match(sidepanel,/sequence/);
});
