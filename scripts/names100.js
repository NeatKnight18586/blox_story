// Bounded names100 adapter: four isolated existing scene blocks, no world engine.
import {readFile,readdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
import assert from 'node:assert/strict';
import {compileShotList} from '../production/timeline.js';
export const hash=data=>createHash('sha256').update(data).digest('hex');
export async function loadStory(){
 const source=await readFile('stories/names100/roughcut.json'),story=JSON.parse(source);assert.equal(story.nativeFps,30);assert.equal(story.nativeFrameCount,1641);assert.deepEqual(story.output,{width:180,height:320,fps:15});assert.equal(story.shots.length,23);assert.equal(story.blocks.length,4);
 let end=0;for(const b of story.blocks){assert.equal(b.start,end);assert(b.end>b.start);const bytes=await readFile(b.file);b.input=JSON.parse(bytes);b.sha256=hash(bytes);b.plan=compileShotList(b.input);assert.equal(b.plan.fps,30);assert.equal(b.plan.frameCount,b.end-b.start);const clock=b.plan.opening??b.plan.reveal??b.plan.ending;assert.equal(clock.globalStart,b.start);assert.equal(clock.globalEnd,b.end);end=b.end;}assert.equal(end,1641);
 end=0;for(const s of story.shots){assert.equal(s.start,end);assert(s.keyframe>=s.start&&s.keyframe<s.end);end=s.end;}assert.equal(end,1641);
 story.sourceSha256=hash(source);story.jobSourceSha256=hash(JSON.stringify([story.sourceSha256,...story.blocks.map(b=>b.sha256)]));return story;
}
export function nativeFrame(story,i){if(!Number.isInteger(i)||i<0||i>=821)throw new Error('Invalid rough frame');return i*2;}
export function blockFor(story,g){if(!Number.isInteger(g)||g<0||g>=1641)throw new Error('Invalid global frame');return story.blocks.find(b=>g>=b.start&&g<b.end);}
export async function storyEngineHash(extraFiles=[]){
 const files=['package.json','package-lock.json','scripts/render-shot-list.js','scripts/render-names100.js','scripts/names100.js',...extraFiles];
 async function visit(dir){for(const e of await readdir(dir,{withFileTypes:true})){const f=path.join(dir,e.name);if(e.isDirectory())await visit(f);else if(/\.(js|html)$/.test(e.name))files.push(f);}}
 for(const dir of ['avatar','appearance','production','scripts/pipeline'])await visit(dir);const h=createHash('sha256');for(const f of files.sort())h.update(f).update('\0').update(await readFile(f)).update('\0');return h.digest('hex');
}
export async function openBlock(browser,server,block,width,height){
 const input=structuredClone(block.input);input.output.width=width;input.output.height=height;const page=await browser.newPage({viewport:{width,height},deviceScaleFactor:1});await page.addInitScript(input=>window.__shotListInput=input,input);await page.goto(server.url+'/production/');await page.waitForFunction(()=>window.__production||window.__productionError);const error=await page.evaluate(()=>window.__productionError);if(error){await page.close();throw new Error(error);}return page;
}
