let keyPromise;
function deviceKey(){return keyPromise||=(async()=>{
 const db=await new Promise((resolve,reject)=>{const request=indexedDB.open('pathira-extension-keys',1);request.onupgradeneeded=()=>request.result.createObjectStore('keys');request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error)});
 const existing=await new Promise((resolve,reject)=>{const r=db.transaction('keys').objectStore('keys').get('capture');r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)});
 if(existing){db.close();return existing}
 const key=await crypto.subtle.generateKey({name:'AES-GCM',length:256},false,['encrypt','decrypt']);
 await new Promise((resolve,reject)=>{const tx=db.transaction('keys','readwrite');tx.objectStore('keys').put(key,'capture');tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error)});db.close();return key;
})()}
function encode(bytes){let text='';for(let offset=0;offset<bytes.length;offset+=32768)text+=String.fromCharCode(...bytes.subarray(offset,offset+32768));return btoa(text)}
const decode=text=>Uint8Array.from(atob(text),c=>c.charCodeAt(0));
export function createPrivateStorage(raw,keyProvider=deviceKey){return {
 async get(){const data=await raw.get(null);for(const field of ['captures','lastCompletedSteps']){const value=data[field];if(value?.encrypted){try{const plain=await crypto.subtle.decrypt({name:'AES-GCM',iv:decode(value.iv)},await keyProvider(),decode(value.data));data[field]=JSON.parse(new TextDecoder().decode(plain))}catch{throw Error('Saved capture could not be decrypted. Do not clear browser data; restore the original browser profile.')}}}return data},
 async set(patch){const encrypted={...patch};for(const field of ['captures','lastCompletedSteps'])if(Array.isArray(patch[field])){const iv=crypto.getRandomValues(new Uint8Array(12));const bytes=await crypto.subtle.encrypt({name:'AES-GCM',iv},await keyProvider(),new TextEncoder().encode(JSON.stringify(patch[field])));encrypted[field]={encrypted:true,iv:encode(iv),data:encode(new Uint8Array(bytes))}}await raw.set(encrypted)}
}}
