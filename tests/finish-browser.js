import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {chromium} from 'playwright';
import {loadStory,openBlock,hash} from '../scripts/names100.js';
import {startServer} from '../scripts/pipeline/server.js';
const story=await loadStory(),server=await startServer(process.cwd()),checks=[];let browser;
try{
 browser=await chromium.launch({headless:true,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 for(const [id,gs] of [['reveal',[700,889,890,891,910,925,926]],['ending',[1392,1528,1529,1530,1628,1640]]]){
  const b=story.blocks.find(b=>b.id===id),input=JSON.parse(await readFile(id==='ending'?'stories/names100/s3b-ending.json':b.file));input.counterMode='clean';
  const old=await openBlock(browser,server,{input},180,320),page=await openBlock(browser,server,{input:{...input,finish:'p5'}},180,320);
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.evaluate(()=>{const p=__production;window.bodyRefs=()=>Object.values(p.avatars).flatMap(a=>[a.root,...Object.values(a.parts),...Object.values(a.pivots),...Object.values(a.parts).flatMap(m=>[m.material,m.geometry])]);window.original=bodyRefs();});
  const baselines=new Map();
  for(const g of gs){
   const data=await page.evaluate(f=>{const p=__production,state=p.renderFrame(f);p.scene.updateMatrixWorld(true);const a=p.avatars[p.reveal?'mara':'eli'];return {state,png:p.renderer.domElement.toDataURL().split(',')[1],identity:original.every((o,i)=>o===bodyRefs()[i]),matrices:Object.values(p.avatars).flatMap(a=>Object.values(a.parts).flatMap(m=>m.matrixWorld.toArray())),ghost:a.parts.torso.material.opacity,opacity:a.parts.head.material.opacity,visibleSurfaceCount:[...p.finish.helpers].filter(([o,d])=>d.visible).length,attached:[...p.finish.helpers].filter(([o,d])=>d.visible).map(([o,d])=>o.name)};},g-b.start);
   const before=await old.evaluate(f=>{const p=__production,state=p.renderFrame(f);p.scene.updateMatrixWorld(true);return {state,matrices:Object.values(p.avatars).flatMap(a=>Object.values(a.parts).flatMap(m=>m.matrixWorld.toArray()))};},g-b.start);
   assert.deepEqual(data.state,before.state);assert.deepEqual(data.matrices,before.matrices);assert(data.identity&&data.state.identity);
   const active=id==='reveal'?data.state.reveal.ghostToHuman<1:data.state.ending.forgotten>0;
   assert.equal(data.visibleSurfaceCount>0,active);
   if(active){assert(data.attached.includes('vest_shell'));if(id==='reveal')assert(data.attached.includes('crown'));assert(data.ghost>=.58&&data.ghost<1);}
   baselines.set(g,{sha:hash(Buffer.from(data.png,'base64')),state:data.state});
   checks.push({globalFrame:g,bodyMatricesEqual:true,identity:true,ghostOpacity:data.ghost,surfaceCount:data.visibleSurfaceCount,attachmentSources:data.attached});
  }
  // Traverse both shader/material boundaries repeatedly in reverse order.
  for(const g of [...gs].reverse().concat(gs[0])){const result=await page.evaluate(f=>({state:__production.renderFrame(f),png:__production.renderer.domElement.toDataURL().split(',')[1]}),g-b.start);assert.deepEqual(result.state,baselines.get(g).state);assert.equal(hash(Buffer.from(result.png,'base64')),baselines.get(g).sha);}
  // A fresh renderer must reproduce the final ghost and restoration frame.
  const cold=await openBlock(browser,server,{input:{...input,finish:'p5'}},180,320),g=gs.at(-1);
  const png=await cold.evaluate(f=>{__production.renderFrame(f);return __production.renderer.domElement.toDataURL().split(',')[1];},g-b.start);assert.equal(hash(Buffer.from(png,'base64')),baselines.get(g).sha);
  assert.deepEqual(errors,[]);await old.close();await page.close();await cold.close();
 }
 await mkdir('evidence/names100-p5',{recursive:true});await writeFile('evidence/names100-p5/seeking.json',JSON.stringify({status:'PASS',browser:browser.version(),checks,coldReversePixels:true,bodyGeometryAndGroundContactUnchanged:true},null,2)+'\n');
 console.log('PASS P5 real WebGL cold/reverse seeks, restoration/zero boundaries, all actor body matrices/contact/identity unchanged');
}finally{if(browser)await browser.close();await server.close();}
