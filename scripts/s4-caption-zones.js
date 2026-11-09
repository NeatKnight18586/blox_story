import assert from 'node:assert/strict';
// Conservative projected head/tag bounds for every full-story caption midpoint.
import {readFile,writeFile} from 'node:fs/promises';
import {chromium} from 'playwright';
import {loadAssembly} from './s4-story.js';
import {blockFor,openBlock} from './names100.js';
import {startServer} from './pipeline/server.js';
const story=await loadAssembly(),data=JSON.parse(await readFile('stories/names100/captions/s4-full.json')),anchors=Object.fromEntries(data.shots.map(s=>[s.id,s.anchor])),server=await startServer(process.cwd()),checks=[];let browser,page,current;
try{
 browser=await chromium.launch({headless:true,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 for(const c of data.cues){const g=Math.floor((c.start+c.end)*15),b=blockFor(story,g),shot=story.shots.find(s=>g>=s.start&&g<s.end),[x,y]=anchors[shot.id]??[324,832];
  if(current!==b.id){if(page)await page.close();page=await openBlock(browser,server,b,180,320);current=b.id;}
  const bounds=await page.evaluate(f=>{const p=__production;p.renderFrame(f);const out=[];function box(m,id){if(!m.geometry)return;const v=m.geometry.attributes.position,pts=[];for(let i=0;i<v.count;i++){const q=p.camera.position.clone().fromBufferAttribute(v,i).applyMatrix4(m.matrixWorld).project(p.camera);if(q.z>-1&&q.z<1)pts.push([(q.x+1)*360,(1-q.y)*640]);}if(pts.length)out.push({id,box:[Math.min(...pts.map(p=>p[0])),Math.min(...pts.map(p=>p[1])),Math.max(...pts.map(p=>p[0])),Math.max(...pts.map(p=>p[1]))]});}for(const [id,a]of Object.entries(p.avatars))box(a.parts.head,id);if(p.reveal?.tag.visible)p.reveal.tag.traverse(m=>box(m,'MARA tag'));return out;},g-b.start);
  // Width measured using same installed font by the Python caption validator;
  // conservative rectangle uses each line's character-count upper estimate.
  const width=Math.min(560,Math.max(...c.text.split('\n').map(l=>l.length))*30),rect=[x-width/2,y-c.text.split('\n').length*57-5,x+width/2,y+4];
  const collisions=bounds.filter(o=>o.box[0]<rect[2]&&o.box[2]>rect[0]&&o.box[1]<rect[3]&&o.box[3]>rect[1]);checks.push({voiceCue:c.voiceCue,globalFrame:g,shot:shot.id,text:c.text,rect,bounds,collisions:collisions.map(o=>o.id)});
 }
 await writeFile('evidence/names100-s4/caption-zones.json',JSON.stringify({status:checks.every(c=>!c.collisions.length)?'PASS':'FAIL',scope:'Conservative midpoint projected head/tag rectangles; not all-frame occlusion certification',checks},null,2)+'\n');assert(checks.every(c=>!c.collisions.length),JSON.stringify(checks.filter(c=>c.collisions.length)));console.log('PASS47 caption midpoint conservative head/tag clearance checks');
}finally{if(browser)await browser.close();await server.close();}
