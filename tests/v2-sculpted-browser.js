import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import path from 'node:path';
import {chromium} from 'playwright';
import {startServer} from '../scripts/pipeline/server.js';
const dir='renders/v2-sculpted-reference';await mkdir(dir,{recursive:true});
const opts=[
 ['sculpt_swept','brown','warm'],
 ['sculpt_shag','black','tan'],
 ['sculpt_bob','chestnut','fair'],
 ['sculpt_long','blue_black','caramel']
];
const views={front:[0,5.2,4.6],threequarter:[2.7,5.3,3.7],side:[4.7,5.2,0]};
const srv=await startServer(process.cwd());
const browser=await chromium.launch({headless:true,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
try{
 const page=await browser.newPage({viewport:{width:720,height:1280},deviceScaleFactor:1});
 let errors=[];page.on('pageerror',e=>errors.push(e.message));
 for(const [hair,hairColor,skin] of opts){
  for(const [angle,position] of Object.entries(views)){
   await page.goto(srv.url+'/production/v2-preview.html?hair='+hair+'&hairColor='+hairColor+'&skin='+skin+'&angle='+angle+'&toon=0');
   await page.waitForFunction(()=>window.__v2Proof?.ready,null,{timeout:25000});
   const result=await page.evaluate(({position})=>{
    const p=window.__v2Proof;p.camera.position.set(...position);p.camera.lookAt(0,4.48,0);p.camera.fov=37;p.camera.updateProjectionMatrix();p.renderer.render(p.scene,p.camera);
    return {hair:p.hair,angle:p.angle,layer:p.avatar.hairLayer.name,count:p.avatar.hairLayer.children.length,attach:p.avatar.hairLayer.userData.attachment,
      lost:p.renderer.getContext().isContextLost(),width:p.renderer.domElement.width,height:p.renderer.domElement.height};
   },{position});
   assert.equal(result.hair,hair);assert.equal(result.angle,angle);
   assert.equal(result.layer,'hair_'+hair);assert(result.count>=7);
   assert.equal(result.attach,'HairAttachment');assert.equal(result.lost,false);
   assert.deepEqual([result.width,result.height],[720,1280]);
   await page.screenshot({path:path.join(dir,hair+'-'+angle+'.png')});
  }
 }
 assert.deepEqual(errors,[]);console.log('PASS sculpted study: 4 styles × 3 camera angles = 12 native 720×1280 WebGL images');
 await page.close();
}finally{await browser.close();await srv.close();}
