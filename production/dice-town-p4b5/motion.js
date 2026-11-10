import {sampleMotion} from '../dice-town-p2a/motion.js';
export const counts={D02:42,D05:15,D06:12,D07:12,D08:24,D09:36,D12:12,D14:42};
export const ease=x=>{x=Math.max(0,Math.min(1,x));return x*x*(3-2*x);};
export function sample(shot,frame){if(!(shot in counts)||!Number.isInteger(frame)||frame<0||frame>=counts[shot])throw Error('Invalid opening source sample');const u=frame/(counts[shot]-1),s=ease(u);return{shot,frame,s,lift:sampleMotion(15+(shot==='D02'?frame:35)).people,heroY:shot==='D05'?.12*s:shot==='D06'?.12-.02*s:.10,cupHeight:1.10*s,walkTime:frame/30,clip:ease(frame/17),descent:shot==='D14'&&frame>=18?ease((frame-18)/23):null};}
