import test from 'node:test';
import assert from 'node:assert/strict';
import {createReminderHandler} from '../server/reminders.mjs';
import {createWebhookHandler,webhookTarget,signEvent} from '../server/webhooks.mjs';
const id='11111111-1111-4111-8111-111111111111';
function store(){const values=new Map();return {get:async k=>values.get(k),setJSON:async(k,v)=>values.set(k,v)}}
function clientFor(rows){return {from:table=>{const filters=[];const q={select:()=>q,eq:(key,value)=>{filters.push([key,value]);return q},maybeSingle:async()=>({data:(rows[table]||[]).find(row=>filters.every(([k,v])=>row[k]===v))||null})};return q}}}
const now=Date.parse('2026-10-18T00:00:00Z');
const cfg={PATHIRA_REMINDERS_ENABLED:'true',RESEND_API_KEY:'test',PATHIRA_EMAIL_FROM:'Pathira <test@example.com>'};
const request=(method,body)=>new Request('https://pathira.com/api',{method,body:JSON.stringify(body)});
test('email reminder rejects another assignee and never trusts supplied recipients',async()=>{
 const storage=store();let sent;const client=clientFor({guide_assignments:[{id,assignee_id:id}]});
 const h=createReminderHandler({auth:async()=>({client,user:{id,email:'verified@example.com',email_confirmed_at:'yes'}}),getEnv:k=>cfg[k],storeFor:()=>storage,now:()=>now,send:async(url,options)=>{sent=JSON.parse(options.body);return Response.json({id:'email-receipt'})}});
 const r=await h(request('POST',{assignmentId:id,sendAt:'2026-10-19T00:00:00Z',to:'attacker@example.com'}));assert.equal(r.status,200);assert.deepEqual(sent.to,['verified@example.com']);assert.ok(!sent.text.includes(id));assert.equal((await h(request('POST',{assignmentId:id,sendAt:'2026-10-19T00:00:00Z'}))).status,409);
 const other=createReminderHandler({auth:async()=>({client,user:{id:'different'}}),getEnv:k=>cfg[k],storeFor:()=>storage});assert.equal((await other(request('DELETE',{assignmentId:id}))).status,404);
});
test('unconfigured reminders never call email provider',async()=>{const h=createReminderHandler({auth:async()=>({}),getEnv:()=>undefined,send:()=>{throw Error('must not send')}});assert.equal((await h(request('POST',{}))).status,503)});
test('webhook target rejects insecure, local and credential URLs',()=>{for(const url of ['http://example.com','https://localhost','https://127.0.0.1','https://[::1]','https://user:pass@example.com','https://host.local'])assert.equal(webhookTarget(url),null);assert.equal(webhookTarget('https://hooks.example.com/event'),'https://hooks.example.com/event')});
test('webhook retries with a stable event and remembers acknowledgement',async()=>{
 const storage=store();const values={PATHIRA_WEBHOOK_ENABLED:'true',PATHIRA_WEBHOOK_URL:'https://hooks.example.com/event',PATHIRA_WEBHOOK_SECRET:'s'.repeat(32),PATHIRA_WEBHOOK_WORKSPACE_ID:id};
 const client=clientFor({guides:[{id,workspace_id:id,revision:2,body:{title:'Guide'}}],workspaces:[{id,owner_id:id}]});let calls=0;
 const h=createWebhookHandler({auth:async()=>({client,user:{id}}),getEnv:k=>values[k],storeFor:()=>storage,now:()=>now,send:async(url,options)=>{calls++;assert.equal(options.redirect,'error');assert.equal(options.headers['X-Pathira-Signature'],signEvent(values.PATHIRA_WEBHOOK_SECRET,options.headers['X-Pathira-Timestamp'],options.body));return new Response('',{status:calls===1?503:200})}});
 assert.equal((await h(request('POST',{guideId:id}))).status,200);assert.equal((await h(request('POST',{guideId:id}))).status,200);assert.equal(calls,2);
});
test('webhook refuses a viewer even when guide is readable',async()=>{
 const values={PATHIRA_WEBHOOK_ENABLED:'true',PATHIRA_WEBHOOK_URL:'https://hooks.example.com',PATHIRA_WEBHOOK_SECRET:'s'.repeat(32),PATHIRA_WEBHOOK_WORKSPACE_ID:id};const client=clientFor({guides:[{id,workspace_id:id}],workspaces:[{id,owner_id:'owner'}],workspace_members:[{workspace_id:id,user_id:id,role:'viewer'}]});const h=createWebhookHandler({auth:async()=>({client,user:{id}}),getEnv:k=>values[k],send:()=>{throw Error('must not send')}});assert.equal((await h(request('POST',{guideId:id}))).status,403);
});
