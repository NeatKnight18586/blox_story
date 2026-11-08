import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {compileShotList,sampleShotList} from '../production/timeline.js';
const read=async p=>JSON.parse(await readFile(p));
const input=await read('stories/names100/scene-ending.json'),p=compileShotList(input),v1=await read('stories/names100/scene-v1.json');
assert.deepEqual(input.cast,v1.cast);assert.equal(p.frameCount,696);let previous=99;
for(let f=0;f<696;f++){const s=sampleShotList(p,f),e=s.ending,g=945+f;assert.equal(e.globalFrame,g);assert.equal(e.globalTime,g/30);assert(e.counter<=previous);previous=e.counter;if(g<1529){assert(e.counter>0);assert.equal(e.forgotten,0);}assert.equal(e.counter,g<1210?99:g<1236?52:g<1261?18:g<1278?3:g<1529?1:0);assert(e.doorOpen>=0&&e.doorOpen<=1);if(g<1054)assert.equal(e.doorOpen,0);for(const id of ['eli','mara'])assert.deepEqual(s.actors[id].appearance,p.cast.find(a=>a.id===id).appearance);assert.deepEqual(sampleShotList(p,f),s);}
// Speech starts rounded UP to the first legal native frame, never 10ms/3ms early.
for(const [start,value] of [[40.33,52],[41.20,18],[42.01,3],[42.57,1]]){const f=Math.ceil(start*30);assert.equal(sampleShotList(p,f-945).ending.counter,value);assert.notEqual(sampleShotList(p,f-1-945).ending.counter,value);}
for(const mutate of [x=>x.ending.globalStart++,x=>x.ending.clockFps=15,x=>x.ending.unexpected=true,x=>x.cast[0].id='someone']){const bad=structuredClone(input);mutate(bad);assert.throws(()=>compileShotList(bad));}
const reflection=compileShotList(await read('stories/names100/scene-reflection.json')),base=compileShotList(v1);for(let f=0;f<463;f++)assert.deepEqual(sampleShotList(reflection,f).reveal,sampleShotList(base,f).reveal);
console.log('PASS ending: all696 pure native samples, monotone99/52/18/3/1/0, no early spoken numbers/forgetting, exact945–1641 clock, original cast/appearances and reveal timing, malformed cues rejected');
