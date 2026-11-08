import assert from 'node:assert/strict';
import {Vector3} from 'three';
import {readFile} from 'node:fs/promises';
import {compileShotList,sampleShotList} from '../production/timeline.js';
import {createBaseAvatar} from '../avatar/baseAvatar.js';
import {applyActionSample,sampleAction} from '../avatar/actions.js';
import {applyShyPerformance,applyEndingPerformance} from '../production/performance.js';
const plans={};
for(const kind of ['shy','ending']){
 const baseline=JSON.parse(await readFile(`stories/names100/s2-${kind}.json`));
 const current=JSON.parse(await readFile(`stories/names100/s3b-${kind}.json`));
 assert.deepEqual(current.cast,baseline.cast);assert.deepEqual(current.shots.map(s=>[s.id,s.start,s.end]),baseline.shots.map(s=>[s.id,s.start,s.end]));
 const a=compileShotList(baseline),b=compileShotList(current);plans[kind]=b;
 for(let f=0;f<a.frameCount;f++){
  const old=sampleShotList(a,f),now=sampleShotList(b,f);
  assert.deepEqual(now.opening??now.ending,old.opening??old.ending,'All protected cue values and native timestamps unchanged');
  if((kind==='shy'&&f<61)||(kind==='ending'&&f<351))assert.deepEqual(now,old,'Outside selected scenes must stay unchanged');
 }
 const bad=structuredClone(current);bad[kind==='shy'?'opening':'ending'].visuals='unknown';assert.throws(()=>compileShotList(bad));
}
// Actual Three.js transforms: stateless seeking and smooth gesture/root motion,
// without rendering hundreds of unneeded images. Both target endpoints included.
const eli=createBaseAvatar(),other=createBaseAvatar(),residents=[createBaseAvatar(),createBaseAvatar()];residents[1].root.scale.setScalar(.58);
const all=[eli,other,...residents],refs=all.flatMap(a=>[...Object.values(a.parts),...Object.values(a.pivots)]);
function at(g){
 const p=plans[g<482?'shy':'ending'],s=sampleShotList(p,g-(g<482?259:945));
 const actors=[eli,other];Object.values(s.actors).forEach((v,i)=>applyActionSample(actors[i],v.action,v.origin));
 if(g<482)applyShyPerformance(g,eli,other);else applyEndingPerformance(g,eli,other,residents);
 return (g<482?[eli,other]:all).flatMap(a=>[...a.root.position,...a.root.rotation.toArray().slice(0,3),...Object.values(a.pivots).flatMap(p=>[...p.position,...p.rotation.toArray().slice(0,3)])]);
}
const sequences=[[320,482],[1296,1641]],samples=new Map();let maxAdjacentDelta=0;
const cuts=new Set([398,1371,1406,1450,1490,1546]);
for(const [start,end] of sequences){let previous;
 for(let g=start;g<end;g++){const pose=at(g);assert(pose.every(Number.isFinite));if(previous&&!cuts.has(g))maxAdjacentDelta=Math.max(maxAdjacentDelta,...pose.map((v,i)=>Math.abs(v-previous[i])));samples.set(g,pose);previous=pose;}
}
for(const g of [...samples.keys()].sort((a,b)=>(a*37%509)-(b*37%509)))assert.deepEqual(at(g),samples.get(g),'Random access must reset every modified transform');
assert.deepEqual(all.flatMap(a=>[...Object.values(a.parts),...Object.values(a.pivots)]),refs);
assert(maxAdjacentDelta<.15,`Sudden within-shot jump ${maxAdjacentDelta}`);
// This gesture must not swivel or translate the planted legs during S22/S23.
let planted;for(let g=1490;g<1641;g++){at(g);eli.root.updateMatrixWorld(true);const feet=['leftLeg','rightLeg'].flatMap(n=>eli.parts[n].matrixWorld.toArray());if(!planted)planted=feet;assert.deepEqual(feet,planted,'Final reaction keeps both planted legs fixed');}
let maxChildSupportError=0;const point=new Vector3();
for(let g=1296;g<1371;g++){
 at(g);const child=residents[1];child.root.updateMatrixWorld(true);let lowest=Infinity;
 for(const name of ['leftLeg','rightLeg']){const m=child.parts[name],p=m.geometry.attributes.position;for(let i=0;i<p.count;i++){point.fromBufferAttribute(p,i).applyMatrix4(m.matrixWorld);lowest=Math.min(lowest,point.y);}}
 maxChildSupportError=Math.max(maxChildSupportError,Math.abs(lowest));
}
assert(maxChildSupportError<1e-6,'Scaled proxy must retain actual-vertex ground contact');
console.log('PASS scaled child readable gait support, all75 approach frames, max actual-vertex contact error',maxChildSupportError);
console.log('PASS S3B provisional source: original casts/cuts/cues, unchanged non-target scenes, actual Three.js pose identity/random access, max within-shot scalar delta',maxAdjacentDelta);
