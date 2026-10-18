import {safeImage,escapeHTML as esc} from './domain.js';
export function guideImage(step) {
 const src=safeImage(step.screenshot);if(!src)return '';
 const r=step.click?.rect,w=step.click?.width,h=step.click?.height;
 const valid=r&&[r.x,r.y,r.w,r.h,w,h].every(Number.isFinite)&&w>0&&h>0&&r.x>=0&&r.y>=0&&r.w>0&&r.h>0&&r.x+r.w<=w&&r.y+r.h<=h;
 return `<div class="step-image" style="position:relative;display:inline-block;max-width:100%"><img style="display:block;max-width:100%" src="${src}" alt="${esc(step.alt||step.title)}">${valid?`<span class="click-highlight" style="position:absolute;pointer-events:none;box-sizing:border-box;border:3px solid ${/^#[a-f0-9]{6}$/i.test(r.color)?r.color:'#ff654d'};left:${100*r.x/w}%;top:${100*r.y/h}%;width:${100*r.w/w}%;height:${100*r.h/h}%"></span>`:''}</div>`;
}
