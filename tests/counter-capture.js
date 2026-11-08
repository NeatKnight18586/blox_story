import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {compileShotList,sampleShotList} from '../production/timeline.js';
import {loadCounterClock} from '../scripts/counter-clock.js';
for(const file of ['s2-rule','s3b-shy','s2-reveal','s3b-ending']){
 const input=JSON.parse(await readFile(`stories/names100/${file}.json`)),legacy=compileShotList(input),clean=compileShotList({...input,counterMode:'clean'});
 for(let g=0;g<legacy.frameCount;g++)assert.deepEqual(sampleShotList(legacy,g),sampleShotList(clean,g),'Capture mode must not affect any actor/clock/camera sample');
 assert.throws(()=>compileShotList({...input,counterMode:'cinematic'}));
}
const clock=await loadCounterClock();for(const [g,value] of [[0,100],[140,99],[192,0],[259,100],[788,100],[789,99],[1120,98],[1168,97],[1210,52],[1236,18],[1261,3],[1278,1],[1528,1],[1529,0]])assert.equal(clock.frames[g].value,value);
assert.equal(clock.frames[192].actor,'resident');assert.equal(clock.frames[259].actor,'eli');
const native=JSON.parse(await readFile('evidence/names100-p4/native-captures.json'));for(const f of native.frames){assert.equal((f.state.opening??f.state.reveal??f.state.ending).counter,clock.frames[f.globalFrame].value);assert(f.panelsHidden&&f.repeatState&&f.width===720&&f.height===1280&&f.pixelRatio===1);}
console.log('PASS counter mode: all1641 samples unchanged,unknown mode rejected,existing source values/actor separation,native pixel/state repetition');
