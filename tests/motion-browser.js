import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
const out='evidence/f2a';await mkdir(`${out}/frames`,{recursive:true});
const browser=await chromium.launch({headless:true,args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const page=await browser.newPage({viewport:{width:390,height:693},deviceScaleFactor:1});const errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.goto('http://127.0.0.1:8000');await page.waitForFunction(()=>!!window.__blockstory);
await page.evaluate(()=>{const stage=document.querySelector('#stage');stage.style.width='240px';stage.style.height='360px';stage.style.minHeight='0';window.dispatchEvent(new Event('resize'));window.refs=[__blockstory.avatar.root,...Object.values(__blockstory.avatar.parts),...Object.values(__blockstory.avatar.pivots)];});
const manifest={fps:30,browser:browser.version(),webgl:await page.evaluate(()=>{const gl=__blockstory.renderer.getContext();return gl.getParameter(gl.VERSION);}),clips:[],metrics:{maxSupportHeightError:0,maxHorizontalDrift:0,rmsHorizontalDrift:0,minBodyY:Infinity},commands:['npm test','npm run test:browser','npm run test:motion','python3 tests/contact-sheets.py']};
let driftSquared=0,metricCount=0;
const clips=[{id:'idle',action:'idle',duration:3,view:'threequarter'},{id:'react',action:'look_react',duration:1.6,view:'front'},{id:'react-side',action:'look_react',duration:1.6,view:'side'},...['idle','look_react'].flatMap(from=>['idle','look_react'].map(to=>({id:`${from}-to-${to}`,from,to,duration:.75,view:'threequarter'})))];
async function render(clip,t){return page.evaluate(({clip,t})=>{
 const app=__blockstory;
 if(clip.action)app.setAction(clip.action,t);else{
  const e=Math.max(0,t-.25);const from={action:clip.from,time:.5+t};const to={action:clip.to,time:.3+e};
  if(t<.25)app.setAction(from.action,from.time);else if(t>.5)app.setAction(to.action,to.time);else app.setTransition(from,to,e,.25);
 }
 const a=app.avatar;a.root.updateMatrixWorld(true);
 const point=new (a.root.position.constructor)();let minY=Infinity,maxSupport=0,drift=0;
 for(const [name,mesh] of Object.entries(a.parts)){
  const attr=mesh.geometry.attributes.position;let bottom=Infinity;
  for(let i=0;i<attr.count;i++){point.fromBufferAttribute(attr,i).applyMatrix4(mesh.matrixWorld);minY=Math.min(minY,point.y);bottom=Math.min(bottom,point.y);}
  if(name.endsWith('Leg')){maxSupport=Math.max(maxSupport,Math.abs(bottom));mesh.getWorldPosition(point);drift=Math.max(drift,Math.hypot(point.x-(name==='leftLeg'?-.5:.5),point.z));}
 }
 return {pixels:app.renderer.domElement.toDataURL(),minY,maxSupport,drift,identity:[a.root,...Object.values(a.parts),...Object.values(a.pivots)].every((p,i)=>p===refs[i])};
 },{clip,t});}
for(const clip of clips){
 await page.selectOption('#view',clip.view);const frames=[];const count=Math.round(clip.duration*30);
 for(let i=0;i<=count;i++){
  const t=i/30,r=await render(clip,t);driftSquared+=r.drift*r.drift;metricCount++;assert(r.identity);assert(r.minY>=-.01&&r.maxSupport<=.02&&r.drift<=.03);
  manifest.metrics.minBodyY=Math.min(manifest.metrics.minBodyY,r.minY);manifest.metrics.maxSupportHeightError=Math.max(manifest.metrics.maxSupportHeightError,r.maxSupport);manifest.metrics.maxHorizontalDrift=Math.max(manifest.metrics.maxHorizontalDrift,r.drift);
  const path=`${out}/frames/${clip.id}-${String(i).padStart(3,'0')}.png`;
  await page.locator('canvas').screenshot({path});frames.push({frame:i,time:t,path,pixels:r.pixels});
 }
 assert(new Set(frames.map(f=>f.pixels)).size>1,'motion frames must change');
 for(let i=count;i>=0;i--){const r=await render(clip,i/30);assert.equal(r.pixels,frames[i].pixels,'repeat reverse-seek pixels');}
 manifest.clips.push({...clip,frames:frames.map(({pixels,...f})=>f),repeatReverseSeekPixelMatch:true});
}
// Exercise real controls, then capture independent face/cap compatibility views.
await page.selectOption('#action','idle');await page.locator('#time').fill('0.5');await page.locator('#time').dispatchEvent('input');await page.click('#next');assert.match(await page.locator('#timestamp').textContent(),/0.533/);await page.click('#previous');await page.click('#motionPlay');await page.waitForTimeout(150);await page.click('#motionPlay');
const beforeSwitch=await page.evaluate(()=>__blockstory.renderer.domElement.toDataURL());
await page.selectOption('#action','look_react');assert.equal(await page.evaluate(()=>__blockstory.renderer.domElement.toDataURL()),beforeSwitch,'UI action transition starts at displayed pose');
await page.selectOption('#direction','left');
for(const face of ['blank','classic_smile','worried'])for(const cosmetic of ['','cap']){
 await page.selectOption('#face',face);await page.selectOption('#cosmetic',cosmetic);await page.evaluate(()=>__blockstory.setAction('look_react',.8,{direction:'left'}));await page.selectOption('#view','closeup');await page.locator('canvas').screenshot({path:`${out}/${face}-${cosmetic||'bare'}.png`});
}
for(const [width,height] of [[390,693],[720,1280]]){
 await page.setViewportSize({width,height});await page.evaluate(({width,height})=>{const s=document.querySelector('#stage');s.style.width=`${width}px`;s.style.height=`${height}px`;window.dispatchEvent(new Event('resize'));__blockstory.setAction('look_react',.8);},{width,height});await page.selectOption('#view','threequarter');await page.locator('canvas').screenshot({path:`${out}/vertical-${width}x${height}.png`});
}
await page.setViewportSize({width:390,height:693});await page.evaluate(()=>{const s=document.querySelector('#stage');s.style.width='';s.style.height='';s.style.minHeight='';window.dispatchEvent(new Event('resize'));});await page.screenshot({path:`${out}/controls-mobile.png`,fullPage:true});
assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'responsive controls must not overflow');
await page.evaluate(()=>{const s=document.querySelector('#stage');s.style.width='240px';s.style.height='200px';s.style.minHeight='0';window.dispatchEvent(new Event('resize'));});await page.locator('canvas').screenshot({path:`${out}/small-silhouette.png`});
assert.deepEqual(errors,[]);manifest.errors=errors;manifest.metrics.rmsHorizontalDrift=Math.sqrt(driftSquared/metricCount);await writeFile(`${out}/manifest.json`,JSON.stringify(manifest,null,2)+'\n');console.log(`PASS F2A WebGL: ${manifest.clips.reduce((n,c)=>n+c.frames.length,0)} frames, reverse repeat pixel equality, grounded geometry, controls and vertical captures`);await browser.close();
