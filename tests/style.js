import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {compileShotList,sampleShotList} from '../production/timeline.js';
const read=async name=>JSON.parse(await readFile('stories/names100/'+name+'.json'));
for(const [next,old,count,field] of [['style-bedroom','scene-v1',463,'reveal'],['style-ending','scene-ending',696,'ending']]){
 const input=await read(next),original=await read(old),p=compileShotList(input),base=compileShotList(original);assert.equal(p.look,'s1');assert.equal(p.frameCount,count);assert.deepEqual(input.cast,original.cast);assert.deepEqual(input.shots.map(s=>[s.start,s.end]),original.shots.map(s=>[s.start,s.end]));
 for(let f=0;f<count;f++){const a=sampleShotList(p,f),b=sampleShotList(base,f);assert.deepEqual(a[field],b[field]);assert.deepEqual(a.actors,b.actors);}
 const bad=structuredClone(input);bad.look='bloom';assert.throws(()=>compileShotList(bad));
}
const town=compileShotList(await read('style-town'));assert.equal(town.frameCount,94);assert.equal(town.fps,30);assert.equal(town.environment.kind,'home-courtyard');assert.equal(town.cast[0].id,'eli');assert.equal(sampleShotList(town,35).time,35/30);assert.deepEqual(town.cast[0].appearance,compileShotList(await read('scene-v1')).cast[0].appearance);
console.log('PASS S1: opt-in look, NEW94-frame opening schedule only, unchanged1159 reveal/ending clock and actor samples, original casts/styles/cuts, unknown look rejected');
