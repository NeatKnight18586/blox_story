const smooth=x=>{x=Math.max(0,Math.min(1,x));return x*x*(3-2*x);};
export function compileEvents(input,props,frameCount,actorPosition,actorIds=null){
 if(!Array.isArray(input)||input.length>128)throw new Error('Expected at most 128 events');
 const ids=new Set(),last=new Map(),targets=new Map(props.map(p=>[p.id,p]));
 const events=structuredClone(input).sort((a,b)=>a.start-b.start);
 for(const e of events){
  if(!/^[a-z][a-z0-9_-]{0,63}$/.test(e.id)||ids.has(e.id)||!targets.has(e.target)||e.channel!=='open'||Object.keys(e).some(k=>!['id','target','channel','start','end','from','to','proximityRadius',...(actorIds?['actor']:[])].includes(k)))throw new Error('Invalid event identity/target/channel');ids.add(e.id);
  if(!Number.isInteger(e.start)||!Number.isInteger(e.end)||e.start<0||e.end<=e.start||e.end>frameCount||![e.from,e.to].every(v=>Number.isFinite(v)&&v>=0&&v<=1))throw new Error('Invalid event interval/value');
  if(actorIds&&((e.actor!==undefined&&!actorIds.has(e.actor))||(e.proximityRadius!==undefined&&actorIds.size>1&&!e.actor)))throw new Error('Proximity event needs a known actor ID');
  const previous=last.get(e.target),initial=targets.get(e.target).initial.open;
  if(previous&&e.start<previous.end)throw new Error('Overlapping events on one channel');
  if(e.from!==(previous?previous.to:initial))throw new Error('Discontinuous event endpoint');
  if(e.proximityRadius!==undefined){
   if(!Number.isFinite(e.proximityRadius)||e.proximityRadius<=0)throw new Error('Invalid proximity radius');
   const p=actorPosition(e.start,e.actor),target=targets.get(e.target).position;
   e.triggerDistance=Math.hypot(p[0]-target[0],p[2]-target[2]);if(e.triggerDistance>e.proximityRadius)throw new Error('Actor outside event proximity');
  }
  last.set(e.target,e);
 }
 return events;
}
export function samplePropEvents(props,events,frame){
 const states=Object.fromEntries(props.map(p=>[p.id,{open:p.initial.open}]));
 for(const e of events)if(frame>=e.start)states[e.target].open=e.from+(e.to-e.from)*smooth((frame-e.start)/(e.end-e.start));
 return states;
}
