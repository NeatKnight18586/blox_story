import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
const out='evidence/f2b1';await mkdir(`${out}/frames`,{recursive:true});
const browser=await chromium.launch({headless:true,args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const page=await browser.newPage({viewport:{width:390,height:693},deviceScaleFactor:1});const errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.goto('http://127.0.0.1:8000');await page.waitForFunction(()=>!!window.__blockstory);
await page.evaluate(()=>{const s=document.querySelector('#stage');s.style.width='240px';s.style.height='360px';s.style.minHeight='0';window.dispatchEvent(new Event('resize'));window.refs=[__blockstory.avatar.root,...Object.values(__blockstory.avatar.parts),...Object.values(__blockstory.avatar.pivots)];});
const manifest={commands:["npm test", "npm run test:browser", "npm run test:motion", "npm run test:walk", "python3 tests/contact-sheets.py evidence/f2b1"],browser:browser.version(),webgl:await page.evaluate(()=>{const gl=__blockstory.renderer.getContext();return gl.getParameter(gl.VERSION);}),fps:[30,60],duration:2.4,clips:[],metrics:{maxFootDrift:0,rmsFootDrift:0,maxPenetration:0,rmsPenetration:0,maxGroundContactError:0,rmsGroundContactError:0,minSwingClearance:Infinity,maxSwingClearance:0},rawFrames:'Ignored by Git; regenerate with npm run test:walk. Every captured frame is included in committed labeled sheets.'};
let count=0,ds=0,ps=0,cs=0;
async function sample(t){return page.evaluate(t=>{
 const app=__blockstory,s=app.sampleAction('walk',t);app.setAction('walk',t);const a=app.avatar;a.root.updateMatrixWorld(true);
 const point=a.root.position.clone();let minY=Infinity,stance=Infinity,swing=Infinity;
 for(const [name,m] of Object.entries(a.parts)){let bottom=Infinity;const p=m.geometry.attributes.position;for(let i=0;i<p.count;i++){point.fromBufferAttribute(p,i).applyMatrix4(m.matrixWorld);bottom=Math.min(bottom,point.y);}minY=Math.min(minY,bottom);if(name===s.contacts.support[0])stance=bottom;if(name===s.contacts.swing)swing=bottom;}
 point.fromArray(s.contacts.localPoint).applyMatrix4(a.pivots[s.contacts.support[0]==='leftLeg'?'leftHip':'rightHip'].matrixWorld);
 const anchor=s.contacts.anchors[0];
 return {pixels:app.renderer.domElement.toDataURL(),drift:Math.hypot(point.x-anchor[0],point.z-anchor[2]),penetration:Math.max(0,-minY),contactError:Math.max(Math.abs(point.y),Math.abs(stance)),swingClearance:swing,contact:s.contacts,root:s.root.position,identity:[a.root,...Object.values(a.parts),...Object.values(a.pivots)].every((p,i)=>p===refs[i])};
 },t);}
for(const view of ['side','threequarter']){
 await page.selectOption('#view',view);const frames=[];
 for(let i=0;i<=72;i++){
  const t=i/30,r=await sample(t);assert(r.identity);
  const path=`${out}/frames/${view}-${String(i).padStart(3,'0')}.png`;await page.locator('canvas').screenshot({path});frames.push({frame:i,time:t,path,pixels:r.pixels,contacts:r.contact});
  if([0,9,18].includes(i))await page.locator('canvas').screenshot({path:`${out}/${view}-${i}.png`});
 }
 for(let i=72;i>=0;i--)assert.equal((await sample(i/30)).pixels,frames[i].pixels,'reverse seeking must reproduce pixels');
 for(const fps of [30,60])for(let i=0;i<=fps*2.4;i++){
  const t=i/fps,r=await sample(t);assert(r.drift<=.03&&r.penetration<=.01&&r.contactError<=.02&&r.swingClearance>=-1e-7);
  count++;ds+=r.drift**2;ps+=r.penetration**2;cs+=r.contactError**2;
  for(const [key,v] of [['maxFootDrift',r.drift],['maxPenetration',r.penetration],['maxGroundContactError',r.contactError],['maxSwingClearance',r.swingClearance]])manifest.metrics[key]=Math.max(manifest.metrics[key],v);
  manifest.metrics.minSwingClearance=Math.min(manifest.metrics.minSwingClearance,r.swingClearance);
  if(fps===60&&i%2===0)assert.equal(r.pixels,frames[i/2].pixels,'30/60fps shared pixel sample');
 }
 manifest.clips.push({id:view,view,duration:2.4,fps:30,repeatReversePixelMatch:true,frames:frames.map(({pixels,...f})=>f)});
}
for(const [width,height] of [[390,693],[720,1280]]){
 await page.setViewportSize({width,height});await page.evaluate(({width,height})=>{const s=document.querySelector('#stage');s.style.width=`${width}px`;s.style.height=`${height}px`;window.dispatchEvent(new Event('resize'));},{width,height});
 await page.selectOption('#view','threequarter');await sample(2.1);await page.locator('canvas').screenshot({path:`${out}/vertical-${width}x${height}.png`});
}
// Direct selection is a cut for walk: no unimplemented transition is implied.
await page.selectOption('#action','idle');await page.selectOption('#action','walk');await page.click('#next');await page.click('#motionPlay');await page.waitForTimeout(120);await page.click('#motionPlay');
await page.selectOption('#action','look_react');await page.evaluate(()=>__blockstory.setAction('idle',0));
assert(await page.evaluate(()=>Object.entries(__blockstory.avatar.pivots).every(([n,p])=>p.position.toArray().every((v,i)=>v===__blockstory.avatar.restPositions[n][i]))));
manifest.metrics.rmsFootDrift=Math.sqrt(ds/count);manifest.metrics.rmsPenetration=Math.sqrt(ps/count);manifest.metrics.rmsGroundContactError=Math.sqrt(cs/count);manifest.samples=count;manifest.errors=errors;assert.deepEqual(errors,[]);
await writeFile(`${out}/manifest.json`,JSON.stringify(manifest,null,2)+'\n');console.log('PASS F2B1 WebGL:',manifest.metrics,`(${count} measurements, 146 captured frames)`);await browser.close();
