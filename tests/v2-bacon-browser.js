import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import path from 'node:path';
import {chromium} from 'playwright';
import {startServer} from '../scripts/pipeline/server.js';
const dir='renders/v2-bacon-hair';await mkdir(dir,{recursive:true});
const server=await startServer(process.cwd());
const browser=await chromium.launch({headless:true,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const angles={
 front:[0,5.2,4.8],threequarter:[2.7,5.3,3.8],side:[4.8,5.2,0],rear:[0,5.2,-4.8]
};
try {
 const page=await browser.newPage({viewport:{width:720,height:1280},deviceScaleFactor:1});
 const errors=[];page.on('pageerror',e=>errors.push(String(e)));
 for(const [name,pos] of Object.entries(angles)){
  await page.goto(server.url+'/production/v2-preview.html?hair=bacon&skin=warm&toon=0');
  await page.waitForFunction(()=>window.__v2Proof?.ready,null,{timeout:25000});
  for(const [size,distance] of [['close',1],['medium',1.65]]){
   const report=await page.evaluate(({pos,distance})=>{
    const proof=window.__v2Proof,cam=proof.camera;
    cam.position.set(...pos.map((v,i)=>i===1?4.47+(v-4.47)*distance:v*distance));
    cam.lookAt(0,4.52,0);cam.fov=39;cam.updateProjectionMatrix();
    proof.renderer.render(proof.scene,cam);
    const group=proof.avatar.hairLayer;
    return {name:group.name,parts:group.children.length,twoTone:group.userData.colorLocked,
     contextLost:proof.renderer.getContext().isContextLost(),width:proof.renderer.domElement.width,height:proof.renderer.domElement.height};
   },{pos,distance});
   assert.equal(report.name,'hair_bacon');assert(report.twoTone);
   assert(report.parts>=12);assert(!report.contextLost);
   assert.deepEqual([report.width,report.height],[720,1280]);
   await page.screenshot({path:path.join(dir,'bacon-'+name+'-'+size+'.png')});
  }
 }
 assert.deepEqual(errors,[]);
 console.log('PASS: 8 genuine 720×1280 bacon hair front/side/rear/three-quarter views');
}finally{await browser.close();await server.close();}
