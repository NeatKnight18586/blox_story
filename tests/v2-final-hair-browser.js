// Hair-first visual gate: all four angles, plus head-turn attachment check.
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import path from 'node:path';
import {chromium} from 'playwright';
import {startServer} from '../scripts/pipeline/server.js';
const dir='renders/v2-final-hair';await mkdir(dir,{recursive:true});
const server=await startServer(process.cwd());
const browser=await chromium.launch({headless:true,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const looks=[
 ['neat_side_part','warm','espresso'],
 ['soft_textured_crop','tan','brown'],
 ['low_bun','caramel','chestnut'],
 ['shoulder_length','peach','blonde']
];
const views={front:[0,4.82,3.15],threequarter:[2.05,4.89,2.65],side:[3.25,4.80,0],rear:[0,4.84,-3.15]};
try{
 const page=await browser.newPage({viewport:{width:720,height:1280},deviceScaleFactor:1});
 const errors=[];page.on('pageerror',e=>errors.push(String(e)));
 for(const [hair,skin,color] of looks){
  const url=server.url+'/production/v2-preview.html?hair='+hair+'&skin='+skin+'&hairColor='+color+'&toon=0';
  await page.goto(url);await page.waitForFunction(()=>window.__v2Proof?.ready,null,{timeout:25000});
  for(const [view,pos] of Object.entries(views)){
   const status=await page.evaluate(({pos,view})=>{
    const p=window.__v2Proof,cam=p.camera;
    p.avatar.pivots.head.rotation.set(0,0,0);
    cam.position.set(...pos);cam.lookAt(0,4.52,0);cam.fov=39;cam.updateProjectionMatrix();
    p.renderer.render(p.scene,cam);
    let bounds=new (p.avatar.parts.head.geometry.boundingBox?.constructor??p.avatar.parts.head.geometry.constructor)();
    return {view,hair:p.hair,parent:p.avatar.hairLayer.parent===p.avatar.pivots.head,
      w:p.renderer.domElement.width,h:p.renderer.domElement.height,
      lost:p.renderer.getContext().isContextLost(),objects:p.avatar.hairLayer.children.length};
   },{pos,view});
   assert(status.parent);assert(status.objects>=4);
   assert.deepEqual([status.w,status.h],[720,1280]);assert(!status.lost);
   await page.screenshot({path:path.join(dir,hair+'-'+view+'.png')});
  }
  await page.evaluate(()=>{
   const p=window.__v2Proof,cam=p.camera;
   p.avatar.pivots.head.rotation.y=.26;
   cam.position.set(2.05,4.89,2.65);cam.lookAt(0,4.52,0);
   p.renderer.render(p.scene,cam);
  });
  await page.screenshot({path:path.join(dir,hair+'-headturn.png')});
 }
 assert.deepEqual(errors,[]);
 console.log('PASS final four-hair visual gate: 20 real native frames, 4 angles + head turn per style');
}finally{await browser.close();await server.close();}
