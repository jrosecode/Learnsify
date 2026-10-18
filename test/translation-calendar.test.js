import test from 'node:test';
import assert from 'node:assert/strict';
import {createTranslationHandler,validateTranslation} from '../server/translation.mjs';
import {assignmentCalendar} from '../src/calendar.js';
const draft={title:'Guide',steps:[{id:'s',title:'Start',description:'Click {{name}}',alt:'Picture'}]};
test('translation requires explicit provider enablement',async()=>{let called=false;const h=createTranslationHandler({auth:async()=>({}),getEnv:()=>undefined,provider:()=>{called=true}});assert.equal((await h(new Request('https://example.com',{method:'POST',body:'{}'}))).status,503);assert.equal(called,false)});
test('translation rejects changed step identity and never returns media',()=>{assert.throws(()=>validateTranslation({...draft,steps:[{...draft.steps[0],id:'changed'}]},draft),/IDs/);assert.equal(validateTranslation({...draft,screenshot:'private'},draft).screenshot,undefined)});
test('translation streams a validated draft without changing the source',async()=>{
 const provider=()=>({messages:{stream:()=>({async *[Symbol.asyncIterator](){yield {type:'content_block_delta'}},async finalMessage(){return {stop_reason:'end_turn',content:[{type:'text',text:JSON.stringify({...draft,title:'Guía'})}]}},abort(){}})}});
 const h=createTranslationHandler({auth:async()=>({}),getEnv:n=>n==='PATHIRA_AI_ENABLED'?'true':'configured',provider});const r=await h(new Request('https://example.com',{method:'POST',body:JSON.stringify({draft,language:'Spanish'})}));assert.match(await r.text(),/Guía/);assert.equal(draft.title,'Guide');
});
test('calendar escapes injected properties and folds UTF-8 safely',()=>{
 const out=assignmentCalendar({id:'a',due_at:'2026-11-01'},'Task\nATTENDEE:evil@example.com '+ 'é'.repeat(60));assert.ok(out.includes('DTEND;VALUE=DATE:20261102'));assert.ok(!out.includes('\r\nATTENDEE'));assert.ok(out.split('\r\n').every(line=>new TextEncoder().encode(line).length<=75));assert.throws(()=>assignmentCalendar({due_at:'2026-02-31'},'Task'),/Invalid/);
});
