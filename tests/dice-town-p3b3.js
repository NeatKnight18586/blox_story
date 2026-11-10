import assert from 'node:assert/strict';
import {sample} from '../production/dice-town-p3b3/motion.js';
const states=Array.from({length:96},(_,f)=>sample(f));
assert.equal(states[56].shot,'D03');assert.equal(states[57].shot,'D04');assert.equal(states[57].slip,0);assert.equal(states[95].slip,1);
for(let f=0;f<96;f++){const s=states[f];assert(s.grip>=0&&s.grip<=1&&s.rise>=0&&s.rise<=1);if(s.rise>0)assert.equal(s.grip,1);if(f>0){assert(s.shoeDrop>=states[f-1].shoeDrop);assert(Math.abs(s.armAngle-states[f-1].armAngle)<.08);}}
for(const f of [95,57,0,18,75,53])assert.deepEqual(sample(f),states[f]);
for(const f of [-1,96,1.5,NaN])assert.throws(()=>sample(f));
console.log('PASS baker: 96 bounded explicit frames, single57 cut, grip before rise, worn before slip, continuous release, deterministic reverse sampling');
