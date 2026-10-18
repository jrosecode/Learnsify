// Only suppress repeated delivery of a nearby click; manual captures always count.
export function duplicateClick(previous,event,tab,now=Date.now()) {
  return !!previous&&!previous.manual&&previous.tabId===tab.id&&previous.url===tab.url&&
    previous.description===event.description&&Number.isFinite(event.x)&&Number.isFinite(event.y)&&
    Math.abs(previous.x-event.x)<3&&Math.abs(previous.y-event.y)<3&&now-previous.capturedAt<350;
}
