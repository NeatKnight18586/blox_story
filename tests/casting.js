import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import * as THREE from 'three';
import {createBaseAvatar} from '../avatar/baseAvatar.js';
import {sampleAction,applyActionSample} from '../avatar/actions.js';
import {applyAppearance} from '../appearance/appearance.js';
import {applyFace} from '../appearance/faces.js';
import {compileShotList,sampleShotList} from '../production/timeline.js';
import {worldPosition} from '../production/shots.js';
const input=JSON.parse(await readFile('production/reassurance.json')),unchanged=structuredClone(input),plan=compileShotList(input);
assert.deepEqual(input,unchanged);assert.equal(plan.frameCount,360);assert.equal(plan.cast.length,2);
const sample=frame=>sampleShotList(plan,frame);
for(const frame of [0,71,72,143,144,215,216,287,288,359]){const expected=sample(frame);for(const other of [359,0,150,90])sample(other);assert.deepEqual(sample(frame),expected);assert.deepEqual(expected.camera,plan.shots.find(s=>frame>=s.start&&frame<s.end).camera);}
assert.notDeepEqual(sample(80).actors.ren.action,sample(80).actors.sol.action);assert.equal(sample(80).actors.sol.face,'worried');assert.equal(sample(230).actors.sol.face,'classic_smile');
for(const mutate of [d=>d.cast.push(d.cast[0]),d=>d.cast[1].id='ren',d=>d.cast[1].torsoVariant='other',d=>d.cast[1].face='other',d=>d.shots[0].actors.pop(),d=>d.shots[0].actors[1].id='ren',d=>d.shots[0].actors[1].action.timeOffset=-1,d=>d.shots[0].actors[1].origin.position[1]=1,d=>d.cast[1].appearance.hair='other',d=>d.cast[1].appearance.cosmetic='cap',d=>d.cast[1].appearance.clothing='other',d=>d.shots[0].camera.subjects=['sol','sol'],d=>d.shots[0].camera.subjects=['ren','missing'],d=>d.shots[2].camera.foreground='ren',d=>d.shots[0].camera.extra=true,d=>d.shots[1].actors[0].originFromEndOf='missing']){const bad=structuredClone(input);mutate(bad);assert.throws(()=>compileShotList(bad));}
const gated=structuredClone(input);gated.props=[{id:'light',kind:'light-chest',position:[-2.1,1.61,.7]}];gated.events=[{id:'open',target:'light',actor:'ren',channel:'open',start:5,end:20,from:0,to:1,proximityRadius:1}];assert.equal(sampleShotList(compileShotList(gated),20).propStates.light.open,1);delete gated.events[0].actor;assert.throws(()=>compileShotList(gated),/actor ID/);
const reordered=structuredClone(input);reordered.shots.forEach(s=>s.actors.reverse());assert.deepEqual(sampleShotList(compileShotList(reordered),90),sample(90));
const linked=structuredClone(input);delete linked.shots[1].actors[0].origin;linked.shots[1].actors[0].originFromEndOf=linked.shots[0].id;assert.deepEqual(sampleShotList(compileShotList(linked),72).actors.ren.origin,sample(0).actors.ren.origin);
const avatars=Object.fromEntries(plan.cast.map(def=>[def.id,createBaseAvatar({torsoVariant:def.torsoVariant})]));assert.notEqual(avatars.ren.root,avatars.sol.root);assert.equal(createBaseAvatar().torsoVariant,'classic');assert.throws(()=>createBaseAvatar({torsoVariant:'other'}));
const refs=a=>[a.root,...Object.values(a.parts),...Object.values(a.pivots),...Object.values(a.parts).map(m=>m.geometry)];const original=Object.values(avatars).flatMap(refs);
for(const [id,a] of Object.entries(avatars)){assert.equal(Object.keys(a.parts).length,6);assert.deepEqual(a.restPositions,createBaseAvatar().restPositions);applyAppearance(a,plan.cast.find(c=>c.id===id).appearance);applyFace(a,'classic_smile');}
const torso=avatars.sol.parts.torso.geometry;torso.computeBoundingBox();const size=torso.boundingBox.getSize(new THREE.Vector3());for(const [i,v] of size.toArray().entries())assert(Math.abs(v-[2,2,1][i])<1e-6);let waist=0;const pos=torso.attributes.position;for(let i=0;i<pos.count;i++)if(Math.abs(pos.getY(i))<.001)waist=Math.max(waist,Math.abs(pos.getX(i))*2);assert(waist>1.48&&waist<1.52);assert(torso.attributes.normal.array.every(Number.isFinite));
const hair=avatars.sol.hairLayer,vest=avatars.sol.clothingLayer,otherColor=avatars.ren.parts.head.material.color.clone();applyAppearance(avatars.sol,{color:0x777777});assert.equal(hair.parent,null);assert.equal(vest.parent,null);assert(avatars.ren.parts.head.material.color.equals(otherColor));applyAppearance(avatars.sol,plan.cast[1].appearance);assert.equal(avatars.sol.hairLayer,hair);assert.equal(avatars.sol.clothingLayer,vest);
for(const torsoVariant of ['classic','tapered']){const a=createBaseAvatar({torsoVariant}),body=refs(a);for(const face of ['blank','classic_smile','worried'])for(const wardrobe of [{},{cosmetic:'cap',clothing:'vest'},{hair:'bob',clothing:'vest'}]){applyFace(a,face);applyAppearance(a,wardrobe);applyActionSample(a,sampleAction('look_react',.7));assert.deepEqual(refs(a),body);}const before=a.parts.head.material.color.getHex();assert.throws(()=>applyAppearance(a,{color:0xff0000,hair:'invalid'}));assert.equal(a.parts.head.material.color.getHex(),before);}
const extrema={minActorAabbGap:Infinity,maxPenetration:0};
for(let frame=0;frame<360;frame++){
 const state=sample(frame);for(const [id,s] of Object.entries(state.actors)){const a=avatars[id];applyActionSample(a,s.action,s.origin);applyAppearance(a,s.appearance);applyFace(a,s.face);a.root.updateMatrixWorld(true);}
 const boxes=Object.values(avatars).map(a=>new THREE.Box3().setFromObject(a.root,true));extrema.minActorAabbGap=Math.min(extrema.minActorAabbGap,boxes[1].min.x-boxes[0].max.x);extrema.maxPenetration=Math.max(extrema.maxPenetration,...boxes.map(b=>Math.max(0,-b.min.y)));assert(extrema.minActorAabbGap>.1);assert(extrema.maxPenetration<=.01);assert.deepEqual(Object.values(avatars).flatMap(refs),original);
}
const metrics={};const point=new THREE.Vector3(),origin={position:[1.2,0,-.7],yaw:.5};
for(const torsoVariant of ['classic','tapered'])for(const gait of ['baseline','readable']){
 const a=createBaseAvatar({torsoVariant}),m={maxDrift:0,rmsDrift:0,maxPenetration:0,rmsPenetration:0,maxContactError:0,rmsContactError:0,maxSwingClearance:0,samples:0};let ds=0,ps=0,cs=0;
 for(const fps of [30,60])for(let i=0;i<=fps*4.8;i++){
  const s=sampleAction('walk',i/fps,{gait});applyActionSample(a,s,origin);a.root.updateMatrixWorld(true);let min=Infinity,sole=Infinity,swing=Infinity;
  for(const [name,mesh] of Object.entries(a.parts)){let bottom=Infinity;const vertices=mesh.geometry.attributes.position;for(let j=0;j<vertices.count;j++){point.fromBufferAttribute(vertices,j).applyMatrix4(mesh.matrixWorld);bottom=Math.min(bottom,point.y);}min=Math.min(min,bottom);if(name===s.contacts.support[0])sole=bottom;if(name===s.contacts.swing)swing=bottom;}
  point.fromArray(s.contacts.localPoint).applyMatrix4(a.pivots[s.contacts.support[0]==='leftLeg'?'leftHip':'rightHip'].matrixWorld);const anchor=worldPosition(s.contacts.anchors[0],origin),drift=Math.hypot(point.x-anchor[0],point.z-anchor[2]),penetration=Math.max(0,-min),contact=Math.max(Math.abs(point.y),Math.abs(sole));assert(drift<=.03&&penetration<=.01&&contact<=.02&&swing>=-1e-7);m.samples++;ds+=drift**2;ps+=penetration**2;cs+=contact**2;m.maxDrift=Math.max(m.maxDrift,drift);m.maxPenetration=Math.max(m.maxPenetration,penetration);m.maxContactError=Math.max(m.maxContactError,contact);m.maxSwingClearance=Math.max(m.maxSwingClearance,swing);
 }
 m.rmsDrift=Math.sqrt(ds/m.samples);m.rmsPenetration=Math.sqrt(ps/m.samples);m.rmsContactError=Math.sqrt(cs/m.samples);metrics[`${torsoVariant}-${gait}`]=m;
}
const report={status:'PASS',independentIds:true,baseMeshes:6,pivots:5,classicDefault:true,torsoProfile:{envelope:size.toArray(),waistWidth:waist},randomAccess:true,noBodyOrGeometryReplacement:true,removableCachedWardrobe:true,actingFrameCount:360,extrema,walk30And60Fps:metrics};await mkdir('evidence/p2a',{recursive:true});await writeFile('evidence/p2a/api-metrics.json',JSON.stringify(report,null,2)+'\n');console.log('PASS P2A casting, pure seeking, fixed cameras, independent cached appearances, removal, unchanged six-part/pivot/geometry identities, separation and both body/gait 30/60fps actual-vertex contact:',extrema);
