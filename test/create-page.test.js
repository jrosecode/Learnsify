import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, stat } from 'node:fs/promises';

const app=await readFile(new URL('../src/app.js',import.meta.url),'utf8');
const create=await readFile(new URL('../src/create.html',import.meta.url),'utf8').catch(()=> '');
const createJs=await readFile(new URL('../src/create.js',import.meta.url),'utf8').catch(()=> '');

test('Create guide opens a dedicated onboarding page',()=>{
  assert.match(app,/href="create\.html"/);
  assert.match(create,/<title>Create a guide — Pathira<\/title>/);
  assert.equal((create.match(/class="instruction-step"/g)||[]).length,4);
  assert.match(create,/id="create-guide-form"/);
  assert.match(createJs,/URLSearchParams/);
  assert.match(createJs,/location\.href='index\.html\?'/);
});

test('Pathira logo replaces the letter badge in the application shell',async()=>{
  assert.match(app,/class="brand-logo"/);
  assert.doesNotMatch(app,/<span class="mark">P<\/span>/);
  assert.ok((await stat(new URL('../src/assets/pathira-favicon-source.jpg',import.meta.url))).size>100);
});

test('navigation, analytics, team invite, and mobile menu have handlers',()=>{
  for(const id of ['nav-guides','nav-analytics','nav-team','invite','mobile-menu'])assert.match(app,new RegExp(`id="${id}"`));
  assert.match(app,/showAnalytics/);
  assert.match(app,/showInvite/);
  assert.match(app,/toggleMobileMenu/);
});
