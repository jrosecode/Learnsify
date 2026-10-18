import test from 'node:test';
import assert from 'node:assert/strict';
import {retrySync} from '../src/sync-retry.js';
import {duplicateClick} from '../extension/lib/duplicates.js';
test('retry transient failures but never retry revision conflicts',async()=>{
 let calls=0;const waits=[];assert.equal(await retrySync(async()=>{if(++calls<3)throw Object.assign(Error('Unavailable'),{status:503});return 4},{sleep:async ms=>waits.push(ms)}),4);assert.deepEqual(waits,[1000,2000]);
 calls=0;await assert.rejects(retrySync(async()=>{calls++;throw Error('REVISION_CONFLICT')},{sleep:async()=>{}}));assert.equal(calls,1);
});
test('filter only repeated nearby clicks on the same tab',()=>{
 const previous={description:'Save',x:20,y:30,tabId:1,url:'https://example.com',capturedAt:1000};const tab={id:1,url:previous.url};
 assert.equal(duplicateClick(previous,{description:'Save',x:21,y:30},tab,1200),true);
 assert.equal(duplicateClick(previous,{description:'Save',x:21,y:30},tab,1400),false);
 assert.equal(duplicateClick(previous,{description:'Save',x:40,y:30},tab,1200),false);
 assert.equal(duplicateClick({...previous,manual:true},{description:'Save',x:20,y:30},tab,1200),false);
});
import {guideImage} from '../src/guide-image.js';
test('portable images preserve valid highlights but reject injected styles',()=>{
 const step={screenshot:'data:image/png;base64,AA==',title:'<example>',click:{width:100,height:100,rect:{x:10,y:20,w:30,h:40,color:'red;display:none'}}};
 const result=guideImage(step);assert.match(result,/left:10%/);assert.match(result,/&lt;example&gt;/);assert.ok(!result.includes('red;display'));assert.match(result,/#ff654d/);
 step.click.rect.w=1000;assert.ok(!guideImage(step).includes('click-highlight'));
});
