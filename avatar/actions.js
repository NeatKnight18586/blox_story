// F2A only: pure explicit-second sampling. Angles are restrained XYZ radians.
const names=['head','leftShoulder','rightShoulder','leftHip','rightHip'];
const smooth=x=>{x=Math.max(0,Math.min(1,x));return x*x*(3-2*x);};
function time(value){if(!Number.isFinite(value)||value<0)throw new Error('Time must be finite and nonnegative');}
function neutral(){return {root:{position:[0,0,0],yaw:0},pivots:Object.fromEntries(names.map(n=>[n,[0,0,0]])),contacts:{support:['leftLeg','rightLeg'],anchors:[[-.5,0,0],[.5,0,0]]}};}
export function sampleAction(name,t,options={}){
 time(t);
 if(!['idle','look_react'].includes(name))throw new Error('Unknown F2A action');
 if(!options||typeof options!=='object'||Array.isArray(options)||Object.keys(options).some(k=>k!=='direction')||!['left','right'].includes(options.direction??'right'))throw new Error('Invalid action options');
 const s=neutral(),p=s.pivots;
 if(name==='idle'){
  const wave=Math.sin((t%3)/3*Math.PI*2);
  p.head=[.012*wave,.035*wave,0];
  p.leftShoulder=[.018*wave,0,-.004*(1-Math.cos((t%3)/3*Math.PI*2))];
  p.rightShoulder=[-.018*wave,0,.004*(1-Math.cos((t%3)/3*Math.PI*2))];
 }else{
  // Anticipation → turn/glance → hold → return. All boundaries have zero slope.
  const v=t<.2?-.12*smooth(t/.2):t<.65?-.12+1.12*smooth((t-.2)/.45):t<1?1:t<1.6?1-smooth((t-1)/.6):0;
  const direction=options.direction==='left'?-1:1;
  p.head=[.06*v,.3*v*direction,0];
  p.leftShoulder=[-.035*v,0,-.012*Math.max(0,v)];
  p.rightShoulder=[-.035*v,0,.012*Math.max(0,v)];
 }
 return s;
}
function request(r){if(r?.sample){validate(r.sample);return r.sample;}return sampleAction(r?.action,r?.time,r?.options);}
export function sampleTransition(from,to,elapsed,duration=.25){
 time(elapsed);time(duration);
 const a=request(from),b=request(to),w=duration===0?1:smooth(elapsed/duration);
 const s=neutral();
 // Shortest angular path; bounded F2A XYZ angles avoid gimbal singularities.
 for(const n of names)s.pivots[n]=a.pivots[n].map((v,i)=>v+Math.atan2(Math.sin(b.pivots[n][i]-v),Math.cos(b.pivots[n][i]-v))*w);
 // F2A never moves root/hips: both contacts remain exact through every blend.
 return s;
}
function validate(s){
 if(!s||!s.root||!Array.isArray(s.root.position)||s.root.position.length!==3||s.root.position.some(v=>v!==0)||s.root.yaw!==0||!s.pivots)throw new Error('Invalid F2A sample');
 for(const n of names){const r=s.pivots[n];if(!Array.isArray(r)||r.length!==3||!r.every(Number.isFinite)||r.some(v=>Math.abs(v)>.5))throw new Error('Invalid pivot sample');}
 for(const n of ['leftHip','rightHip'])if(s.pivots[n].some(v=>v!==0))throw new Error('F2A keeps feet planted');
}
export function applyActionSample(avatar,s,origin={position:[0,0,0],yaw:0}){
 validate(s);
 if(!origin||!Array.isArray(origin.position)||origin.position.length!==3||!origin.position.every(Number.isFinite)||!Number.isFinite(origin.yaw))throw new Error('Invalid origin');
 // Absolute placement, never accumulated onto the previous frame.
 avatar.root.position.set(...origin.position);avatar.root.rotation.set(0,origin.yaw,0);
 for(const n of names)avatar.pivots[n].rotation.set(...s.pivots[n]);
 return avatar;
}
