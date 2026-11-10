import {chromium} from 'playwright';
import {startServer} from './pipeline/server.js';
import {writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const server=await startServer(process.cwd()), browser=await chromium.launch({args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
try {
 const page=await browser.newPage();await page.goto(server.url+'/production/dice-town-p3b2/');await page.waitForFunction(()=>window.__recognition);
 const metrics=await page.evaluate(async()=>{
  const T=await import('three'),d=window.__recognition;
  const bounds=()=>{d.camera.updateMatrixWorld(true);let x0=Infinity,x1=-Infinity,y0=Infinity,y1=-Infinity;const m=d.mother.parts.head,p=m.geometry.attributes.position;for(let j=0;j<p.count;j++){const v=new T.Vector3().fromBufferAttribute(p,j).applyMatrix4(m.matrixWorld).project(d.camera);x0=Math.min(x0,v.x);x1=Math.max(x1,v.x);y0=Math.min(y0,v.y);y1=Math.max(y1,v.y);}return{widthPhonePixels:(x1-x0)*195,heightPhonePixels:(y1-y0)*(390*16/9)/2};};
  const frames=[0,40,95].map(f=>{d.render(f,180);const corrected=bounds();d.camera.position.set(2.3,4.1,7.5);d.camera.lookAt(.35,3.5,-1.5);d.camera.fov=46;d.camera.updateProjectionMatrix();const previous=bounds();return{frame:f,previous,corrected,widthGainPercent:100*(corrected.widthPhonePixels/previous.widthPhonePixels-1)};});
  d.render(0,180,true);const chairBounds=new T.Box3().setFromObject(d.chair),tableBounds=new T.Box3().setFromObject(d.scene.getObjectByName('table_edge'));
  return{method:'Actual head vertices projected through PR35 and corrected cameras at identical poses; 390px width',frames,chair:{position:d.chair.position.toArray(),rotation:d.chair.rotation.toArray(),tableXGap:tableBounds.min.x-chairBounds.max.x},shawlHeadBoundsGap:new T.Box3().setFromObject(d.mother.parts.head).min.y-new T.Box3().setFromObject(d.scene.getObjectByName('mother_cream_shawl_edge')).max.y};
 });
 assert(metrics.frames.every(x=>x.widthGainPercent>5));assert.deepEqual(metrics.chair.position,[-1.6,0,-5]);assert(metrics.chair.tableXGap>0);assert(metrics.shawlHeadBoundsGap>0);
 await writeFile('evidence/dice-town-p3b2b/composition.json',JSON.stringify(metrics,null,2));console.log(metrics);
}finally{await browser.close();await server.close();}
