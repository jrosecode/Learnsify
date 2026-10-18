import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, stat } from 'node:fs/promises';

const manifest=JSON.parse(await readFile(new URL('../extension/manifest.json',import.meta.url)));

test('Chrome Store package has required icons and version metadata',async()=>{
  assert.match(manifest.version,/^\d+\.\d+\.\d+$/);
  for(const size of [16,32,48,128]){
    assert.equal(manifest.icons[String(size)],`icons/icon-${size}.png`);
    assert.ok((await stat(new URL(`../extension/icons/icon-${size}.png`,import.meta.url))).size>100);
  }
});

test('privacy policy discloses screenshot, URL, storage, and deletion behavior',async()=>{
  const policy=await readFile(new URL('../src/privacy.html',import.meta.url),'utf8');
  for(const phrase of ['screenshots','page URLs','stored locally','delete','not sold'])assert.match(policy,new RegExp(phrase,'i'));
});

test('store listing and permission justifications are prepared',async()=>{
  const listing=await readFile(new URL('../store/listing.md',import.meta.url),'utf8');
  const permissions=await readFile(new URL('../store/permission-justifications.md',import.meta.url),'utf8');
  assert.match(listing,/Pathira/);
  assert.doesNotMatch(listing,/\[FINAL NAME\]/);
  for(const permission of ['sidePanel','storage','unlimitedStorage','tabs','<all_urls>'])assert.match(permissions,new RegExp(permission.replace(/[<>]/g,'\\$&')));
});

test('Pathira is the official website and extension brand',async()=>{
  const website=await readFile(new URL('../src/index.html',import.meta.url),'utf8');
  const panel=await readFile(new URL('../extension/sidepanel.html',import.meta.url),'utf8');
  const bridge=await readFile(new URL('../extension/content.js',import.meta.url),'utf8');
  assert.equal(manifest.name,'Pathira');
  assert.match(website,/Pathira —/);
  assert.match(panel,/>Pathira</);
  assert.match(bridge,/pathira\.com/);
});

test('Pathira website ships the supplied favicon assets',async()=>{
  const website=await readFile(new URL('../src/index.html',import.meta.url),'utf8');
  assert.match(website,/rel="icon"[^>]+favicon-32\.png/);
  assert.match(website,/rel="apple-touch-icon"[^>]+apple-touch-icon\.png/);
  for(const file of ['favicon-16.png','favicon-32.png','apple-touch-icon.png']){
    assert.ok((await stat(new URL(`../src/assets/${file}`,import.meta.url))).size>100);
  }
});
