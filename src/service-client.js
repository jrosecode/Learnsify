import {supabase} from './cloud.js';
export async function service(name,body,method='POST'){
 const {data:{session}}=await supabase.auth.getSession();if(!session)throw Error('Sign in again to continue');
 const response=await fetch('/.netlify/functions/'+name,{method,headers:{Authorization:'Bearer '+session.access_token,'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined});
 if(!response.ok){const result=await response.json().catch(()=>({}));throw Error(result.error||'Service unavailable')}
 return response;
}
export async function translateDraft(draft,language){
 const response=await service('translate',{draft,language});const reader=response.body.getReader(),decoder=new TextDecoder();let buffer='',result;
 function consume(line){if(!line.trim())return;const event=JSON.parse(line);if(event.type==='error')throw Error(event.error);if(event.type==='result')result=event.draft;}
 for(;;){const {value,done}=await reader.read();buffer+=decoder.decode(value||new Uint8Array(),{stream:!done});const lines=buffer.split('\n');buffer=lines.pop();for(const line of lines)consume(line);if(done)break}
 consume(buffer);if(!result)throw Error('No translation returned');return result;
}
