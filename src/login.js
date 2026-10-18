import {safeReturnPath} from './navigation.js';
import {supabase} from './cloud.js';
const form=document.querySelector('#auth'),email=document.querySelector('#email'),password=document.querySelector('#password'),message=document.querySelector('#message'),submit=document.querySelector('#submit');
let mode='login';
function recovery(){mode='recovery';document.querySelector('#heading').textContent='Choose a new password';submit.textContent='Update password';email.required=false;email.closest('label').hidden=true;}
if(location.hash.includes('type=recovery')||new URLSearchParams(location.search).has('recovery'))recovery();
supabase.auth.onAuthStateChange(event=>{if(event==='PASSWORD_RECOVERY')recovery()});
document.querySelector('#register').onclick=()=>{mode='signup';document.querySelector('#heading').textContent='Create your account';submit.textContent='Create account';password.autocomplete='new-password';};
document.querySelector('#reset').onclick=async()=>{if(!email.reportValidity())return;const {error}=await supabase.auth.resetPasswordForEmail(email.value,{redirectTo:location.origin+'/login.html?recovery=1'});message.textContent=error?error.message:'Check your email for a password recovery link.';};
form.onsubmit=async event=>{event.preventDefault();submit.disabled=true;message.textContent='';try{
 let result;
 if(mode==='recovery')result=await supabase.auth.updateUser({password:password.value});
 else if(mode==='signup')result=await supabase.auth.signUp({email:email.value,password:password.value,options:{emailRedirectTo:location.origin+'/login.html'}});
 else result=await supabase.auth.signInWithPassword({email:email.value,password:password.value});
 if(result.error)throw result.error;
 if(mode==='signup'&&!result.data.session){message.textContent='Check your email to confirm your account, then sign in.';return;}
 location.replace(safeReturnPath(new URLSearchParams(location.search).get('next'),location.origin));
 }catch(error){message.textContent=error.message;}finally{submit.disabled=false;}};
