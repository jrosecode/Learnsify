import {captureToStep,orderCaptures} from './lib/capture.js';
const initial={active:false,captures:[],sequence:0,startedAt:null};
async function state(){return {...initial,...await chrome.storage.local.get(initial)}}
async function setBadge(active,count=0){await chrome.action.setBadgeBackgroundColor({color:active?'#ff654d':'#6e7772'});await chrome.action.setBadgeText({text:active?String(count):''})}
chrome.runtime.onInstalled.addListener(()=>chrome.storage.local.set(initial));
chrome.runtime.onMessage.addListener((message,sender,sendResponse)=>{(async()=>{
  const current=await state();
  if(message.type==='START_CAPTURE'){await chrome.storage.local.set({...initial,active:true,startedAt:Date.now()});await setBadge(true,0);sendResponse({ok:true,active:true,count:0});return}
  if(message.type==='STOP_CAPTURE'){const ordered=orderCaptures(current.captures);await chrome.storage.local.set(initial);await setBadge(false);sendResponse({ok:true,active:false,steps:ordered.map(captureToStep),count:ordered.length});return}
  if(message.type==='GET_STATUS'){sendResponse({ok:true,active:current.active,count:current.captures.length,startedAt:current.startedAt});return}
  if(message.type==='GET_PENDING'){const {lastCompletedSteps=[]}=await chrome.storage.local.get({lastCompletedSteps:[]});if(lastCompletedSteps.length)await chrome.storage.local.remove('lastCompletedSteps');sendResponse({ok:true,steps:lastCompletedSteps});return}
  if(message.type==='CAPTURE_CLICK'&&current.active){const capture={...message.capture,tabId:sender.tab?.id,sequence:current.sequence+1,capturedAt:Date.now()};const captures=[...current.captures,capture];await chrome.storage.local.set({captures,sequence:capture.sequence});await setBadge(true,captures.length);sendResponse({ok:true,active:true,count:captures.length});return}
  sendResponse({ok:true,active:current.active,count:current.captures.length});
})().catch(error=>sendResponse({ok:false,error:error.message}));return true});
