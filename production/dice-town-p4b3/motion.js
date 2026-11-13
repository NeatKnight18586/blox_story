// Shot-local integer source frames; editorial holds live in the edit map.
export const counts={D33:27,D34:30,D38:27};
export const ease=x=>{x=Math.max(0,Math.min(1,x));return x*x*(3-2*x);};
export function sample(shot,frame){
 if(!(shot in counts)||!Number.isInteger(frame)||frame<0||frame>=counts[shot])throw Error('Invalid ending source frame');
 const u=frame/(counts[shot]-1),s=ease(u);
 return {shot,frame,gate:shot==='D33'?1.24*s:1.24,walkTime:shot==='D34'?3*u:0,cover:shot==='D38'&&s<1?-2*(1-s):0,shoulder:shot==='D38'?-1.05+.07*s:0,head:shot==='D38'?[.43-.25*s,-.69+.39*s,0]:[0,0,0]};
}
