// Economical genuine WebGL contact sheet: four cast looks × two material presets.
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import path from 'node:path';
import {chromium} from 'playwright';
import {startServer} from '../scripts/pipeline/server.js';
const dir='renders/v2-lookdev';await mkdir(dir,{recursive:true});
const server=await startServer(process.cwd());
const browser=await chromium.launch({headless:true,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const cases=[
 {hair:'neat_side_part',skin:'warm',color:'espresso'},
 {hair:'soft_textured_crop',skin:'tan',color:'brown'},
 {hair:'low_bun',skin:'caramel',color:'chestnut'},
 {hair:'shoulder_length',skin:'peach',color:'blonde'}
];
try{
 const page=await browser.newPage({viewport:{width:720,height:1280},deviceScaleFactor:1});
 const errors=[];page.on('pageerror',e=>errors.push(String(e)));
 for(const item of cases)for(const toon of [0,1]){
  const href=server.url+'/production/v2-preview.html?hair='+item.hair+'&skin='+item.skin+'&hairColor='+item.color+'&toon='+toon;
  await page.goto(href);await page.waitForFunction(()=>window.__v2Proof?.ready,null,{timeout:25000});
  const result=await page.evaluate(()=>{
   const p=window.__v2Proof;return {hair:p.hair,skin:p.skinToneId,toon:p.toon,
    headToon:p.avatar.parts.head.material.isMeshToonMaterial||false,
    w:p.renderer.domElement.width,h:p.renderer.domElement.height,
    lost:p.renderer.getContext().isContextLost()};
  });
  assert.equal(result.hair,item.hair);assert.equal(result.skin,item.skin);
  assert.equal(result.toon,!!toon);assert.equal(result.headToon,!!toon);
  assert.deepEqual([result.w,result.h],[720,1280]);assert(!result.lost);
  await page.screenshot({path:path.join(dir,item.hair+'-'+(toon?'toon':'standard')+'.png')});
 }
 assert.deepEqual(errors,[]);
 console.log('PASS V2 four final styles × normal/toon = 8 genuine 720x1280 WebGL captures');
}finally{await browser.close();await server.close();}
