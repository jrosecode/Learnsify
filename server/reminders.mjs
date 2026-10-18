import {authenticate,bodyJSON,json,env,UUID} from './auth.mjs';
import {deliveryStore} from './delivery-store.mjs';
import {createHash} from 'node:crypto';
export function createReminderHandler({auth=authenticate,getEnv=env,storeFor=deliveryStore,send=fetch,now=()=>Date.now()}={}){return async(request,context)=>{
 try{
  if(!['GET','POST','DELETE'].includes(request.method))return json({error:'Method not allowed'},405);
  const {client,user}=await auth(request);
  if(getEnv('PATHIRA_REMINDERS_ENABLED')!=='true'||!getEnv('RESEND_API_KEY')||!getEnv('PATHIRA_EMAIL_FROM'))return json({error:'Email reminders are not configured. Calendar reminders are available.'},503);
  const body=request.method==='GET'?{assignmentId:new URL(request.url).searchParams.get('id')}:await bodyJSON(request,3000);
  if(!UUID.test(body.assignmentId||''))return json({error:'Invalid assignment'},400);
  const {data:assignment,error}=await client.from('guide_assignments').select('*').eq('id',body.assignmentId).eq('assignee_id',user.id).maybeSingle();
  if(error)throw error;if(!assignment)return json({error:'Assignment not found'},404);
  const store=storeFor(context),key='reminder/'+user.id+'/'+assignment.id;const existing=await store.get(key,{type:'json'});
  if(request.method==='GET')return json({reminder:existing?{sendAt:existing.sendAt,status:existing.status}:null});
  const headers={Authorization:'Bearer '+getEnv('RESEND_API_KEY'),'Content-Type':'application/json'};
  if(request.method==='DELETE'){
   if(existing?.status==='scheduled'){
    const response=await send('https://api.resend.com/emails/'+encodeURIComponent(existing.id)+'/cancel',{method:'POST',headers,signal:AbortSignal.timeout(15000)});
    if(!response.ok)return json({error:'Provider could not cancel this reminder. It may already have been sent.'},409);
    await store.setJSON(key,{...existing,status:'cancelled'});
   }
   return json({cancelled:true});
  }
  if(!user.email||!user.email_confirmed_at)return json({error:'Verify your email before scheduling a reminder'},403);
  if(assignment.completed_at)return json({error:'Assignment is already complete'},409);
  const sendAt=new Date(body.sendAt);if(!Number.isFinite(+sendAt)||+sendAt<now()+60000||+sendAt>now()+30*86400000)return json({error:'Choose a time between one minute and 30 days from now'},400);
  if(existing?.status==='scheduled')return json({error:'Cancel the existing reminder before scheduling another'},409);
  const payload={from:getEnv('PATHIRA_EMAIL_FROM'),to:[user.email],subject:'Your Pathira learning reminder',text:'This is the assignment reminder you scheduled in Pathira. Open https://pathira.com/ and visit Learning to review your assignments. If already complete, you can ignore this message.',scheduled_at:sendAt.toISOString()};
  const digest=createHash('sha256').update(JSON.stringify({assignment:assignment.id,...payload})).digest('hex');
  const response=await send('https://api.resend.com/emails',{method:'POST',headers:{...headers,'Idempotency-Key':digest},body:JSON.stringify(payload),signal:AbortSignal.timeout(15000)});
  if(!response.ok)return json({error:'Email provider rejected the schedule. Try again later.'},502);
  const result=await response.json();if(typeof result.id!=='string')throw Error('Missing provider receipt');
  await store.setJSON(key,{id:result.id,sendAt:sendAt.toISOString(),status:'scheduled'});
  return json({scheduled:true,sendAt:sendAt.toISOString()});
 }catch(e){return json({error:e.status?e.message:'Unable to manage reminder'},e.status||500)}
}}
