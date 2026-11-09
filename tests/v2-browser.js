// Opt-in V2 look proof; no legacy story exports or audio touched.
import assert from 'node:assert/strict';
import {mkdir,readFile} from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {chromium} from 'playwright';
import {startServer} from '../scripts/pipeline/server.js';
const dir='renders/v2-lookdev';await mkdir(dir,{recursive:true});
const server=await startServer(process.cwd()),browser=await chromium.launch({headless:true,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const samples=[
 ['side_swept','fair'],['spiky','tan'],['messy_fringe','warm'],['curtains','deep'],
 ['long_straight','porcelain'],['ponytail','caramel'],['twin_buns','peach'],['curly_crop','umber'],['low_bun','tan']
];
const checks=[];let failures=0;
try{
 const page=await browser.newPage({viewport:{width:720,height:1280},deviceScaleFactor:1});
 page.on('pageerror',e=>{failures++;console.error(e)});
 for(const [hair,skin] of samples){
  for(const toon of [0,1]){
   const file=`${hair}-${skin}-${toon?'toon':'standard'}.png`;
   await page.goto(`${server.url}/production/v2-preview.html?hair=${hair}&skin=${skin}&toon=${toon}`);
   await page.waitForFunction(()=>window.__v2Proof?.ready,{timeout:25000});
   const status=await page.evaluate(()=>{
    const p=window.__v2Proof;
    return {hair:p.hair,skin:p.skinToneId,width:p.renderer.domElement.width,height:p.renderer.domElement.height,
      headHex:p.avatar.parts.head.material.color.getHex(),toon:p.toon,
      headToon:p.avatar.parts.head.material.isMeshToonMaterial||false,
      styleMeshes:p.style?.converted??0,contextLost:p.renderer.getContext().isContextLost()};
   });
   assert.equal(status.hair,hair);assert.equal(status.skin,skin);
   assert.deepEqual([status.width,status.height],[720,1280]);assert.equal(status.toon,!!toon);
   if(toon){assert(status.headToon);assert(status.styleMeshes>0)}else assert(!status.headToon);
   assert(!status.contextLost);
   await page.screenshot({path:path.join(dir,file)});
   const png=await readFile(path.join(dir,file));checks.push({file,...status,sha256:createHash('sha256').update(png).digest('hex')});
  }
 }
 assert.equal(failures,0);
 await page.close();
 console.log(`PASS V2 lookdev: ${checks.length} real 720x1280 WebGL previews, 9 hairstyles, skin variety and toon A/B`);
}finally{await browser.close();await server.close();}
