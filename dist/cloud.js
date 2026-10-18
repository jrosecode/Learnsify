import {loginURL} from './navigation.js';
import {createClient} from './vendor/supabase.js';
export const supabase=createClient('https://pdrnypffiglgealwgcdw.supabase.co','sb_publishable_sNKPkbT2NlL368KKapPBFg_wtDApyAF');
export async function requireUser(){
 const {data:{session},error}=await supabase.auth.getSession();
 if(error||!session){location.replace(loginURL(location));throw new Error('Please sign in');}
 supabase.auth.onAuthStateChange(event=>{if(event==='SIGNED_OUT')location.replace(loginURL(location))});
 return session.user;
}
export async function loadLibrary(user){
 const {data,error}=await supabase.from('workflow_libraries').select('workflows').eq('user_id',user.id).maybeSingle();
 if(error)throw error;
 return data?.workflows??[];
}
let queue=Promise.resolve();
export function saveLibrary(user,workflows){
 const snapshot=JSON.parse(JSON.stringify(workflows));
 queue=queue.catch(()=>{}).then(async()=>{const {error}=await supabase.from('workflow_libraries').upsert({user_id:user.id,workflows:snapshot,updated_at:new Date().toISOString()});if(error)throw error;});
 return queue;
}
