import {authenticate,bodyJSON,json,env,UUID} from './auth.mjs';
import {deliveryStore} from './delivery-store.mjs';
import {createHmac,createHash} from 'node:crypto';
import {isIP} from 'node:net';
export function webhookTarget(value){try{const url=new URL(value);if(url.protocol!=='https:'||url.username||url.password||url.port&&url.port!=='443'||isIP(url.hostname.replace(/[\[\]]/g,''))||!url.hostname.includes('.')||/\.(local|localhost|internal)$/.test(url.hostname))return null;return url.href}catch{return null}}
export function signEvent(secret,timestamp,body){return createHmac('sha256',secret).update(timestamp+'.'+body).digest('hex')}
export function createWebhookHandler({auth=authenticate,getEnv=env,storeFor=deliveryStore,send=fetch,now=()=>Date.now()}={}){return async(request,context)=>{
 try{
  if(request.method!=='POST')return json({error:'Method not allowed'},405);
  const {client,user}=await auth(request);const target=webhookTarget(getEnv('PATHIRA_WEBHOOK_URL')),secret=getEnv('PATHIRA_WEBHOOK_SECRET'),workspace=getEnv('PATHIRA_WEBHOOK_WORKSPACE_ID');
  if(getEnv('PATHIRA_WEBHOOK_ENABLED')!=='true'||!target||!secret||secret.length<32||!UUID.test(workspace||''))return json({error:'Integration delivery is not configured'},503);
  const {guideId}=await bodyJSON(request,3000);if(!UUID.test(guideId||''))return json({error:'Invalid guide ID'},400);
  const {data:guide,error}=await client.from('guides').select('id,workspace_id,revision,body').eq('id',guideId).eq('workspace_id',workspace).maybeSingle();
  if(error)throw error;if(!guide)return json({error:'Guide not found'},404);
  const {data:w,error:we}=await client.from('workspaces').select('owner_id').eq('id',workspace).maybeSingle();if(we)throw we;
  if(w?.owner_id!==user.id){const {data:m,error:me}=await client.from('workspace_members').select('role').eq('workspace_id',workspace).eq('user_id',user.id).maybeSingle();if(me)throw me;if(!['editor','admin'].includes(m?.role))return json({error:'Editor access required'},403)}
  const id=createHash('sha256').update(workspace+':'+guide.id+':'+guide.revision).digest('hex');const store=storeFor(context),key='webhook/'+id,receipt=await store.get(key,{type:'json'});
  if(receipt?.delivered)return json({delivered:true,eventId:id,duplicate:true});
  const timestamp=String(Math.floor(now()/1000));const payload=JSON.stringify({id,type:'guide.updated',guide:{id:guide.id,workspaceId:workspace,revision:guide.revision,title:guide.body.title}});
  const headers={'Content-Type':'application/json','X-Pathira-Event':id,'X-Pathira-Timestamp':timestamp,'X-Pathira-Signature':signEvent(secret,timestamp,payload)};
  for(let attempt=0;attempt<3;attempt++){
   try{const result=await send(target,{method:'POST',headers,body:payload,redirect:'error',signal:AbortSignal.timeout(8000)});if(result.ok){await store.setJSON(key,{delivered:true,at:now()});return json({delivered:true,eventId:id})}if(result.status<500&&result.status!==429)break}catch{}
  }
  return json({error:'Integration did not acknowledge delivery. Retry using the same guide revision.',eventId:id},502);
 }catch(e){return json({error:e.status?e.message:'Unable to deliver integration event'},e.status||500)}
}}
