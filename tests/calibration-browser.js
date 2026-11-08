import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
const out='evidence/calibration';await mkdir(`${out}/raw`,{recursive:true});
const browser=await chromium.launch({headless:true,args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const page=await browser.newPage({viewport:{width:390,height:693},deviceScaleFactor:1});const errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.goto('http://127.0.0.1:8000');await page.waitForFunction(()=>!!window.__blockstory);
const report={browser:browser.version(),fps:[30,60],duration:2.4,size:[216,384],camera:'Identical fixed camera for both gaits; 5.8-unit width, target z=.8; no tracking, reframing or variant-specific scale',results:{},frames:[]};
await page.evaluate(()=>{const s=document.querySelector('#stage');s.style.width='216px';s.style.height='384px';s.style.minHeight='0';window.dispatchEvent(new Event('resize'));window.original=[__blockstory.avatar.root,...Object.values(__blockstory.avatar.parts),...Object.values(__blockstory.avatar.pivots)];});
async function setCamera(view,width=216,height=384){
 await page.selectOption('#view',view);
 await page.evaluate(({width,height})=>{const app=__blockstory,c=app.camera,s=document.querySelector('#stage');s.style.width=`${width}px`;s.style.height=`${height}px`;app.renderer.setSize(width,height,false);c.position.z+=.8;c.lookAt(0,2.6,.8);c.left=-2.9;c.right=2.9;c.top=2.9*height/width;c.bottom=-c.top;c.updateProjectionMatrix();c.updateMatrixWorld(true);window.cameraSignature=JSON.stringify([c.position.toArray(),c.quaternion.toArray(),c.projectionMatrix.elements]);},{width,height});
}
async function render(gait,t){return page.evaluate(({gait,t})=>{
 const app=__blockstory,s=app.sampleAction('walk',t,{gait}),a=app.avatar;app.applyActionSample(a,s);app.renderer.render(app.scene,app.camera);a.root.updateMatrixWorld(true);
 const p=a.root.position.clone(),projected=p.clone();let min=Infinity,support=Infinity,swing=Infinity,patchZ=0,patchCount=0,maxNdc=0;
 for(const [name,m] of Object.entries(a.parts)){
  const attr=m.geometry.attributes.position;let bottom=Infinity;
  for(let i=0;i<attr.count;i++){p.fromBufferAttribute(attr,i).applyMatrix4(m.matrixWorld);bottom=Math.min(bottom,p.y);projected.copy(p).project(app.camera);maxNdc=Math.max(maxNdc,Math.abs(projected.x),Math.abs(projected.y));}
  min=Math.min(min,bottom);if(name===s.contacts.swing)swing=bottom;
  if(name===s.contacts.support[0]){support=bottom;for(let i=0;i<attr.count;i++){p.fromBufferAttribute(attr,i).applyMatrix4(m.matrixWorld);if(Math.abs(p.y-bottom)<1e-8){patchZ+=p.z;patchCount++;}}}
 }
 const hip=a.pivots[s.contacts.support[0]==='leftLeg'?'leftHip':'rightHip'];p.fromArray(s.contacts.localPoint).applyMatrix4(hip.matrixWorld);const anchor=s.contacts.anchors[0];
 const drift=Math.hypot(p.x-anchor[0],p.z-anchor[2]);
 return {pixels:app.renderer.domElement.toDataURL(),drift,patchDrift:Math.abs(hip.rotation.x)<1e-10?drift:Math.abs(patchZ/patchCount-anchor[2]),penetration:Math.max(0,-min),contactError:Math.max(Math.abs(p.y),Math.abs(support)),clearance:swing,maxNdc,identity:[a.root,...Object.values(a.parts),...Object.values(a.pivots)].every((p,i)=>p===original[i]),fixedCamera:cameraSignature===JSON.stringify([app.camera.position.toArray(),app.camera.quaternion.toArray(),app.camera.projectionMatrix.elements])};
 },{gait,t});}
for(const view of ['side','threequarter']){
 await setCamera(view);
 for(const gait of ['baseline','readable']){
  const metrics={maxFootDrift:0,rmsFootDrift:0,maxPatchDrift:0,rmsPatchDrift:0,maxPenetration:0,rmsPenetration:0,maxContactError:0,rmsContactError:0,minClearance:Infinity,maxClearance:0,maxNdc:0};const sums=[0,0,0,0];let n=0;const pixels=[];
  for(const fps of [30,60])for(let i=0;i<=2.4*fps;i++){
   const t=i/fps,r=await render(gait,t);assert(r.identity&&r.fixedCamera);assert(r.drift<=.03&&r.patchDrift<=.03&&r.penetration<=.01&&r.contactError<=.02&&r.clearance>=-1e-7&&r.maxNdc<.98);
   for(const [key,value] of [['maxFootDrift',r.drift],['maxPatchDrift',r.patchDrift],['maxPenetration',r.penetration],['maxContactError',r.contactError],['maxClearance',r.clearance],['maxNdc',r.maxNdc]])metrics[key]=Math.max(metrics[key],value);metrics.minClearance=Math.min(metrics.minClearance,r.clearance);[r.drift,r.patchDrift,r.penetration,r.contactError].forEach((v,k)=>sums[k]+=v*v);n++;
   if(fps===30){pixels.push(r.pixels);const path=`${out}/raw/${view}-${gait}-${String(i).padStart(3,'0')}.png`;await page.locator('canvas').screenshot({path});report.frames.push({view,gait,frame:i,time:t,path});}
   else if(i%2===0)assert.equal(r.pixels,pixels[i/2],'30/60fps shared pixels');
  }
  for(let i=72;i>=0;i--)assert.equal((await render(gait,i/30)).pixels,pixels[i],'reverse-seek pixels');
  ['rmsFootDrift','rmsPatchDrift','rmsPenetration','rmsContactError'].forEach((key,k)=>metrics[key]=Math.sqrt(sums[k]/n));report.results[`${view}-${gait}`]={samples:n,metrics,repeatReversePixelMatch:true};
 }
}
await page.setViewportSize({width:390,height:693});await setCamera('threequarter',390,693);
for(const gait of ['baseline','readable']){await render(gait,.6);await page.locator('canvas').screenshot({path:`${out}/raw/mobile-${gait}.png`});}
// Visible selector exercises the same explicit-time option; no walk blends.
await page.selectOption('#action','walk');await page.selectOption('#gait','readable');await page.click('#next');await page.click('#motionPlay');await page.waitForTimeout(100);await page.selectOption('#gait','baseline');await page.waitForTimeout(100);assert.equal(await page.locator('#timestamp').textContent(),'0.000 s');assert.equal(await page.locator('#motionPlay').textContent(),'Play action');
report.errors=errors;assert.deepEqual(errors,[]);await writeFile(`${out}/browser-metrics.json`,JSON.stringify(report,null,2)+'\n');console.log('PASS fixed-camera calibration WebGL',report.results);await browser.close();
