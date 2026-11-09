import {readFile} from 'node:fs/promises';
import {loadAssembly} from './s4-story.js';
import {compileShotList} from '../production/timeline.js';
// S4 remains immutable; only the speaking layer is opted in for Eli's blocks.
export async function loadSpeechStory(){
 const story=await loadAssembly(),speaking=JSON.parse(await readFile('stories/names100/s5-speech.json'));
 for(const b of story.blocks)if(b.input.cast.some(a=>a.id===speaking.actor)){b.input={...b.input,speaking};b.plan=compileShotList(b.input);}
 return story;
}
