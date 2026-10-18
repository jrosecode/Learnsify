const clean=value=>(value||'').replace(/\s+/g,' ').trim().slice(0,120);
function describe(target){
  const tag=target.tagName?.toLowerCase()||'element';
  const type={a:'link',button:'button',input:'field',select:'dropdown',textarea:'field',option:'option'}[tag]||tag;
  const labelledBy=target.getAttribute?.('aria-labelledby');
  const labelledText=labelledBy?document.getElementById(labelledBy)?.innerText:'';
  const label=clean(target.getAttribute?.('aria-label'))||clean(labelledText)||clean(target.innerText)||clean(target.placeholder)||clean(target.name)||clean(target.id)||tag;
  return `“${label}” ${type}`;
}
document.addEventListener('click',event=>{
  if(['pathira.com','www.pathira.com','pathira.netlify.app','learnsify.netlify.app'].includes(location.hostname)||(location.hostname==='127.0.0.1'&&location.port==='4177'))return;
  const target=event.target?.closest?.('a,button,input,select,textarea,[role="button"],[role="link"],[tabindex]')||event.target;
  if(!target||target.closest?.('[data-pathira-control]'))return;
  const rect=target.getBoundingClientRect?.()||{};
  const marker=document.createElement('div');marker.dataset.pathiraControl='marker';Object.assign(marker.style,{position:'fixed',zIndex:'2147483647',pointerEvents:'none',left:`${rect.left-4}px`,top:`${rect.top-4}px`,width:`${rect.width+8}px`,height:`${rect.height+8}px`,border:'4px solid #ff654d',borderRadius:'10px',boxShadow:'0 0 0 4px #fff8'});document.documentElement.append(marker);
  chrome.runtime.sendMessage({type:'CAPTURE_CLICK',capture:{description:describe(target),pageTitle:document.title,url:location.href,tag:target.tagName?.toLowerCase(),x:Math.round((rect.left||0)+(rect.width||0)/2),y:Math.round((rect.top||0)+(rect.height||0)/2)}}).finally(()=>marker.remove()).catch(()=>{});
},true);
if(['pathira.com','www.pathira.com','pathira.netlify.app','learnsify.netlify.app','localhost','127.0.0.1'].includes(location.hostname)){
  window.addEventListener('message',event=>{
    if(event.source!==window)return;
    const map={PATHIRA_START_CAPTURE:'START_CAPTURE',PATHIRA_STOP_CAPTURE:'STOP_CAPTURE',PATHIRA_STATUS_REQUEST:'GET_STATUS',PATHIRA_GET_PENDING:'GET_PENDING',PATHIRA_ACK_IMPORT:'ACK_IMPORT'};
    const type=map[event.data?.type];if(!type)return;
    chrome.runtime.sendMessage({type,batchId:event.data.batchId}).then(result=>window.postMessage({type:['STOP_CAPTURE','GET_PENDING'].includes(type)?'PATHIRA_CAPTURE_RESULT':'PATHIRA_CAPTURE_STATUS',...result},'*')).catch(()=>window.postMessage({type:'PATHIRA_EXTENSION_MISSING'},'*'));
  });
  chrome.runtime.sendMessage({type:'GET_STATUS'}).then(result=>window.postMessage({type:'PATHIRA_CAPTURE_STATUS',...result},'*')).catch(()=>{});
  chrome.runtime.sendMessage({type:'GET_PENDING'}).then(result=>{if(result.steps?.length)window.postMessage({type:'PATHIRA_CAPTURE_RESULT',...result},'*')}).catch(()=>{});
}
// Mask likely sensitive fields and text on the device before screenshot transmission.
const privacyMasks=[];
chrome.runtime.onMessage.addListener((message,sender,reply)=>{
 if(message.type==='CLEAR_PRIVACY_MASKS'){privacyMasks.splice(0).forEach(x=>x.remove());reply({ok:true});return;}
 if(message.type!=='PREPARE_PRIVATE_SCREENSHOT')return;
 privacyMasks.splice(0).forEach(x=>x.remove());
 const cover=rect=>{if(!rect.width||!rect.height||rect.bottom<0||rect.top>innerHeight)return;const mask=document.createElement('div');mask.dataset.pathiraControl='privacy';Object.assign(mask.style,{position:'fixed',left:rect.left+'px',top:rect.top+'px',width:rect.width+'px',height:rect.height+'px',background:'#000',zIndex:'2147483647',pointerEvents:'none'});document.documentElement.append(mask);privacyMasks.push(mask)};
 document.querySelectorAll('input,textarea').forEach(el=>{if(el.type==='password'||/email|tel|cc-|card|ssn|social|birth|health|medical/i.test([el.type,el.name,el.id,el.autocomplete].join(' ')))cover(el.getBoundingClientRect())});
 const walker=document.createTreeWalker(document.body||document.documentElement,NodeFilter.SHOW_TEXT);let node,count=0;
 while((node=walker.nextNode())&&count++<3000){if(node.parentElement?.closest('script,style,[data-pathira-control]'))continue;if(/\b[\w.+-]+@[\w.-]+\.[a-z]{2,}\b|\b\d{3}-\d{2}-\d{4}\b|\b(?:\d[ -]?){13,16}\b/i.test(node.textContent)){const range=document.createRange();range.selectNode(node);for(const rect of range.getClientRects())cover(rect)}}
 reply({ok:true,masked:privacyMasks.length});
});
