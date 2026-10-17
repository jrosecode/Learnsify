import test from 'node:test';
import assert from 'node:assert/strict';
import { describeElement, captureToStep, orderCaptures } from '../extension/lib/capture.js';

test('describeElement prioritizes accessible labels', () => {
  assert.equal(describeElement({ariaLabel:'Save invoice',text:'Save',tag:'button'}), '“Save invoice” button');
});

test('describeElement falls back to useful text and element type', () => {
  assert.equal(describeElement({text:'Quarterly report',tag:'a'}), '“Quarterly report” link');
  assert.equal(describeElement({placeholder:'Search customers',tag:'input'}), '“Search customers” field');
});

test('captureToStep includes action, page, and URL', () => {
  const step=captureToStep({sequence:2,description:'“Submit” button',pageTitle:'Checkout',url:'https://example.com/pay',screenshot:'data:image/jpeg;base64,abc'});
  assert.equal(step.title,'Click “Submit” button');
  assert.match(step.description,/Checkout/);
  assert.equal(step.url,'https://example.com/pay');
  assert.equal(step.screenshot,'data:image/jpeg;base64,abc');
});

test('orderCaptures preserves click sequence across tabs', () => {
  const rows=[{sequence:3},{sequence:1},{sequence:2}];
  assert.deepEqual(orderCaptures(rows).map(x=>x.sequence),[1,2,3]);
  assert.deepEqual(rows.map(x=>x.sequence),[3,1,2]);
});
