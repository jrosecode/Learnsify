import {duplicateClick} from '../extension/lib/duplicates.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
import {webcrypto} from 'node:crypto';
import {captureToStep,orderCaptures} from '../extension/lib/capture.js';
const source=(await readFile(new URL('../extension/background.js',import.meta.url),'utf8')).replace(/^import .*;\n/gm,'');
function harness(seed={}){
 let data=structuredClone(seed),listener,failures=0,failureMessage='Screenshot unavailable',attempts=0,cleanups=0,navigateOnFailure=false;
 const tab={id:1,windowId:1,url:'https://example.com',title:'Example'};
 const chrome={storage:{local:{get:async()=>structuredClone(data),set:async patch=>{Object.assign(data,structuredClone(patch))},getBytesInUse:async()=>0}},action:{setBadgeBackgroundColor:async()=>{},setBadgeText:async()=>{}},sidePanel:{setPanelBehavior:async()=>{}},tabs:{sendMessage:async(id,m)=>{if(m.type==='CLEAR_PRIVACY_MASKS')cleanups++;return {ok:true}},query:async()=>[{...tab}],get:async()=>({...tab}),captureVisibleTab:async()=>{attempts++;if(failures-->0){if(navigateOnFailure)tab.url='https://example.com/next';throw Error(failureMessage)}return 'data:image/jpeg;base64,AA=='}},runtime:{onMessage:{addListener:fn=>listener=fn}}};
 vm.runInNewContext(source,{URL,chrome,duplicateClick,createPrivateStorage:raw=>({get:()=>raw.get(null),set:patch=>raw.set(patch)}),crypto:webcrypto,captureToStep,orderCaptures,setTimeout:fn=>setTimeout(fn,0),fetch:async()=>({blob:async()=>new Blob(['image'])}),createImageBitmap:async()=>({width:800,height:600,close(){}}),OffscreenCanvas:class{getContext(){return {drawImage(){}}}async convertToBlob(){return new Blob(['image'])}},Uint8Array,btoa});
 return {send:(type,extra={})=>new Promise(resolve=>listener({type,...extra},{tab:{...tab}},r=>resolve(structuredClone(r)))),data:()=>structuredClone(data),fail:(count=1,message='Screenshot unavailable',navigate=false)=>{failures=count;failureMessage=message;navigateOnFailure=navigate},attempts:()=>attempts,cleanups:()=>cleanups};
}
test('failed screenshot preserves event and later screenshots still complete',async()=>{
 const h=harness();await h.send('START_CAPTURE');h.fail();
 await h.send('CAPTURE_CLICK',{capture:{description:'First'}});await h.send('CAPTURE_CLICK',{capture:{description:'Second'}});
 const result=await h.send('STOP_CAPTURE');assert.equal(result.steps.length,2);assert.match(result.steps[0].captureWarning,/unavailable/);assert.ok(result.steps[1].screenshot);
});
test('recovery pauses an interrupted recording and preserves pending event',async()=>{
 const h=harness({active:true,sessionId:'s',captures:[{id:'1',sequence:1,imageStatus:'pending'}]});
 await h.send('GET_STATUS');assert.equal(h.data().paused,true);assert.equal(h.data().captures[0].imageStatus,'failed');
 await h.send('CAPTURE_CLICK');assert.equal(h.data().captures.length,1);
 await h.send('RESUME_CAPTURE');await h.send('MANUAL_CAPTURE');assert.equal((await h.send('STOP_CAPTURE')).steps.length,2);
});
test('pending imports require a matching acknowledgement and block overwrite',async()=>{
 const h=harness();await h.send('START_CAPTURE');await h.send('MANUAL_CAPTURE');const result=await h.send('STOP_CAPTURE');
 assert.equal((await h.send('STOP_CAPTURE')).steps.length,1);
 assert.equal((await h.send('GET_PENDING')).steps.length,1);assert.equal((await h.send('GET_PENDING')).steps.length,1);
 assert.equal((await h.send('START_CAPTURE')).ok,false);
 await h.send('ACK_IMPORT',{batchId:'other'});assert.equal((await h.send('GET_PENDING')).steps.length,1);
 await h.send('ACK_IMPORT',{batchId:result.batchId});assert.equal((await h.send('GET_PENDING')).steps.length,0);
});
test('capture limit pauses visibly without deleting saved events',async()=>{
 const h=harness({active:true,captures:Array.from({length:50},(_,i)=>({id:String(i),sequence:i+1}))});
 await h.send('RESUME_CAPTURE');assert.equal((await h.send('CAPTURE_CLICK')).ok,false);assert.equal(h.data().captures.length,50);assert.equal(h.data().paused,true);assert.match(h.data().error,/50-step/);
});

test('Chrome readback failures retry automatically with masking cleanup',async()=>{
 const h=harness();await h.send('START_CAPTURE');h.fail(2,'Failed to capture tab: image readback failed');
 await h.send('MANUAL_CAPTURE');const result=await h.send('STOP_CAPTURE');
 assert.equal(h.attempts(),3);assert.equal(h.cleanups(),3);assert.ok(result.steps[0].screenshot);assert.equal(result.steps[0].captureWarning,null);
});
test('exhausted readback retries preserve the step and actionable warning',async()=>{
 const h=harness();await h.send('START_CAPTURE');h.fail(3,'Failed to capture tab: image readback failed');
 await h.send('MANUAL_CAPTURE');const result=await h.send('STOP_CAPTURE');
 assert.equal(h.attempts(),3);assert.equal(result.steps.length,1);assert.match(result.steps[0].captureWarning,/after 3 attempts/);assert.equal(result.steps[0].screenshot,null);
});

test('retry stops if the page navigates after the first failed capture',async()=>{
 const h=harness();await h.send('START_CAPTURE');h.fail(1,'Failed to capture tab: image readback failed',true);
 await h.send('MANUAL_CAPTURE');const result=await h.send('STOP_CAPTURE');
 assert.equal(h.attempts(),1);assert.equal(h.cleanups(),1);assert.equal(result.steps[0].screenshot,null);assert.match(result.steps[0].captureWarning,/Page changed/);
});
