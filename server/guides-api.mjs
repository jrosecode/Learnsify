import {authenticate,bodyJSON,json,UUID} from './auth.mjs';
export function createGuidesHandler(auth=authenticate){return async request=>{
 try{
  if(!['GET','PUT'].includes(request.method))return json({error:'Method not allowed'},405);
  const {client}=await auth(request);const url=new URL(request.url),id=url.searchParams.get('id');
  if(id&&!UUID.test(id))return json({error:'Invalid guide ID'},400);
  if(request.method==='PUT'){
   const {document,expected_revision}=await bodyJSON(request);
   if(!document||!UUID.test(document.id)||!UUID.test(document.workspaceId)||!Number.isInteger(expected_revision)||expected_revision<0||!Array.isArray(document.steps))return json({error:'Guide and expected_revision are required'},400);
   const {data,error}=await client.rpc('save_guide',{document,expected_revision});
   if(error)return json({error:error.message},/REVISION_CONFLICT|deleted/.test(error.message)?409:400);
   return json({id:document.id,revision:data});
  }
  if(id){
   const {data:guide,error}=await client.from('guides').select('*').eq('id',id).maybeSingle();
   if(error)throw error;if(!guide)return json({error:'Guide not found'},404);
   const {data:steps,error:stepError}=await client.from('guide_steps').select('body,position').eq('guide_id',id).order('position').range(0,999);
   if(stepError)throw stepError;
   return json({guide:{...guide.body,id:guide.id,workspaceId:guide.workspace_id,revision:guide.revision,steps:steps.map(s=>s.body)}});
  }
  const offset=Number(url.searchParams.get('offset')||0);
  if(!Number.isSafeInteger(offset)||offset<0)return json({error:'Invalid offset'},400);
  const {data,error}=await client.from('guides').select('id,workspace_id,revision,body,updated_at').order('id').range(offset,offset+99);
  if(error)throw error;
  return json({guides:data.map(g=>({id:g.id,workspaceId:g.workspace_id,title:g.body.title,revision:g.revision,updatedAt:g.updated_at})),nextOffset:data.length===100?offset+100:null});
 }catch(e){return json({error:e.status?e.message:'Unable to complete request'},e.status||500)}
}}
