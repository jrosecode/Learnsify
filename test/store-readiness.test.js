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
  assert.match(listing,/\[FINAL NAME\]/);
  for(const permission of ['sidePanel','storage','unlimitedStorage','tabs','<all_urls>'])assert.match(permissions,new RegExp(permission.replace(/[<>]/g,'\\$&')));
});
