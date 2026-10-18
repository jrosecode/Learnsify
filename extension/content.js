const clean=value=>(value||'').replace(/\s+/g,' ').trim().slice(0,120);
function describe(target){
  const tag=target.tagName?.toLowerCase()||'element';
  const type={a:'link',button:'button',input:'field',select:'dropdown',textarea:'field',option:'option'}[tag]||tag;
  const labelledBy=target.getAttribute?.('aria-labelledby');
  const labelledText=labelledBy?document.getElementById(labelledBy)?.innerText:'';
  const label=clean(target.getAttribute?.('aria-label'))||clean(labelledText)||clean(target.innerText)||clean(target.value)||clean(target.placeholder)||clean(target.name)||clean(target.id)||tag;
  return `“${label}” ${type}`;
}
document.addEventListener('click',event=>{
  if(['pathira.com','www.pathira.com','learnsify.netlify.app'].includes(location.hostname)||(location.hostname==='127.0.0.1'&&location.port==='4177'))return;
  const target=event.target?.closest?.('a,button,input,select,textarea,[role="button"],[role="link"],[tabindex]')||event.target;
  if(!target||target.closest?.('[data-pathira-control]'))return;
  const rect=target.getBoundingClientRect?.()||{};
  const marker=document.createElement('div');marker.dataset.pathiraControl='marker';Object.assign(marker.style,{position:'fixed',zIndex:'2147483647',pointerEvents:'none',left:`${rect.left-4}px`,top:`${rect.top-4}px`,width:`${rect.width+8}px`,height:`${rect.height+8}px`,border:'4px solid #ff654d',borderRadius:'10px',boxShadow:'0 0 0 4px #fff8'});document.documentElement.append(marker);
  chrome.runtime.sendMessage({type:'CAPTURE_CLICK',capture:{description:describe(target),pageTitle:document.title,url:location.href,tag:target.tagName?.toLowerCase(),x:Math.round((rect.left||0)+(rect.width||0)/2),y:Math.round((rect.top||0)+(rect.height||0)/2)}}).finally(()=>marker.remove()).catch(()=>{});
},true);
if(['pathira.com','www.pathira.com','learnsify.netlify.app','localhost','127.0.0.1'].includes(location.hostname)){
  window.addEventListener('message',event=>{
    if(event.source!==window)return;
    const map={PATHIRA_START_CAPTURE:'START_CAPTURE',PATHIRA_STOP_CAPTURE:'STOP_CAPTURE',PATHIRA_STATUS_REQUEST:'GET_STATUS'};
    const type=map[event.data?.type];if(!type)return;
    chrome.runtime.sendMessage({type}).then(result=>window.postMessage({type:type==='STOP_CAPTURE'?'PATHIRA_CAPTURE_RESULT':'PATHIRA_CAPTURE_STATUS',...result},'*')).catch(()=>window.postMessage({type:'PATHIRA_EXTENSION_MISSING'},'*'));
  });
  chrome.runtime.sendMessage({type:'GET_STATUS'}).then(result=>window.postMessage({type:'PATHIRA_CAPTURE_STATUS',...result},'*')).catch(()=>{});
  chrome.runtime.sendMessage({type:'GET_PENDING'}).then(result=>{if(result.steps?.length)window.postMessage({type:'PATHIRA_CAPTURE_RESULT',...result},'*')}).catch(()=>{});
}
