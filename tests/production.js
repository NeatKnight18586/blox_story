import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createBaseAvatar} from '../avatar/baseAvatar.js';
import {sampleAction,applyActionSample} from '../avatar/actions.js';
import {compileShotList,sampleShotList} from '../production/timeline.js';
const source=JSON.parse(readFileSync('production/feasibility.json','utf8')),plan=compileShotList(source);
assert.equal(plan.frameCount,216);assert.equal(plan.triggerDistance<plan.prop.radius,true);
for(let i=0;i<216;i++){const sample=sampleShotList(plan,i);assert.equal(sample.frame,i);assert(Number.isFinite(sample.propOpen));}
for(const frame of [0,59,60,131,132,135,136,160,215]){const a=sampleShotList(plan,frame);for(const other of [215,0,135,60])sampleShotList(plan,other);assert.deepEqual(a,sampleShotList(plan,frame));}
assert.equal(sampleShotList(plan,59).shot,'notice');assert.equal(sampleShotList(plan,60).shot,'approach');assert.equal(sampleShotList(plan,132).shot,'discovery');
assert.equal(sampleShotList(plan,135).propOpen,0);assert.equal(sampleShotList(plan,160).propOpen,1);
const stopped=createBaseAvatar();applyActionSample(stopped,sampleAction('walk',2.4,{gait:'readable'}),plan.shots[1].origin);
assert(Math.abs(plan.shots[2].origin.position[0]-stopped.root.position.x)<1e-12);
assert(Math.abs(plan.shots[2].origin.position[2]-stopped.root.position.z)<1e-12);
assert.deepEqual(source,JSON.parse(readFileSync('production/feasibility.json','utf8')),'compilation must not mutate source data');
for(const mutate of [d=>d.shots[1].start++,d=>d.shots[2].originFromEndOf='absent',d=>d.prop.radius=.1,d=>d.shots[0].camera.fov=NaN,d=>d.fps=60]){const d=structuredClone(source);mutate(d);assert.throws(()=>compileShotList(d));}
assert.throws(()=>sampleShotList(plan,216));assert.throws(()=>sampleShotList(plan,.5));
console.log('PASS production: contiguous shots, exact cuts, deterministic action/prop samples, origin continuity and malformed input rejection');
