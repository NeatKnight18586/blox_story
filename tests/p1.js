import assert from 'node:assert/strict';
import {readFile,mkdtemp,writeFile,mkdir,symlink,link,unlink,rm} from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import * as THREE from 'three';
import {compileShotList,sampleShotList} from '../production/timeline.js';
import {createWorkshop} from '../production/assets/workshop.js';
import {createChest} from '../production/assets/chest.js';
import {prepareOutput,acquireLock,atomicWrite,safeRead,checkBudget} from '../scripts/pipeline/files.js';
const source=JSON.parse(await readFile('production/not-today.json')),before=structuredClone(source),plan=compileShotList(source);
assert.deepEqual(source,before);assert.equal(plan.shots.length,2);assert.equal(plan.frameCount,120);
assert.equal(sampleShotList(plan,7).propStates.chest.open,0);assert.equal(sampleShotList(plan,26).propStates.chest.open,1);assert.equal(sampleShotList(plan,95).propStates.chest.open,0);
for(const t of [0,26,59,60,85,119]){const expected=sampleShotList(plan,t);for(const other of [119,0,85])sampleShotList(plan,other);assert.deepEqual(sampleShotList(plan,t),expected);}
const short=structuredClone(source);short.output={width:180,height:320,fps:24};short.shots=[{...short.shots[0],end:12}];short.props=[];short.events=[];assert.equal(compileShotList(short).frameCount,12);
for(const mutate of [d=>d.output.width=721,d=>d.output.fps=60,d=>d.shots[1].start++,d=>d.environment.kind='unknown',d=>d.shots[0].action.options={gait:'readable'},d=>d.events[1].start=20,d=>d.events[1].from=.5,d=>d.events[0].target='missing',d=>d.events[0].proximityRadius=.1,d=>d.props[0].initial.open=2,d=>d.shots[1].appearance.pieces={typo:123},d=>d.shots[1].originFromEndOf='later',d=>d.typo=true]){const bad=structuredClone(source);mutate(bad);assert.throws(()=>compileShotList(bad));}
const continued=structuredClone(source);continued.shots[0].action={name:'walk',options:{gait:'readable'}};delete continued.shots[1].origin;continued.shots[1].originFromEndOf='suspicion';continued.events=[];const linked=compileShotList(continued);const expectedEndpoint=sampleShotList(linked,59).actor;assert(linked.shots[1].origin.position[2]>expectedEndpoint.origin.position[2]);assert.equal(sampleShotList(linked,60).actor.origin.yaw,0);
const walkingCut=structuredClone(source);walkingCut.events=[];for(const shot of walkingCut.shots){shot.action={name:'walk',options:{gait:'readable'},timeOffset:shot.start/30};shot.origin={position:[0,0,0],yaw:0};}const cutPlan=compileShotList(walkingCut),uncutPlan=compileShotList({...walkingCut,shots:[{...walkingCut.shots[0],end:120}]});for(const frame of [59,60,61,119])assert.deepEqual(sampleShotList(cutPlan,frame).actor,sampleShotList(uncutPlan,frame).actor);
const reset=sampleShotList(compileShotList({...source,shots:source.shots.map(s=>{const shot=structuredClone(s);delete shot.appearance;return shot;})}),0);assert.deepEqual(reset.appearance,{color:0xbfc1c3,pieces:{},cosmetic:null});
const scene=new THREE.Scene();createWorkshop(scene);const chest=createChest(scene,{id:'test',position:[0,1.61,3]}),refs=[];chest.root.traverse(o=>refs.push(o));chest.apply({open:1});const hinge=chest.root.children.find(o=>o.isGroup);assert.equal(hinge.rotation.x,1.3);chest.apply({open:0});assert.equal(hinge.rotation.x,0);const after=[];chest.root.traverse(o=>after.push(o));assert.deepEqual(after,refs);assert.throws(()=>chest.apply({open:NaN}));
const temp=await mkdtemp(path.join(os.tmpdir(),'blox-p1-files-'));
try{
 const owned=await prepareOutput(path.join(temp,'owned')),release=await acquireLock(owned);await assert.rejects(acquireLock(owned),/live PID/);await release();
 const lock=path.join(owned,'.p1-lock.json');await writeFile(lock,JSON.stringify({pid:2147483647,host:os.hostname(),nonce:'dead'}));const reclaimed=await acquireLock(owned);await reclaimed();
 const sentinel=path.join(temp,'sentinel');await writeFile(sentinel,'preserve');await symlink(sentinel,path.join(owned,'linked'));await assert.rejects(atomicWrite(path.join(owned,'linked'),'bad'),/linked/);assert.equal((await readFile(sentinel)).toString(),'preserve');await unlink(path.join(owned,'linked'));
 await link(sentinel,path.join(owned,'hardlink'));await assert.rejects(safeRead(path.join(owned,'hardlink')),/linked/);await unlink(path.join(owned,'hardlink'));
 const unknown=path.join(temp,'unknown');await mkdir(unknown);await writeFile(path.join(unknown,'user.txt'),'work');await assert.rejects(prepareOutput(unknown),/unowned/);assert.equal((await readFile(path.join(unknown,'user.txt'))).toString(),'work');
 await assert.rejects(checkBudget(owned,20,10),/budget/);await atomicWrite(path.join(owned,'atomic.txt'),'complete');assert.equal((await safeRead(path.join(owned,'atomic.txt'))).toString(),'complete');
}finally{await rm(temp,{recursive:true,force:true});}
console.log('PASS P1: v2 flexible timeline, pure events/appearance, factory identity, malformed input, output ownership, live/stale locks, linked-path rejection and atomic writes');
