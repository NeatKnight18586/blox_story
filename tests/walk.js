import assert from 'node:assert/strict';
import {Vector3} from 'three';
import {writeFileSync} from 'node:fs';
import {createBaseAvatar} from '../avatar/baseAvatar.js';
import {sampleAction,sampleTransition,applyActionSample} from '../avatar/actions.js';
import {applyFace} from '../appearance/faces.js';
import {applyAppearance} from '../appearance/appearance.js';
import {applyPose} from '../avatar/poses.js';
import {WALK,WALK_STEP} from '../avatar/walk.js';
const a=createBaseAvatar(),refs=[a.root,...Object.values(a.pivots),...Object.values(a.parts)];
const point=new Vector3();
const stats={maxFootDrift:0,rmsFootDrift:0,maxPenetration:0,rmsPenetration:0,maxGroundContactError:0,rmsGroundContactError:0,minSwingClearance:Infinity,maxSwingClearance:0,maxHipCorrection:0};
let count=0,driftSquares=0,penetrationSquares=0,contactSquares=0;
// Measurement from actual mesh vertices and a fixed material point on each
// declared edge, independent of the sampler's predicted clearance.
export function measure(avatar,s){
 avatar.root.updateMatrixWorld(true);let minY=Infinity,stanceMin=Infinity,swingMin=Infinity;
 for(const [name,mesh] of Object.entries(avatar.parts)){
  const attr=mesh.geometry.attributes.position;let bottom=Infinity;
  for(let i=0;i<attr.count;i++){point.fromBufferAttribute(attr,i).applyMatrix4(mesh.matrixWorld);bottom=Math.min(bottom,point.y);}
  minY=Math.min(minY,bottom);if(name===s.contacts.support[0])stanceMin=bottom;if(name===s.contacts.swing)swingMin=bottom;
 }
 const hip=avatar.pivots[s.contacts.support[0]==='leftLeg'?'leftHip':'rightHip'];
 const contact=new Vector3(...s.contacts.localPoint).applyMatrix4(hip.matrixWorld),anchor=new Vector3(...s.contacts.anchors[0]);
 return {drift:Math.hypot(contact.x-anchor.x,contact.z-anchor.z),penetration:Math.max(0,-minY),contactError:Math.max(Math.abs(stanceMin),Math.abs(contact.y)),swingClearance:swingMin,contact:contact.toArray()};
}
const anchorByInterval=new Map();
for(const fps of [30,60])for(let frame=0;frame<=fps*4.8;frame++){
 const t=frame/fps,s=sampleAction('walk',t);applyActionSample(a,s);const m=measure(a,s);
 assert(m.drift<=.03&&m.penetration<=.01&&m.contactError<=.02,JSON.stringify(m));assert(m.swingClearance>=-1e-7);
 const key=`${s.contacts.halfStep}-${s.contacts.edge}`;
 if(anchorByInterval.has(key))assert.deepEqual(s.contacts.anchors,anchorByInterval.get(key));else anchorByInterval.set(key,s.contacts.anchors);
 if(frame%2===0&&fps===60)assert.deepEqual(s,sampleAction('walk',(frame/2)/30));
 assert.equal(Math.sign(s.pivots.leftShoulder[0]),Math.sign(-s.pivots.leftHip[0]));
 const correction=Math.max(...Object.values(s.offsets).map(v=>v[1]));assert(correction<=.05);
 stats.maxFootDrift=Math.max(stats.maxFootDrift,m.drift);stats.maxPenetration=Math.max(stats.maxPenetration,m.penetration);stats.maxGroundContactError=Math.max(stats.maxGroundContactError,m.contactError);stats.minSwingClearance=Math.min(stats.minSwingClearance,m.swingClearance);stats.maxSwingClearance=Math.max(stats.maxSwingClearance,m.swingClearance);stats.maxHipCorrection=Math.max(stats.maxHipCorrection,correction);
 driftSquares+=m.drift**2;penetrationSquares+=m.penetration**2;contactSquares+=m.contactError**2;count++;
}
for(const face of ['blank','classic_smile','worried'])for(const cosmetic of [null,'cap']){
 applyFace(a,face);applyAppearance(a,{cosmetic});const layer=a.faceLayer,cap=a.cosmetic;
 const expected=sampleAction('walk',.45);for(const t of [1e6,.6,2.4,.1,0,.45]){const s=sampleAction('walk',t);applyActionSample(a,s);}
 assert.deepEqual(sampleAction('walk',.45),expected);assert.equal(a.faceLayer,layer);assert.equal(a.cosmetic,cap);
}
for(const boundary of [0,.3,.6,.9,1.2,2.4]){
 const e=1e-6,b=sampleAction('walk',boundary),after=sampleAction('walk',boundary+e);
 if(boundary>0){const before=sampleAction('walk',boundary-e);for(const k of ['leftHip','rightHip'])assert(Math.abs(before.pivots[k][0]-after.pivots[k][0])<1e-6);assert(Math.abs(before.root.position[2]-after.root.position[2])<1e-6);}
 assert(Math.abs(b.root.position[1]-after.root.position[1])<1e-6);
}
const pose0=sampleAction('walk',.123),pose1=sampleAction('walk',1.323);assert(Math.abs(pose1.root.position[2]-pose0.root.position[2]-2*WALK_STEP)<1e-12);
applyActionSample(a,sampleAction('walk',.4),{position:[2,0,3],yaw:Math.PI/2});assert(Math.abs(a.root.position.x-(2+sampleAction('walk',.4).root.position[2]))<1e-9);
applyActionSample(a,sampleAction('idle',0));for(const [n,p] of Object.entries(a.pivots))assert.deepEqual(p.position.toArray(),a.restPositions[n]);assert.deepEqual(a.root.position.toArray(),[0,0,0]);
applyActionSample(a,sampleAction('walk',.3));applyPose(a,'neutral');for(const [n,p] of Object.entries(a.pivots))assert.deepEqual(p.position.toArray(),a.restPositions[n]);
assert.deepEqual([a.root,...Object.values(a.pivots),...Object.values(a.parts)],refs);
assert.throws(()=>sampleTransition({action:'walk',time:0},{action:'idle',time:0},.1));
assert.throws(()=>sampleTransition({action:'idle',time:0},{action:'walk',time:0},.1));
stats.rmsFootDrift=Math.sqrt(driftSquares/count);stats.rmsPenetration=Math.sqrt(penetrationSquares/count);stats.rmsGroundContactError=Math.sqrt(contactSquares/count);
writeFileSync('evidence/f2b1/api-metrics.json',JSON.stringify({fps:[30,60],duration:4.8,samples:count,constants:{...WALK,step:WALK_STEP},metrics:stats},null,2)+'\n');
console.log('PASS F2B1 real geometry:',stats);
// Check forward monotonicity and zero-velocity support/edge joins independently.
let previous=-Infinity;
for(let i=0;i<=1200;i++){const z=sampleAction('walk',i/500).root.position[2];assert(z>=previous-1e-12);previous=z;}
for(const t of [.3,.6,.9,1.2,2.4]){
 const e=1e-5,center=sampleAction('walk',t),before=sampleAction('walk',t-e),after=sampleAction('walk',t+e);
 for(let axis=1;axis<=2;axis++){const v0=(center.root.position[axis]-before.root.position[axis])/e,v1=(after.root.position[axis]-center.root.position[axis])/e;assert(Math.abs(v1-v0)<.001);}
}
console.log('PASS F2B1: monotonic root movement and support/edge velocity joins');
