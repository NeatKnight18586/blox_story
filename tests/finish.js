import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {loadStory} from '../scripts/names100.js';
import {compileShotList,sampleShotList} from '../production/timeline.js';
const story=await loadStory();let samples=0;
for(const b of story.blocks){const input=JSON.parse(await readFile(b.id==='ending'?'stories/names100/s3b-ending.json':b.file));const legacy=compileShotList(input),finish=compileShotList({...input,finish:'p5',counterMode:'clean'});assert.equal(finish.finish,'p5');for(let f=0;f<legacy.frameCount;f++){assert.deepEqual(sampleShotList(finish,f),sampleShotList(legacy,f));samples++;}assert.throws(()=>compileShotList({...input,finish:'unknown'}));assert.throws(()=>compileShotList({...input,look:undefined,finish:'p5'}));}
assert.equal(samples,1641);
console.log('PASS P5 opt-in, unknown finish rejection, all1641 source samples/appearance/camera/animation/counter clocks unchanged');
