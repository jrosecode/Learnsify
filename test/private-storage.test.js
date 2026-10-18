import test from 'node:test';
import assert from 'node:assert/strict';
import {createPrivateStorage} from '../extension/lib/private-storage.js';
test('capture storage encrypts screenshot and text, survives a new wrapper, and rejects tampering',async()=>{
 let raw={};const adapter={get:async()=>structuredClone(raw),set:async patch=>Object.assign(raw,structuredClone(patch))};
 const key=await crypto.subtle.generateKey({name:'AES-GCM',length:256},false,['encrypt','decrypt']);const storage=createPrivateStorage(adapter,async()=>key);
 const captures=[{description:'private text',screenshot:'data:image/png;base64,private'}];await storage.set({captures,active:true});assert.equal(raw.captures.encrypted,true);assert.ok(!JSON.stringify(raw).includes('private text'));assert.ok(!JSON.stringify(raw).includes('data:image'));assert.deepEqual((await createPrivateStorage(adapter,async()=>key).get()).captures,captures);
 raw.captures.data='AAAA';await assert.rejects(storage.get(),/could not be decrypted/);
});
test('legacy plaintext captures remain readable and are encrypted on rewrite',async()=>{let raw={captures:[{id:'legacy'}]};const adapter={get:async()=>structuredClone(raw),set:async patch=>Object.assign(raw,patch)};const key=await crypto.subtle.generateKey({name:'AES-GCM',length:256},false,['encrypt','decrypt']);const s=createPrivateStorage(adapter,async()=>key);await s.set(await s.get());assert.equal(raw.captures.encrypted,true);assert.equal((await s.get()).captures[0].id,'legacy')});
