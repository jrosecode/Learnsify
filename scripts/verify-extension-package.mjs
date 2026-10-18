import {readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {unzipSync,strFromU8} from 'fflate';
const files=unzipSync(await readFile('dist/downloads/pathira-extension.zip'));
const manifest=JSON.parse(strFromU8(files['manifest.json']));
assert.equal(manifest.version,JSON.parse(await readFile('extension/manifest.json','utf8')).version);
for(const name of ['background.js','content.js','sidepanel.html','sidepanel.js','lib/private-storage.js'])assert.ok(files[name],name);
console.log('PASS downloadable extension matches source version '+manifest.version);
