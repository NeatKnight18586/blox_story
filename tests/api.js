import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createBaseAvatar} from '../avatar/baseAvatar.js';
import {headFrontZ} from '../avatar/headGeometry.js';
import {applyPose} from '../avatar/poses.js';
import {applyFace} from '../appearance/faces.js';
import {applyAppearance} from '../appearance/appearance.js';
const a=createBaseAvatar(),parts=Object.values(a.parts),root=a.root;
assert.equal(parts.length,6);assert.equal(Object.keys(a.pivots).length,5);
for(const name of ['head','leftShoulder','rightShoulder','leftHip','rightHip'])assert.equal(a.pivots[name].name,name);
a.root.updateMatrixWorld(true);
const bounds=name=>new THREE.Box3().setFromObject(a.parts[name]);
for(const name of ['leftLeg','rightLeg'])assert(Math.abs(bounds(name).min.y)<1e-6);
assert(Math.abs(bounds('torso').min.y-bounds('leftLeg').max.y-.02)<1e-6);
assert(Math.abs(bounds('leftArm').max.y-bounds('torso').max.y)<1e-6);
const pose=()=>Object.values(a.pivots).map(p=>p.rotation.toArray());
applyPose(a,'walk_demo',.25);const walk=pose();applyPose(a,'look_down');applyPose(a,'walk_demo',.25);assert.deepEqual(pose(),walk);applyPose(a,'neutral');for(const p of Object.values(a.pivots))assert.deepEqual(p.rotation.toArray(),[0,0,0,'XYZ']);
applyFace(a,'classic_smile');const smile=a.faceLayer;applyFace(a,'worried');applyFace(a,'blank');assert.equal(a.faceLayer.children.length,0);applyFace(a,'classic_smile');assert.equal(a.faceLayer,smile);
applyAppearance(a,{color:0xdddddd,pieces:{head:0xffffff},cosmetic:'cap'});const cap=a.cosmetic;assert.equal(cap.parent,a.pivots.head);applyAppearance(a,{});assert.equal(cap.parent,null);applyAppearance(a,{cosmetic:'cap'});assert.equal(a.cosmetic,cap);applyAppearance(a,{});
assert.equal(a.root,root);assert.deepEqual(Object.values(a.parts),parts);assert.equal(parts.filter(m=>m.isMesh).length,6);
assert.throws(()=>applyPose(a,'invalid'));assert.throws(()=>applyFace(a,'invalid'));assert.throws(()=>applyAppearance(a,{cosmetic:'invalid'}));
console.log('PASS: real Three.js imports, six meshes, five pivots, bounds, deterministic reset, face/cap caches, removal and identity');

assert.equal(a.parts.head.geometry.type,'LatheGeometry');
const headSize=bounds('head').getSize(new THREE.Vector3());
assert(Math.abs(headSize.x-1.25)<1e-6 && Math.abs(headSize.y-1.16)<1e-6 && Math.abs(headSize.z-1.1)<1e-6);
assert(headFrontZ(.23)<headFrontZ(0)-.03,'face must wrap onto curved head');
for(const child of smile.children){assert(child.geometry.getAttribute('position').array.every(Number.isFinite));}
console.log('PASS: rounded lathed head dimensions and curved face surface');
