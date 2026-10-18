import test from 'node:test';
import assert from 'node:assert/strict';
import {forkGuide,isRevisionConflict} from '../src/conflicts.js';
test('conflict copy is independent and never reuses cloud media paths',()=>{
 const source={id:'old',title:'Guide',revision:7,sourceId:'legacy',batches:['batch'],steps:[{id:'s',screenshot:'data:image/png;base64,AA==',screenshotPath:'old/media',branches:[{target:'s'}]}]};
 const copy=forkGuide(source,'new');
 assert.equal(copy.id,'new');assert.equal(copy.revision,0);assert.equal(copy.dirty,true);assert.equal(copy.steps[0].screenshotPath,undefined);assert.equal(copy.sourceId,undefined);assert.deepEqual(copy.batches,[]);assert.equal(source.steps[0].screenshotPath,'old/media');assert.equal(copy.steps[0].branches[0].target,'s');
});
test('copy refuses to silently lose unavailable media',()=>assert.throws(()=>forkGuide({title:'Guide',steps:[{audioPath:'private/audio'}]},'new'),/Download/));
test('only revision and deleted-guide errors open conflict resolution',()=>{
 assert.ok(isRevisionConflict(Error('REVISION_CONFLICT: changed')));assert.ok(isRevisionConflict(Error('Guide was deleted. Save a new copy.')));assert.equal(isRevisionConflict(Error('Network unavailable')),false);
});
