const encoder=new TextEncoder(),decoder=new TextDecoder();
let database,key,userId;
function request(req){return new Promise((resolve,reject)=>{req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error)})}
async function db(){if(!database)database=await new Promise((resolve,reject)=>{const r=indexedDB.open('pathira-vault-v2',1);r.onupgradeneeded=()=>{r.result.createObjectStore('records');r.result.createObjectStore('keys')};r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)});return database}
async function get(store,id){return request((await db()).transaction(store).objectStore(store).get(id))}
async function put(store,id,value){const d=await db();return new Promise((resolve,reject)=>{const tx=d.transaction(store,'readwrite');tx.objectStore(store).put(value,id);tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error)})}
async function derive(pass,salt){const material=await crypto.subtle.importKey('raw',encoder.encode(pass),'PBKDF2',false,['deriveKey']);return crypto.subtle.deriveKey({name:'PBKDF2',hash:'SHA-256',salt,iterations:310000},material,{name:'AES-GCM',length:256},false,['encrypt','decrypt'])}
async function encrypt(value,k=key){const iv=crypto.getRandomValues(new Uint8Array(12));const bytes=await crypto.subtle.encrypt({name:'AES-GCM',iv},k,encoder.encode(JSON.stringify(value)));return {iv,bytes}}
async function decrypt(value,k=key){return JSON.parse(decoder.decode(await crypto.subtle.decrypt({name:'AES-GCM',iv:value.iv},k,value.bytes)))}
export async function openVault(uid,passphrase){userId=uid;const config=await get('keys',uid);
 if(config?.salt){if(!passphrase)throw Error('VAULT_LOCKED');key=await derive(passphrase,config.salt);try{await decrypt(config.check)}catch{key=null;throw Error('Incorrect vault passphrase')}}
 else{key=config?.key||await crypto.subtle.generateKey({name:'AES-GCM',length:256},false,['encrypt','decrypt']);if(!config)await put('keys',uid,{key})}
 return !!config?.salt;
}
export async function readVault(){const r=await get('records',userId);return r?decrypt(r):{guides:[],workspaceId:null,cloudSync:false}}
export async function writeVault(data){if(!key)throw Error('Vault locked');await put('records',userId,await encrypt(data))}
export async function protectVault(passphrase){if(passphrase.length<12)throw Error('Use at least 12 characters for your vault passphrase.');const data=await readVault(),salt=crypto.getRandomValues(new Uint8Array(16)),newKey=await derive(passphrase,salt),record=await encrypt(data,newKey),check=await encrypt({valid:true},newKey);const d=await db();await new Promise((resolve,reject)=>{const tx=d.transaction(['keys','records'],'readwrite');tx.objectStore('keys').put({salt,check},userId);tx.objectStore('records').put(record,userId);tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error)});key=newKey;}
export async function clearVault(){const d=await db();await new Promise((resolve,reject)=>{const tx=d.transaction(['records','keys'],'readwrite');tx.objectStore('records').delete(userId);tx.objectStore('keys').delete(userId);tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error)});key=null;}
