import {escapeHTML as esc} from './domain.js';
export async function editImage(src,click={}){return new Promise((resolve,reject)=>{
 const dialog=document.createElement('dialog');dialog.className='image-dialog';dialog.innerHTML=`<form method="dialog"><div class="dialog-head"><h2>Edit screenshot</h2><button aria-label="Close image editor">×</button></div></form><div class="image-tools"><label>Tool <select id="image-tool"><option value="redact">Permanent redaction</option><option value="blur">Blur</option><option value="crop">Crop</option><option value="box">Box</option><option value="arrow">Arrow</option><option value="text">Text</option><option value="highlight">Click highlight</option></select></label><label>Color <input id="image-color" type="color" value="#ff654d"></label><label>Text <input id="image-text" maxlength="100" placeholder="Annotation"></label><label>Zoom <input id="image-zoom" type="range" min="50" max="200" value="100"></label><button id="image-undo">Undo image edit</button><button id="image-redo">Redo</button><button id="image-clear-highlight">Remove highlight</button></div><details><summary>Keyboard selection</summary><div class="image-tools"><label>X<input id="area-x" type="number" min="0" value="0"></label><label>Y<input id="area-y" type="number" min="0" value="0"></label><label>Width<input id="area-w" type="number" min="1" value="10"></label><label>Height<input id="area-h" type="number" min="1" value="10"></label><button id="area-apply">Apply selected tool to area</button></div></details><p>Drag across the image to select an area. Redaction permanently removes selected pixels when applied; it also clears the original and undo history.</p><div class="canvas-wrap"><canvas aria-label="Screenshot editing canvas"></canvas></div><button id="image-apply" class="primary">Apply changes</button><p role="status" id="image-status"></p>`;
 document.body.append(dialog);dialog.showModal();const canvas=dialog.querySelector('canvas'),ctx=canvas.getContext('2d');let loaded=false,start=null,redacted=false,highlight=click?.rect||null,past=[],future=[];
 const image=new Image();image.onload=()=>{canvas.width=image.width;canvas.height=image.height;ctx.drawImage(image,0,0);loaded=true};image.onerror=()=>{dialog.close();reject(Error('Image could not be loaded'))};image.src=src;
 const snapshot=()=>({pixels:ctx.getImageData(0,0,canvas.width,canvas.height),redacted,highlight:structuredClone(highlight)});
 const restore=s=>{canvas.width=s.pixels.width;canvas.height=s.pixels.height;ctx.putImageData(s.pixels,0,0);redacted=s.redacted;highlight=s.highlight};
 const checkpoint=()=>{past.push(snapshot());if(past.length>15)past.shift();future=[]};
 const point=e=>{const r=canvas.getBoundingClientRect();return {x:Math.max(0,Math.min(canvas.width,(e.clientX-r.left)*canvas.width/r.width)),y:Math.max(0,Math.min(canvas.height,(e.clientY-r.top)*canvas.height/r.height))}};
 canvas.onpointerdown=e=>{if(!loaded)return;start=point(e);canvas.setPointerCapture(e.pointerId)};
 const applySelection=end=>{if(!start||!loaded)return;const x=Math.floor(Math.min(start.x,end.x)),y=Math.floor(Math.min(start.y,end.y)),w=Math.max(1,Math.floor(Math.abs(end.x-start.x))),h=Math.max(1,Math.floor(Math.abs(end.y-start.y))),tool=dialog.querySelector('#image-tool').value,color=dialog.querySelector('#image-color').value;
 checkpoint();ctx.strokeStyle=color;ctx.fillStyle=color;ctx.lineWidth=Math.max(3,canvas.width/200);
 if(tool==='redact'){ctx.fillStyle='#000';ctx.fillRect(x,y,w,h);redacted=true;}
 if(tool==='blur'){const part=document.createElement('canvas');part.width=w;part.height=h;part.getContext('2d').drawImage(canvas,x,y,w,h,0,0,w,h);ctx.save();ctx.filter='blur(14px)';ctx.drawImage(part,x,y);ctx.restore();redacted=true;}
 if(tool==='crop'){const pixels=ctx.getImageData(x,y,w,h);canvas.width=w;canvas.height=h;ctx.putImageData(pixels,0,0);highlight=null;}
 if(tool==='box')ctx.strokeRect(x,y,w,h);
 if(tool==='highlight')highlight={x,y,w,h,color};
 if(tool==='arrow'){const angle=Math.atan2(end.y-start.y,end.x-start.x),size=Math.max(14,canvas.width/40);ctx.beginPath();ctx.moveTo(start.x,start.y);ctx.lineTo(end.x,end.y);ctx.lineTo(end.x-size*Math.cos(angle-.5),end.y-size*Math.sin(angle-.5));ctx.moveTo(end.x,end.y);ctx.lineTo(end.x-size*Math.cos(angle+.5),end.y-size*Math.sin(angle+.5));ctx.stroke();}
 if(tool==='text'){ctx.font=`bold ${Math.max(18,canvas.width/35)}px sans-serif`;ctx.fillText(dialog.querySelector('#image-text').value,x,y+30)}
 start=null;dialog.querySelector('#image-status').textContent=tool==='highlight'?'Highlight position saved. It will appear in guide playback.':'Edit applied to preview.';
 };
 canvas.onpointerup=e=>applySelection(point(e));
 dialog.querySelector('#area-apply').onclick=()=>{const x=Number(dialog.querySelector('#area-x').value),y=Number(dialog.querySelector('#area-y').value),w=Number(dialog.querySelector('#area-w').value),h=Number(dialog.querySelector('#area-h').value);if(!loaded||![x,y,w,h].every(Number.isFinite)||x<0||y<0||w<1||h<1||x+w>canvas.width||y+h>canvas.height){dialog.querySelector('#image-status').textContent='Choose an area inside the loaded image.';return}start={x,y};applySelection({x:x+w,y:y+h})};
 dialog.querySelector('#image-undo').onclick=()=>{if(past.length){future.push(snapshot());restore(past.pop())}};
 dialog.querySelector('#image-redo').onclick=()=>{if(future.length){past.push(snapshot());restore(future.pop())}};
 dialog.querySelector('#image-clear-highlight').onclick=()=>{checkpoint();highlight=null;dialog.querySelector('#image-status').textContent='Click highlight removed'};
 dialog.querySelector('#image-zoom').oninput=e=>canvas.style.width=e.target.value+'%';
 dialog.querySelector('#image-apply').onclick=()=>{resolve({screenshot:canvas.toDataURL('image/png'),redacted,click:{rect:highlight,width:canvas.width,height:canvas.height}});dialog.close()};
 dialog.onclose=()=>{dialog.remove();resolve(null)};
 });}
