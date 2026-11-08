import {createBedroom} from '../production/assets/bedroom.js';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {readFile} from 'node:fs/promises';
import {createBaseAvatar} from '../avatar/baseAvatar.js';
import {applyFace,FACE_NAMES} from '../appearance/faces.js';
import {applyAppearance} from '../appearance/appearance.js';
import {compileShotList,sampleShotList} from '../production/timeline.js';
const a=createBaseAvatar(),b=createBaseAvatar({torsoVariant:'tapered'}),parts=Object.values(a.parts);
for(const face of FACE_NAMES){applyFace(a,face);const layer=a.faceLayer;applyFace(a,'blank');applyFace(a,face);assert.equal(a.faceLayer,layer);applyFace(b,face);assert.notEqual(a.faceLayer,b.faceLayer);for(const o of layer.children){assert(o.geometry.attributes.position.array.every(Number.isFinite));assert(o.material.color.getHex()===0x202124);}assert.deepEqual(Object.values(a.parts),parts);}
const before=a.faceLayer;assert.throws(()=>applyFace(a,'missing'));assert.equal(a.faceLayer,before);
for(const avatar of [a,b])for(const recipe of [{cosmetic:'cap'},{hair:'bob',clothing:'vest'}]){applyAppearance(avatar,recipe);for(const face of ['nervous','startled','thoughtful','relieved']){applyFace(avatar,face);assert.equal(Object.keys(avatar.parts).length,6);}}
const original=JSON.parse(await readFile('stories/names100/scene-proof.json')),v1=JSON.parse(await readFile('stories/names100/scene-v1.json')),p=compileShotList(v1),base=compileShotList(original);
assert.deepEqual(v1.cast,original.cast);assert.equal(p.frameCount,463);assert.equal(p.reveal.globalStart,482);assert.equal(p.reveal.globalEnd,945);assert.equal(p.reveal.counter.at,789);assert.deepEqual(p.reveal.ghost.interval,[890,926]);for(let f=0;f<463;f++)assert.deepEqual(sampleShotList(p,f).reveal,sampleShotList(base,f).reveal);
assert.deepEqual(p.shots.slice(0,6).map(s=>[s.start,s.end]),base.shots.slice(0,6).map(s=>[s.start,s.end]));assert.equal(p.shots[6].end,445);assert.equal(p.shots[7].start,445);assert.equal(p.shots[7].end,463);assert.deepEqual(sampleShotList(p,280).camera,sampleShotList(p,237).camera);
const stage=new THREE.Scene();createBedroom(stage,{visuals:'v1'});assert(stage.children.filter(o=>o.name==='window_recess').every(o=>o.position.z<0));
console.log('PASS V1: cached independent curved faces, legacy APIs, body/wardrobe identity, immutable counter/restoration/global clock; sole justified cut 938→927');
