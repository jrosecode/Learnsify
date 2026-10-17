import {captureToStep,orderCaptures} from './lib/capture.js';
const initial={active:false,captures:[],sequence:0,startedAt:null};
const MAX_CAPTURES=50;
let captureQueue=Promise.resolve();
async function state(){return {...initial,...await chrome.storage.local.get(initial)}}
async function setBadge(active,count=0){await chrome.action.setBadgeBackgroundColor({color:active?'#ff654d':'#6e7772'});await chrome.action.setBadgeText({text:active?String(count):''})}
async function blobToDataURL(blob){const bytes=new Uint8Array(await blob.arrayBuffer());let binary='';for(let i=0;i<bytes.length;i+=32768)binary+=String.fromCharCode(...bytes.subarray(i,i+32768));return `data:${blob.type};base64,${btoa(binary)}`}
async function compressScreenshot(dataUrl){
  const bitmap=await createImageBitmap(await (await fetch(dataUrl)).blob());
  const width=Math.min(800,bitmap.width),height=Math.round(bitmap.height*(width/bitmap.width));
  const canvas=new OffscreenCanvas(width,height);canvas.getContext('2d').drawImage(bitmap,0,0,width,height);bitmap.close();
  return blobToDataURL(await canvas.convertToBlob({type:'image/jpeg',quality:.48}));
}
async function captureScreen(windowId){
  await new Promise(resolve=>setTimeout(resolve,70));
  const raw=await chrome.tabs.captureVisibleTab(windowId,{format:'jpeg',quality:65});
  return compressScreenshot(raw);
}
chrome.runtime.onInstalled.addListener(()=>chrome.storage.local.set(initial));
chrome.runtime.onMessage.addListener((message,sender,sendResponse)=>{(async()=>{
  const current=await state();
  if(message.type==='START_CAPTURE'){await chrome.storage.local.set({...initial,active:true,startedAt:Date.now()});await setBadge(true,0);sendResponse({ok:true,active:true,count:0});return}
  if(message.type==='STOP_CAPTURE'){await captureQueue;const latest=await state();const ordered=orderCaptures(latest.captures);await chrome.storage.local.set(initial);await setBadge(false);sendResponse({ok:true,active:false,steps:ordered.map(captureToStep),count:ordered.length});return}
  if(message.type==='GET_STATUS'){sendResponse({ok:true,active:current.active,count:current.captures.length,startedAt:current.startedAt});return}
  if(message.type==='GET_PENDING'){const {lastCompletedSteps=[]}=await chrome.storage.local.get({lastCompletedSteps:[]});if(lastCompletedSteps.length)await chrome.storage.local.remove('lastCompletedSteps');sendResponse({ok:true,steps:lastCompletedSteps});return}
  if(message.type==='CAPTURE_CLICK'&&current.active){
    captureQueue=captureQueue.then(async()=>{
      const latest=await state();if(!latest.active||latest.captures.length>=MAX_CAPTURES)return latest.captures.length;
      let screenshot=null;try{screenshot=await captureScreen(sender.tab?.windowId)}catch(error){console.warn('Learnsify screenshot unavailable',error)}
      const capture={...message.capture,screenshot,tabId:sender.tab?.id,sequence:latest.sequence+1,capturedAt:Date.now()};
      const captures=[...latest.captures,capture];await chrome.storage.local.set({captures,sequence:capture.sequence});await setBadge(true,captures.length);return captures.length;
    });
    const count=await captureQueue;sendResponse({ok:true,active:true,count});return
  }
  sendResponse({ok:true,active:current.active,count:current.captures.length});
})().catch(error=>sendResponse({ok:false,error:error.message}));return true});
