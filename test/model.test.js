import test from 'node:test';
import assert from 'node:assert/strict';
import { createWorkflow, filterWorkflows, moveStep, progressPercent } from '../src/model.js';

test('createWorkflow produces an editable draft with one starter step', () => {
  const item = createWorkflow('Vendor onboarding', 'Operations');
  assert.equal(item.title, 'Vendor onboarding');
  assert.equal(item.status, 'Draft');
  assert.equal(item.steps.length, 1);
});

test('filterWorkflows matches search and category', () => {
  const rows = [{title:'Close the books',category:'Finance',status:'Published'}, {title:'Welcome a teammate',category:'People',status:'Draft'}];
  assert.deepEqual(filterWorkflows(rows, 'books', 'Finance', 'All').map(x => x.title), ['Close the books']);
});

test('moveStep reorders without mutating the original', () => {
  const steps = [{id:1},{id:2},{id:3}];
  assert.deepEqual(moveStep(steps, 0, 1).map(x => x.id), [2,1,3]);
  assert.deepEqual(steps.map(x => x.id), [1,2,3]);
});

test('progressPercent handles normal and empty guides', () => {
  assert.equal(progressPercent(1, 4), 50);
  assert.equal(progressPercent(0, 0), 0);
});
