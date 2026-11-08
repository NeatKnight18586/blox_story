import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';

// Cache the actual canonical beveled leg's YZ profile once, not per sample.
const geometry=new RoundedBoxGeometry(.98,2,1,4,.02);
const positions=geometry.attributes.position,unique=new Map();
for(let i=0;i<positions.count;i++){
 const y=positions.getY(i)-1,z=positions.getZ(i);
 unique.set(`${y},${z}`,[y,z]);
}
const profile=[...unique.values()];geometry.dispose();
const soleZ=Math.max(...profile.filter(([y])=>y===-2).map(([,z])=>z));
export const WALK=Object.freeze({period:1.2,angle:.05,lift:.045,soleZ});
export const READABLE_WALK=Object.freeze({...WALK,angle:.10,lift:.05,armGain:1.8});
function soleCenterZ(a){return -2*Math.sin(a)+Math.sign(a)*soleZ*(Math.cos(a)-1);}
const start=soleCenterZ(-WALK.angle);
export const WALK_STEP=2*start;
function smooth(x){return x*x*(3-2*x);}
function lowest(a){const c=Math.cos(a),s=Math.sin(a);let min=Infinity;for(const [y,z] of profile)min=Math.min(min,y*c-z*s);return min;}

export function sampleWalk(t,s,gait='baseline'){
 const config=gait==='readable'?READABLE_WALK:WALK;
 const origin=gait==='readable'?soleCenterZ(-config.angle):start;
 const step=gait==='readable'?2*origin:WALK_STEP;
 const halfTime=config.period/2,half=Math.floor(t/halfTime),u=(t%halfTime)/halfTime;
 // Zero velocity at heel/toe handoff avoids a vertical cusp on rigid soles.
 const x=2*u-1,a=config.angle*Math.sign(x)*smooth(Math.abs(x));
 const leftSupport=half%2===0,stance=leftSupport?'left':'right',swing=leftSupport?'right':'left';
 const rootZ=half*step+origin-soleCenterZ(a),rootY=-2-lowest(a);
 const lift=config.lift*Math.sin(Math.PI*u)**2;
 s.action='walk';s.root.position=[0,rootY,rootZ];
 s.pivots[`${stance}Hip`][0]=a;s.pivots[`${swing}Hip`][0]=-a;
 s.pivots.leftShoulder[0]=-s.pivots.leftHip[0]*(config.armGain??1.4);
 s.pivots.rightShoulder[0]=-s.pivots.rightHip[0]*(config.armGain??1.4);
 s.offsets={[`${swing}Hip`]:[0,lift,0]};
 const edge=a<0?'rear':'front',edgeSign=a<0?-1:1;
 const z=half*step+origin+edgeSign*soleZ;
 s.contacts={support:[`${stance}Leg`],halfStep:half,phase:u,edge,
  // A material point on each fixed bottom edge; never track a moving minimum
  // and call that zero slip. Flat-foot handoff changes edge, not the anchor.
  localPoint:[0,-2,edgeSign*soleZ],anchors:[[leftSupport?-.5:.5,0,z]],
  interval:[half*halfTime+(edge==='rear'?0:halfTime/2),half*halfTime+(edge==='rear'?halfTime/2:halfTime)],
  swing:`${swing}Leg`,swingClearance:rootY+2+lift+lowest(-a),
  handoff:'rear-to-front at flat foot; support-foot swap every half cycle'};
 return s;
}
