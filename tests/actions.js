import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createBaseAvatar} from '../avatar/baseAvatar.js';
import {applyPose} from '../avatar/poses.js';
import {applyFace} from '../appearance/faces.js';
import {applyAppearance} from '../appearance/appearance.js';
import {sampleAction,sampleTransition,applyActionSample} from '../avatar/actions.js';
const a=createBaseAvatar(),b=createBaseAvatar(),refs=[a.root,...Object.values(a.parts),...Object.values(a.pivots)];
const flat=s=>Object.values(s.pivots).flat();
const near=(a,b,e=1e-9)=>a.forEach((v,i)=>assert(Math.abs(v-b[i])<e,`${v} != ${b[i]}`));
const req=(action,time)=>({action,time});
for(const direction of ['left','right'])for(const action of ['idle','look_react']){
 const expected=sampleAction(action,.7,{direction});
 for(const t of [0,1000000,.2,3,1.6,.01])applyActionSample(b,sampleAction(action,t,{direction}));
 assert.deepEqual(sampleAction(action,.7,{direction}),expected);
 for(const face of ['blank','classic_smile','worried'])for(const cosmetic of [null,'cap']){
  applyFace(a,face);applyAppearance(a,{cosmetic,color:0xaabbcc});const layer=a.faceLayer,cap=a.cosmetic;
  for(let frame=0;frame<=180;frame++){
   const s=sampleAction(action,frame/60,{direction});applyActionSample(a,s);a.root.updateMatrixWorld(true);
   for(const name of ['leftLeg','rightLeg']){const box=new THREE.Box3().setFromObject(a.parts[name]);assert(Math.abs(box.min.y)<1e-7);const center=box.getCenter(new THREE.Vector3());assert(Math.abs(center.z)<1e-7);}
   assert.equal(a.faceLayer,layer);assert.equal(a.cosmetic,cap);
   if(frame%2===0)assert.deepEqual(s,sampleAction(action,(frame/2)/30,{direction}));
  }
 }
}
near(flat(sampleAction('idle',0)),flat(sampleAction('idle',3)));
const eps=1e-5;
near(flat(sampleAction('idle',eps)).map(v=>v/eps),flat(sampleAction('idle',3-eps)).map(v=>-v/eps),1e-5);
assert.deepEqual(sampleAction('look_react',1.6),sampleAction('look_react',100));
for(const from of ['idle','look_react'])for(const to of ['idle','look_react']){
 const source=req(from,.7),target=req(to,.3);
 near(flat(sampleTransition(source,target,0)),flat(sampleAction(from,.7)));
 near(flat(sampleTransition(source,target,.25)),flat(sampleAction(to,.3)));
 near(flat(sampleTransition(source,target,0,0)),flat(sampleAction(to,.3)));
 for(let i=0;i<=30;i++){
  const t=i/120;const s=sampleTransition(req(from,.7+t),req(to,.3+t),t);
  applyActionSample(a,s);assert.deepEqual(s,sampleTransition(req(from,.7+t),req(to,.3+t),t));
 }
 const start=flat(sampleTransition(req(from,.7+eps),req(to,.3+eps),eps));
 const base=flat(sampleAction(from,.7));
 const derivative=flat(sampleAction(from,.7+eps)).map((v,i)=>(v-base[i])/eps);
 near(start.map((v,i)=>(v-base[i])/eps),derivative,.001);
}
applyPose(a,'walk_demo',.25);applyActionSample(a,sampleAction('idle',0));for(const p of Object.values(a.pivots))assert(Math.abs(p.rotation.x)<1e-12);
applyActionSample(a,sampleAction('idle',.4),{position:[2,0,3],yaw:.2});assert.deepEqual(a.root.position.toArray(),[2,0,3]);applyActionSample(a,sampleAction('idle',.4));assert.deepEqual(a.root.position.toArray(),[0,0,0]);
const before=a.root.toJSON();
for(const call of [()=>sampleAction('walk',0),()=>sampleAction('idle',-1),()=>sampleAction('idle',NaN),()=>sampleAction('idle',0,{direction:'bad'}),()=>sampleTransition(req('idle',0),req('idle',0),0,-1),()=>applyActionSample(a,{})])assert.throws(call);
assert.deepEqual(a.root.toJSON(),before);assert.deepEqual([a.root,...Object.values(a.parts),...Object.values(a.pivots)],refs);
console.log('PASS F2A: deterministic shuffled sampling, 30/60fps, idle seam/velocity, reaction clamp, four transition pairs/endpoints, planted geometry, appearance/identity, reset and atomic validation');
// Velocity continuity at every reaction segment and both blend boundaries.
for(const t of [.2,.65,1,1.6]){
 const c=flat(sampleAction('look_react',t));
 const left=flat(sampleAction('look_react',t-eps)).map((v,i)=>(c[i]-v)/eps);
 const right=flat(sampleAction('look_react',t+eps)).map((v,i)=>(v-c[i])/eps);
 near(left,right,.001);
}
for(const from of ['idle','look_react'])for(const to of ['idle','look_react']){
 const end=flat(sampleTransition(req(from,.95),req(to,.55),.25));
 const prev=flat(sampleTransition(req(from,.95-eps),req(to,.55-eps),.25-eps));
 const after=flat(sampleAction(to,.55+eps));
 near(end.map((v,i)=>(v-prev[i])/eps),after.map((v,i)=>(v-end[i])/eps),.001);
 const snapshot=sampleTransition(req(from,.7),req(to,.3),.1);
 near(flat(sampleTransition({sample:snapshot},req(from,0),0)),flat(snapshot));
}
for(const invalid of [-1,NaN,Infinity]){
 assert.throws(()=>sampleTransition(req('idle',0),req('idle',0),0,invalid));
 assert.throws(()=>sampleAction('idle',invalid));
}
console.log('PASS F2A: segment/transition velocity continuity and interruption snapshots');
