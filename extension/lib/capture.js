const names={a:'link',button:'button',input:'field',select:'dropdown',textarea:'field',option:'option'};
const clean=value=>(value||'').replace(/\s+/g,' ').trim().slice(0,120);
export function describeElement({ariaLabel='',text='',placeholder='',name='',tag=''}){
  const label=clean(ariaLabel)||clean(text)||clean(placeholder)||clean(name)||clean(tag)||'element';
  const type=names[String(tag).toLowerCase()]||String(tag).toLowerCase()||'element';
  return `“${label}” ${type}`;
}
export function captureToStep(capture){return {id:`capture-${capture.sequence}`,title:`Click ${capture.description}`,description:`On ${capture.pageTitle||'this page'}, click ${capture.description}.`,url:capture.url,pageTitle:capture.pageTitle,screenshot:capture.screenshot||null,click:{x:capture.x,y:capture.y},sequence:capture.sequence,capturedAt:capture.capturedAt};}
export function orderCaptures(rows){return [...rows].sort((a,b)=>a.sequence-b.sequence);}
