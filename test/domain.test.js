import test from 'node:test';
import assert from 'node:assert/strict';
import {safeImage,safeURL,normalize,history,mergeSteps} from '../src/domain.js';
test('imports cannot inject markup through image or source URLs',()=>{assert.equal(safeImage('data:image/png;base64,AA==" onerror="alert(1)'), '');assert.equal(safeImage('data:image/svg+xml;base64,AAA='),'');assert.equal(safeURL('javascript:alert(1)'),'');assert.equal(safeImage('data:image/png;base64,AA=='),'data:image/png;base64,AA==')});
test('normalization rejects duplicate steps',()=>assert.throws(()=>normalize({title:'Guide',steps:[{id:'same'},{id:'same'}]},'workspace'),/Duplicate/));
test('undo redo isolates snapshots and invalidates redo on new edits',()=>{const h=history({title:'A'});h.record({title:'B'});const a=h.undo();a.title='mutated';assert.equal(h.redo().title,'B');h.undo();h.record({title:'C'});assert.equal(h.redo(),null)});
test('merge retains all selected instructions',()=>{const steps=[{id:'1',title:'First',description:'one'},{id:'2',title:'Second',description:'two'},{id:'3',title:'Last'}];const result=mergeSteps(steps,new Set(['1','2']));assert.equal(result.length,2);assert.match(result[0].description,/one[\s\S]*two/);assert.equal(steps.length,3)});
