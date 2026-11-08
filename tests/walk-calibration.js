import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync,writeFileSync} from 'node:fs';
import {Vector3} from 'three';
import {createBaseAvatar} from '../avatar/baseAvatar.js';
import {sampleAction,applyActionSample,sampleTransition} from '../avatar/actions.js';
import {applyFace} from '../appearance/faces.js';
import {applyAppearance} from '../appearance/appearance.js';
const baseline=Array.from({length:145},(_,i)=>sampleAction('walk',i/60));
assert.equal(createHash('sha256').update(JSON.stringify(baseline)).digest('hex'),readFileSync('tests/walk-baseline.sha256','utf8').trim(),'merged baseline must remain bit-identical');
const avatar=createBaseAvatar(),refs=[avatar.root,...Object.values(avatar.parts),...Object.values(avatar.pivots)],p=new Vector3(),local=new Vector3();
const results={};
for(const gait of ['baseline','readable']){
 const stats={maxFootDrift:0,rmsFootDrift:0,maxPatchDrift:0,rmsPatchDrift:0,maxPenetration:0,rmsPenetration:0,maxContactError:0,rmsContactError:0,minSwingClearance:Infinity,maxSwingClearance:0,maxJointOverlap:0,maxLegSeparation:0,maxArmSeparation:0,maxRootRise:0};let count=0,ds=0,ls=0,ps=0,cs=0;
 const intervals=new Map();
 for(const fps of [30,60])for(let i=0;i<=4.8*fps;i++){
  const t=i/fps,s=sampleAction('walk',t,{gait});applyActionSample(avatar,s);avatar.root.updateMatrixWorld(true);
  let min=Infinity,supportMin=Infinity,swingMin=Infinity,patchZ=0,patchCount=0;
  for(const [name,mesh] of Object.entries(avatar.parts)){
   const attr=mesh.geometry.attributes.position;let bottom=Infinity;
   for(let j=0;j<attr.count;j++){
    p.fromBufferAttribute(attr,j).applyMatrix4(mesh.matrixWorld);min=Math.min(min,p.y);bottom=Math.min(bottom,p.y);
    if(name.endsWith('Leg')){
     local.copy(p);avatar.parts.torso.worldToLocal(local);
     const q=[Math.abs(local.x)-.98,Math.abs(local.y)-.98,Math.abs(local.z)-.48];
     const sdf=Math.hypot(...q.map(v=>Math.max(0,v)))+Math.min(Math.max(...q),0)-.02;
     if(sdf< -1e-7)stats.maxJointOverlap=Math.max(stats.maxJointOverlap,local.y+1);
    }
   }
   if(name===s.contacts.support[0]){
    supportMin=bottom;
    for(let j=0;j<attr.count;j++){p.fromBufferAttribute(attr,j).applyMatrix4(mesh.matrixWorld);if(Math.abs(p.y-bottom)<1e-8){patchZ+=p.z;patchCount++;}}
   }
   if(name===s.contacts.swing)swingMin=bottom;
  }
  const hip=avatar.pivots[s.contacts.support[0]==='leftLeg'?'leftHip':'rightHip'];
  p.fromArray(s.contacts.localPoint).applyMatrix4(hip.matrixWorld);const anchor=s.contacts.anchors[0];
  const drift=Math.hypot(p.x-anchor[0],p.z-anchor[2]),penetration=Math.max(0,-min),contactError=Math.max(Math.abs(p.y),Math.abs(supportMin));
  // At the exactly flat sole, both edges are in contact; choose the declared
  // edge rather than falsely averaging heel and toe into a moving anchor.
  const patchDrift=Math.abs(s.pivots[hip.name][0])<1e-10?drift:Math.abs(patchZ/patchCount-anchor[2]);
  assert(drift<=.03&&patchDrift<=.03&&penetration<=.01&&contactError<=.02&&swingMin>=-1e-7);
  const key=`${s.contacts.halfStep}:${s.contacts.edge}`;if(intervals.has(key))assert.deepEqual(s.contacts.anchors,intervals.get(key));else intervals.set(key,s.contacts.anchors);
  stats.maxFootDrift=Math.max(stats.maxFootDrift,drift);stats.maxPatchDrift=Math.max(stats.maxPatchDrift,patchDrift);stats.maxPenetration=Math.max(stats.maxPenetration,penetration);stats.maxContactError=Math.max(stats.maxContactError,contactError);stats.minSwingClearance=Math.min(stats.minSwingClearance,swingMin);stats.maxSwingClearance=Math.max(stats.maxSwingClearance,swingMin);stats.maxRootRise=Math.max(stats.maxRootRise,s.root.position[1]);
  stats.maxLegSeparation=Math.max(stats.maxLegSeparation,4*Math.abs(Math.sin(s.pivots.leftHip[0])));
  stats.maxArmSeparation=Math.max(stats.maxArmSeparation,3.98*Math.abs(Math.sin(s.pivots.leftShoulder[0])));
  ds+=drift**2;ls+=patchDrift**2;ps+=penetration**2;cs+=contactError**2;count++;
  if(fps===60&&i%2===0)assert.deepEqual(s,sampleAction('walk',(i/2)/30,{gait}));
 }
 assert(stats.maxJointOverlap<=.05,'joint overlap must remain local');
 stats.rmsFootDrift=Math.sqrt(ds/count);stats.rmsPatchDrift=Math.sqrt(ls/count);stats.rmsPenetration=Math.sqrt(ps/count);stats.rmsContactError=Math.sqrt(cs/count);results[gait]={samples:count,metrics:stats};
 for(const face of ['blank','classic_smile','worried'])for(const cosmetic of [null,'cap']){
  applyFace(avatar,face);applyAppearance(avatar,{cosmetic});const layer=avatar.faceLayer,cap=avatar.cosmetic;
  const expected=sampleAction('walk',.77,{gait});for(const t of [1e6,2.4,.6,0,.77])applyActionSample(avatar,sampleAction('walk',t,{gait}));assert.deepEqual(sampleAction('walk',.77,{gait}),expected);assert.equal(avatar.faceLayer,layer);assert.equal(avatar.cosmetic,cap);
 }
 for(const t of [.3,.6,.9,1.2,2.4]){
  const eps=1e-6,a=sampleAction('walk',t-eps,{gait}),b=sampleAction('walk',t,{gait}),c=sampleAction('walk',t+eps,{gait});
  for(let axis=1;axis<=2;axis++)assert(Math.abs((b.root.position[axis]-a.root.position[axis])/eps-(c.root.position[axis]-b.root.position[axis])/eps)<.001);
 }
 assert.throws(()=>sampleTransition({action:'walk',time:0,options:{gait}},{action:'idle',time:0},.1));
}
assert.deepEqual([avatar.root,...Object.values(avatar.parts),...Object.values(avatar.pivots)],refs);
assert.throws(()=>sampleAction('walk',0,{gait:'bad'}));assert.throws(()=>sampleAction('idle',0,{gait:'readable'}));
assert(results.readable.metrics.maxLegSeparation>results.baseline.metrics.maxLegSeparation*1.9);
writeFileSync('evidence/calibration/api-metrics.json',JSON.stringify({fps:[30,60],duration:4.8,baselineHash:readFileSync('tests/walk-baseline.sha256','utf8').trim(),results},null,2)+'\n');console.log('PASS calibration',results);
