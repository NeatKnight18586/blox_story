import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {loadAssembly} from '../scripts/s4-story.js';
import {blockFor} from '../scripts/names100.js';
import {loadCounterClock} from '../scripts/counter-clock.js';
import {compileShotList,sampleShotList} from '../production/timeline.js';
const story=await loadAssembly(),clock=await loadCounterClock();let checked=0;
for(const b of story.blocks){
 const original=JSON.parse(await readFile(b.file)),plan=compileShotList(original);
 for(let f=0;f<plan.frameCount;f++){
  const g=b.start+f,a=sampleShotList(b.plan,f),old=sampleShotList(plan,f),cue=a.opening??a.reveal??a.ending;
  assert.equal(cue.globalFrame,g);assert.equal(cue.counter,clock.frames[g].value);assert.deepEqual(a.actors,old.actors);assert.deepEqual(a.opening??a.reveal??a.ending,old.opening??old.reveal??old.ending);
  if(g>=94)assert.deepEqual(a.camera,old.camera);checked++;
 }
 assert.throws(()=>compileShotList({...original,dressing:'s4'}));assert.throws(()=>compileShotList({...original,finish:'p5',dressing:'unknown'}));
}
assert.equal(checked,1641);for(let g=938;g<945;g++)assert.equal(blockFor(story,g).id,'reveal');assert.equal(blockFor(story,945).id,'ending');assert.equal(blockFor(story,259).file,'stories/names100/s3b-shy.json');
assert.deepEqual(story.shots.map(s=>[s.start,s.end]),JSON.parse(await readFile('stories/names100/roughcut.json')).shots.map(s=>[s.start,s.end]));
console.log('PASS S4 all1641 source clocks/actors/appearance,23 unchanged authoritative cuts,only first camera changed,correct S3B offsets/938–945 seam');
