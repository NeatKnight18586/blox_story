import {pathToFileURL} from 'node:url';
// Existing source clock is the only numeric authority. No copied value table.
import {loadStory,blockFor} from './names100.js';
import {sampleShotList} from '../production/timeline.js';
export function sampleCounterClock(story,g){
 const block=blockFor(story,g),s=sampleShotList(block.plan,g-block.start),cue=s.opening??s.reveal??s.ending;
 const shot=story.shots.find(s=>g>=s.start&&g<s.end);
 return {frame:g,shot:shot.id,shotEnd:shot.end,actor:cue.actor??'eli',value:cue.counter};
}
export async function loadCounterClock(){const story=await loadStory();return {fps:30,frameCount:1641,sourceSha256:story.jobSourceSha256,frames:Array.from({length:1641},(_,g)=>sampleCounterClock(story,g))};}

if(process.argv[1]&&pathToFileURL(process.argv[1]).href===import.meta.url)process.stdout.write(JSON.stringify(await loadCounterClock())+'\n');
