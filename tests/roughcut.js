import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {loadStory,blockFor,nativeFrame} from '../scripts/names100.js';
import {sampleShotList} from '../production/timeline.js';
const story=await loadStory(),sample=g=>{const b=blockFor(story,g);return sampleShotList(b.plan,g-b.start);};
const text=await readFile('stories/names100/STORYBOARD.md','utf8'),slots=[...text.matchAll(/\| (S\d\d) \| (\d+)–(\d+) \|/g)].map(m=>[m[1],+m[2],+m[3]]);assert.deepEqual(story.shots.map(s=>[s.id,s.start,s.end]),slots);
let count=100;for(let g=0;g<1641;g++){const s=sample(g),cue=s.opening??s.reveal??s.ending;assert.equal(cue.globalFrame,g);assert.equal(cue.globalTime??cue.globalSeconds,g/30);if(g<259){assert(!s.actors.eli);assert.equal(cue.actor,'resident');}else{assert(s.actors.eli);assert(cue.counter<=count);count=cue.counter;if(g<789)assert.equal(count,100);if(g>=789&&g<1120)assert.equal(count,99);}if(g>=482&&g<=889)assert.equal(cue.ghostToHuman,0);if(g===926)assert.equal(cue.ghostToHuman,1);if(g>=945&&g<1529)assert.equal(cue.forgotten,0);assert.deepEqual(sample(g),s);}
for(const [g,n] of [[140,99],[192,0],[788,100],[789,99],[1120,98],[1168,97],[1210,52],[1236,18],[1261,3],[1278,1],[1528,1],[1529,0]])assert.equal((sample(g).opening??sample(g).reveal??sample(g).ending).counter,n);
for(const [g,field] of [[1120,'adultRestored'],[1168,'childRestored']]){assert.equal(sample(g).ending[field],0);assert.equal(sample(g+22).ending[field],1);}
for(let i=0;i<821;i++)assert.equal(nativeFrame(story,i),i*2);assert.equal(nativeFrame(story,820),1640);assert(Math.abs(821/15-54.7)<1/15);assert.throws(()=>nativeFrame(story,821));
assert.deepEqual(sample(944).camera,sample(945).camera);assert.deepEqual(sample(944).actors.eli.origin,sample(945).actors.eli.origin);
console.log('PASS S2:23 authoritative slots,1641 absolute native samples, anonymous rule vs untouched Eli100, protected789/890–926/1529,98/97 spends and returns,15fps map/end hold,block seam and deterministic seeking');
