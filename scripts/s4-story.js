// Compose existing scene sources; all windows/cuts remain in roughcut.json.
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {loadStory,hash} from './names100.js';
import {compileShotList} from '../production/timeline.js';
export async function loadAssembly(file='stories/names100/s4-assembly.json',{background=true}={}){
 const bytes=await readFile(file),spec=JSON.parse(bytes);assert.equal(spec.version,1);assert.equal(spec.authority,'stories/names100/roughcut.json');
 const story=await loadStory();assert.deepEqual(Object.keys(spec.sources),story.blocks.map(b=>b.id));
 for(const b of story.blocks){
  b.file=spec.sources[b.id];const source=await readFile(b.file);b.input={...JSON.parse(source),...spec.capture};
  if(!background)delete b.input.dressing;
  for(const [id,camera] of Object.entries(background?spec.cameraOverrides[b.id]??{}:{})){const shot=b.input.shots.find(s=>s.id===id);assert(shot);shot.camera=camera;}
  b.plan=compileShotList(b.input);assert.equal(b.plan.fps,30);assert.equal(b.plan.frameCount,b.end-b.start);
  const clock=b.plan.opening??b.plan.reveal??b.plan.ending;assert.equal(clock.globalStart,b.start);assert.equal(clock.globalEnd,b.end);
  b.sourceSha256=hash(source);b.sha256=hash(JSON.stringify(b.input));
 }
 story.assembly=spec;story.jobSourceSha256=hash(JSON.stringify([hash(bytes),story.sourceSha256,...story.blocks.map(b=>b.sha256)]));return story;
}
