// Bounded names100 directing pass. All onsets are provisional written-cue frames
// until the original WAV is accessible. No new rig or general action engine.
import {ease} from './ending-cues.js';
import {applyActionSample,sampleAction} from '../avatar/actions.js';
const ramp=(g,a,b)=>ease((g-a)/(b-a));
export const greeting=(g,a,b,c,d)=>ramp(g,a,b)*(1-ramp(g,c,d));
export function applyShyPerformance(g,eli,neighbor){
 if(g<320)return;
 // Discard the baseline's tiny cumulative-looking gesture, not the base action.
 const contact=greeting(g,325,344,357,382),wave=greeting(g,405,427,441,472);
 eli.pivots.head.rotation.set(.04+.15*ramp(g,357,382),-.35+.85*contact,0);
 eli.pivots.leftShoulder.rotation.set(0,0,0);
 eli.pivots.rightShoulder.rotation.set(-1.25*wave,0,.5*wave);
 neighbor.pivots.head.rotation.set(.06,-.12,0);
 neighbor.pivots.rightShoulder.rotation.set(-.16,0,.12);
}
export function applyEndingPerformance(g,eli,mara,residents){
 if(g<1296)return;
 const [parent,child]=residents;
 // Existing readable gait, scaled root travel for the existing small proxy.
 // Finish on a gait handoff before the reunion cut; no walking transition API.
 const walkTime=Math.min((g-1296)/30,2.4),walk=sampleAction('walk',walkTime,{gait:'readable'});
 applyActionSample(child,g<1371?walk:sampleAction('idle',0),{position:[6.3,0,-1.8],yaw:-Math.PI/2});
 const finish=sampleAction('walk',2.4,{gait:'readable'}).root.position;
 child.root.position.set(6.3-(g<1371?walk.root.position[2]:finish[2])*.58,(g<1371?walk.root.position[1]:0)*.58,-1.8);
 const meet=ramp(g,1371,1382),touch=ramp(g,1380,1396);
 parent.pivots.head.rotation.set(.1+.19*meet,.25+.4*meet,0);
 parent.pivots.rightShoulder.rotation.set(-.08-.12*touch,0,.12+.24*touch);
 child.pivots.head.rotation.set(-.12-.16*meet,.45*meet,0);
 if(g>=1371)child.pivots.leftShoulder.rotation.set(-.12*touch,0,-.18*touch);
 // Mara's recognition occurs before the existing shot-local approach.
 if(g>=1406&&g<1490)mara.pivots.head.rotation.set(.05,.22*(1-ramp(g,1406,1420)),0);
 if(g<1490)return;
 // Hold the greeting across zero and the cut, then withdraw after no response.
 const wave=ramp(g,1493,1517)*(1-ramp(g,1580,1622));
 eli.pivots.rightShoulder.rotation.set(-1.25*wave,0,.5*wave);
 eli.root.rotation.y=2.8-1.4*ramp(g,1580,1622);
 eli.pivots.head.rotation.set(.03+.22*ramp(g,1580,1634),-.04-.51*ramp(g,1580,1622),0);
 // She looks past Eli, then back to the connected family, without acknowledgment.
 const pass=ramp(g,1546,1562),away=ramp(g,1562,1590);
 mara.root.rotation.y=-.36+1.16*away;
 mara.pivots.head.rotation.set(.02,-.2*pass*(1-away),0);
}
