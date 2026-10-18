import {duplicateClick} from './lib/duplicates.js';
import {createPrivateStorage} from './lib/private-storage.js';
import {captureToStep,orderCaptures} from './lib/capture.js';
const privateStorage=createPrivateStorage(chrome.storage.local);
const initial={active:false,paused:false,captures:[],sequence:0,startedAt:null,sessionId:null,error:null};
const MAX_CAPTURES=50;
let mutations=Promise.resolve(),images=Promise.resolve();
const serial=fn=>{const next=mutations.then(fn);mutations=next.catch(()=>{});return next};
const state=async()=>({...initial,...await privateStorage.get()});
async function setBadge(active,count=0){await chrome.action.setBadgeBackgroundColor({color:active?'#ff654d':'#6e7772'});await chrome.action.setBadgeText({text:active?String(count):''})}
async function blobToDataURL(blob){const bytes=new Uint8Array(await blob.arrayBuffer());let binary='';for(let i=0;i<bytes.length;i+=32768)binary+=String.fromCharCode(...bytes.subarray(i,i+32768));return `data:${blob.type};base64,${btoa(binary)}`}
async function captureScreen(tab){
 const assertPage=async()=>{const [current]=await chrome.tabs.query({active:true,windowId:tab.windowId});if(current?.id!==tab.id||current?.url!==tab.url)throw Error('Page changed before screenshot. Return to the page and retry.');};
 for(let attempt=0;attempt<3;attempt++){
  // Chrome allows two captures per second. Space every attempt, including failures.
  await new Promise(r=>setTimeout(r,[600,900,1500][attempt]));
  await assertPage();
  try{
   let raw;
   try{
    const prepared=await chrome.tabs.sendMessage(tab.id,{type:'PREPARE_PRIVATE_SCREENSHOT'});
    if(!prepared?.ok)throw Error('Privacy masking unavailable. Refresh the page and retry.');
    await new Promise(r=>setTimeout(r,100));
    await assertPage();
    raw=await chrome.tabs.captureVisibleTab(tab.windowId,{format:'jpeg',quality:65});
    await assertPage();
   }finally{await chrome.tabs.sendMessage(tab.id,{type:'CLEAR_PRIVACY_MASKS'}).catch(()=>{})}
   const bitmap=await createImageBitmap(await (await fetch(raw)).blob());
   const width=Math.min(1200,bitmap.width),height=Math.round(bitmap.height*width/bitmap.width);
   const canvas=new OffscreenCanvas(width,height);canvas.getContext('2d').drawImage(bitmap,0,0,width,height);bitmap.close();
   return blobToDataURL(await canvas.convertToBlob({type:'image/jpeg',quality:.65}));
  }catch(error){
   if(!/image readback failed|MAX_CAPTURE_VISIBLE_TAB_CALLS_PER_SECOND|capture.*quota/i.test(error.message))throw error;
   if(attempt===2)throw Error('Chrome could not capture this screen after 3 attempts. Keep the page visible and use Retry screenshot or Recapture step. ('+error.message+')');
  }
 }
}
async function recover(){await serial(async()=>{const s=await state();const captures=s.captures.map(c=>c.imageStatus==='pending'?{...c,imageStatus:'failed',error:'Screenshot interrupted. Return to the page and retry.'}:c);await privateStorage.set({...s,captures,paused:s.active?true:s.paused,error:s.active?'Recording interrupted. Resume or finish your saved session.':s.error})})}
const ready=recover();
chrome.sidePanel.setPanelBehavior({openPanelOnActionClick:true}).catch(()=>{});
function screenshotJob(id,tab){images=images.catch(()=>{}).then(async()=>{
 let screenshot=null,error=null;try{screenshot=await captureScreen(tab)}catch(e){error=e.message}
 await serial(async()=>{const s=await state();if(!s.captures.some(c=>c.id===id))return;
 const captures=s.captures.map(c=>c.id===id?{...c,screenshot,imageStatus:error?'failed':'saved',error}:c);
 try{await privateStorage.set({captures})}catch(e){await privateStorage.set({error:'Screenshot could not be saved. Free storage and retry.',captures:s.captures.map(c=>c.id===id?{...c,imageStatus:'failed',error:'Storage full'}:c)})}
 });
}).catch(async e=>{await privateStorage.set({error:e.message}).catch(()=>{})});}
async function handle(message,sender){
 await ready;
 if(message.type==='STOP_CAPTURE'){
  await serial(()=>privateStorage.set({active:false,paused:false}));await images;
  return serial(async()=>{const s=await state();if(!s.captures.length)return {ok:true,active:false,steps:s.lastCompletedSteps||[],batchId:s.batchId,count:s.lastCompletedSteps?.length||0};const steps=orderCaptures(s.captures).map(captureToStep);const batchId=s.sessionId||crypto.randomUUID();await privateStorage.set({...initial,lastCompletedSteps:steps,batchId});await setBadge(false);return {ok:true,active:false,steps,batchId,count:steps.length}});
 }
 return serial(async()=>{
  const s=await state();
  if(message.type==='START_CAPTURE'){
   if(s.active||s.captures.length)throw new Error('Resume or finish the existing recording first.');
   if(s.lastCompletedSteps?.length)throw new Error('Import the saved recording before starting another.');
   await privateStorage.set({...initial,active:true,sessionId:crypto.randomUUID(),startedAt:Date.now()});await setBadge(true);return {ok:true,active:true,count:0};
  }
  if(message.type==='PAUSE_CAPTURE'||message.type==='RESUME_CAPTURE'){if(!s.active)throw new Error('No recording to resume');await privateStorage.set({paused:message.type==='PAUSE_CAPTURE',error:null});return {ok:true};}
  if(message.type==='SET_PRIVACY'){await privateStorage.set({privacy:message.privacy});return {ok:true};}
  if(message.type==='GET_PANEL_STATE'){if(sender.id!==chrome.runtime.id||sender.url!==chrome.runtime.getURL('sidepanel.html'))throw Error('Extension panel required');return s;}
  if(message.type==='GET_STATUS')return {ok:true,active:s.active,paused:s.paused,count:s.captures.length,error:s.error};
  if(message.type==='GET_PENDING')return {ok:true,steps:s.lastCompletedSteps||[],batchId:s.batchId};
  if(message.type==='ACK_IMPORT'){if(message.batchId===s.batchId)await privateStorage.set({lastCompletedSteps:[],batchId:null});return {ok:true};}
  if(message.type==='RETRY_SCREENSHOT'){
   const c=s.captures.find(c=>c.id===message.id);if(!c)throw new Error('Step not found');
   const tab=await chrome.tabs.get(c.tabId);if(tab.url!==c.url)throw new Error('Return to the original page before retrying.');
   await privateStorage.set({captures:s.captures.map(x=>x.id===c.id?{...x,imageStatus:'pending',error:null}:x)});screenshotJob(c.id,tab);return {ok:true};
  }
  if(message.type==='CAPTURE_CLICK'||message.type==='MANUAL_CAPTURE'){
   if(!s.active||s.paused)return {ok:true,active:s.active,count:s.captures.length};
   if(s.captures.length>=MAX_CAPTURES){await privateStorage.set({paused:true,error:'50-step limit reached. Finish and import this recording.'});return {ok:false,error:'50-step limit reached'};}
   const tab=message.type==='MANUAL_CAPTURE'?(await chrome.tabs.query({active:true,lastFocusedWindow:true}))[0]:sender.tab;if(!tab)throw new Error('No browser tab available');
   const hostname=new URL(tab.url).hostname,privacy=s.privacy||{};const matches=list=>(list||[]).some(d=>hostname===d||hostname.endsWith('.'+d));
   if(matches(privacy.blocked)||privacy.allowed?.length&&!matches(privacy.allowed)){await privateStorage.set({error:'Capture blocked by domain privacy settings.'});return {ok:false,error:'Capture blocked on this domain'};}
   const previous=s.captures.at(-1),event=message.capture||{};
   const duplicate=message.type==='CAPTURE_CLICK'&&duplicateClick(previous,event,tab);
   if(duplicate)return {ok:true,active:true,count:s.captures.length,filtered:true};
   const capture={...event,id:crypto.randomUUID(),sessionId:s.sessionId,manual:message.type==='MANUAL_CAPTURE',pageTitle:tab.title,url:tab.url,tabId:tab.id,sequence:s.sequence+1,capturedAt:Date.now(),imageStatus:'pending',screenshot:null,duplicate};
   const bytes=await chrome.storage.local.getBytesInUse(null);
   await privateStorage.set({captures:[...s.captures,capture],sequence:capture.sequence,error:bytes>40*1024*1024?'Storage exceeds 40 MB. Finish and import soon.':s.error});
   screenshotJob(capture.id,tab);await setBadge(true,s.captures.length+1);return {ok:true,active:true,count:s.captures.length+1};
  }
  return {ok:true,active:s.active,count:s.captures.length};
 });
}
chrome.runtime.onMessage.addListener((message,sender,sendResponse)=>{handle(message,sender).then(sendResponse).catch(async error=>{await privateStorage.set({error:error.message}).catch(()=>{});sendResponse({ok:false,error:error.message})});return true});
