// Optional bounded reveal cues, evaluated on the narration's integer frame clock.
// Output FPS only chooses samples; it never changes the cue's global timing.
const smooth=x=>{x=Math.max(0,Math.min(1,x));return x*x*(3-2*x);};
const mix=(a,b,t)=>a+(b-a)*t;
function keys(o,allowed){if(!o||typeof o!=='object'||Array.isArray(o)||Object.keys(o).some(k=>!allowed.includes(k)))throw new Error('Invalid reveal field');}
export function compileReveal(input,{fps,frameCount,cast,environment}){
 keys(input,['globalStart','globalEnd','clockFps','counter','ghost','tag','lean','whisper','push']);const p=structuredClone(input);
 if(environment.kind!=='bedroom-window'||p.clockFps!==30||![15,30].includes(fps)||!Number.isInteger(p.globalStart)||!Number.isInteger(p.globalEnd)||p.globalStart<0||p.globalEnd<=p.globalStart||p.globalEnd-p.globalStart>600)throw new Error('Reveal needs a bounded 30fps bedroom timeline and 15/30fps samples');
 p.step=p.clockFps/fps;p.paddingNativeFrames=frameCount*p.step-(p.globalEnd-p.globalStart);p.presentationEndFrame=p.globalStart+frameCount*p.step;if(frameCount!==Math.ceil((p.globalEnd-p.globalStart)/p.step))throw new Error('Reveal frame count does not match global window');
 const ids=new Set(cast.map(a=>a.id)),integer=v=>Number.isInteger(v)&&v>=p.globalStart&&v<=p.globalEnd;
 const interval=(value,count=2)=>{if(!Array.isArray(value)||value.length!==count||value.some((v,i)=>!integer(v)||i&&v<=value[i-1]))throw new Error('Invalid global cue interval');};
 for(const [name,fields] of Object.entries({counter:['actor','before','after','at','emphasis'],ghost:['actor','interval'],tag:['actor','text','interval'],lean:['actor','interval'],whisper:['actor','text','interval']})){
  keys(p[name],fields);if(!ids.has(p[name].actor))throw new Error('Unknown reveal actor');
 }
 if(p.counter.actor===p.ghost.actor||p.tag.actor!==p.ghost.actor||p.lean.actor!==p.counter.actor||p.whisper.actor!==p.counter.actor)throw new Error('Reveal actor roles conflict');
 if(!integer(p.counter.at)||![p.counter.before,p.counter.after].every(v=>Number.isInteger(v)&&v>=0&&v<=100))throw new Error('Invalid counter');
 interval(p.counter.emphasis);interval(p.ghost.interval);interval(p.tag.interval);interval(p.lean.interval,4);interval(p.whisper.interval);
 if(!/^[A-Z ]{1,12}$/.test(p.tag.text)||typeof p.whisper.text!=='string'||p.whisper.text.length>24)throw new Error('Invalid reveal text');
 if(p.ghost.interval[0]<p.counter.at||p.tag.interval[1]>p.counter.at||p.counter.at<p.whisper.interval[1])throw new Error('Reveal events out of narrative order');
 keys(p.push,['interval','position','target','fov']);interval(p.push.interval);for(const v of [p.push.position,p.push.target])if(!Array.isArray(v)||v.length!==3||!v.every(n=>Number.isFinite(n)&&Math.abs(n)<100))throw new Error('Invalid push camera');if(!Number.isFinite(p.push.fov)||p.push.fov<20||p.push.fov>65)throw new Error('Invalid push FOV');
 return p;
}
export function sampleRevealGlobal(p,globalFrame){
 if(!Number.isInteger(globalFrame)||globalFrame<p.globalStart||globalFrame>=p.globalEnd)throw new Error('Invalid global reveal frame');
 const ramp=([a,b])=>smooth((globalFrame-a)/(b-a));
 const [a,b,c,d]=p.lean.interval;
 return {globalFrame,globalSeconds:globalFrame/p.clockFps,counter:globalFrame<p.counter.at?p.counter.before:p.counter.after,ghostToHuman:ramp(p.ghost.interval),tagVisible:globalFrame>=p.tag.interval[0],tagLift:ramp(p.tag.interval),tagOpacity:smooth((globalFrame-p.tag.interval[0])/6),lean:smooth((globalFrame-a)/(b-a))*(1-smooth((globalFrame-c)/(d-c))),whisper:globalFrame>=p.whisper.interval[0]&&globalFrame<p.whisper.interval[1],counterEmphasis:globalFrame>=p.counter.emphasis[0]&&globalFrame<p.counter.emphasis[1],push:globalFrame>=p.push.interval[0]&&globalFrame<p.push.interval[1]?ramp(p.push.interval):null};
}
export function sampleReveal(p,localFrame){return sampleRevealGlobal(p,p.globalStart+localFrame*p.step);}
export function revealCamera(p,state,base){
 if(state.push===null)return base;const t=state.push;return {position:base.position.map((v,i)=>mix(v,p.push.position[i],t)),target:base.target.map((v,i)=>mix(v,p.push.target[i],t)),fov:mix(base.fov,p.push.fov,t)};
}
