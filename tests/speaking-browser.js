import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {chromium} from 'playwright';
import {loadSpeechStory} from '../scripts/s5-story.js';
import {blockFor,openBlock,hash} from '../scripts/names100.js';
import {sampleSpeaking} from '../appearance/speaking.js';
import {startServer} from '../scripts/pipeline/server.js';
const story=await loadSpeechStory(),server=await startServer(process.cwd()),checks=[];let browser;
try{
 browser=await chromium.launch({headless:true,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 for(const [id,gs]of [['shy',[289,359,445]],['reveal',[700,775,776,777,780,787,788,789,790,822,823,890,926]],['ending',[1115,1202,1203,1204,1205,1207,1209,1210,1227,1228,1232,1235,1236,1248,1253,1258,1259,1260,1261,1278,1296,1392,1528,1529,1530,1546,1600,1640]]]){
  const block=story.blocks.find(b=>b.id===id),page=await openBlock(browser,server,block,180,320),expected=new Map();
  await page.evaluate(()=>{const p=__production,l=p.speaking;window.speechRefs=()=>[...Object.values(l.meshes),...Object.values(l.meshes).map(m=>m.geometry),l.material];window.oldSpeechRefs=speechRefs();window.oldBodyRefs=Object.values(p.avatars).flatMap(a=>[a.root,...Object.values(a.parts),...Object.values(a.pivots)]);});
  for(const g of gs){
   const r=await page.evaluate(f=>{const p=__production,state=p.renderFrame(f),l=p.speaking,m=p.avatars.eli.faceLayer.children.find(o=>o.isMesh&&o.geometry.type==='TubeGeometry'&&!o.name.startsWith('brow_'));return {state,png:p.renderer.domElement.toDataURL().split(',')[1],active:Object.values(l.meshes).filter(m=>l.group.visible&&m.visible).map(m=>m.name),originalMouthVisible:m.visible,layerIdentity:oldSpeechRefs.every((o,i)=>o===speechRefs()[i]),insideFace:l.group.parent===p.avatars.eli.faceLayer,bodyIdentity:oldBodyRefs.every((o,i)=>o===Object.values(p.avatars).flatMap(a=>[a.root,...Object.values(a.parts),...Object.values(a.pivots)])[i]),frontHelpersCoverSpeech:[...p.finish?.helpers?.keys?.()??[]].some(o=>o.name.startsWith('mouth_'))};},g-block.start);
   const sample=sampleSpeaking(block.plan.speaking.cues,g),visible=sample.amount>=.08;assert(r.layerIdentity&&r.bodyIdentity&&r.state.identity&&r.insideFace);assert(!r.frontHelpersCoverSpeech);assert.equal(r.active.some(n=>n!=='mouth_closed'),visible);assert.equal(r.originalMouthVisible,!r.active.length);
   expected.set(g,{sha256:hash(Buffer.from(r.png,'base64')),state:r.state});checks.push({globalFrame:g,face:r.state.actors.eli.face,sample,active:r.active,layerIdentity:true,bodyIdentity:true,faceHierarchy:true});
  }
  for(const g of [...gs].reverse()){const r=await page.evaluate(f=>({state:__production.renderFrame(f),png:__production.renderer.domElement.toDataURL().split(',')[1]}),g-block.start);assert.equal(hash(Buffer.from(r.png,'base64')),expected.get(g).sha256);assert.deepEqual(r.state,expected.get(g).state);}
  // Fresh renderer, final state first: no warm speech/ghost dependency.
  const cold=await openBlock(browser,server,block,180,320),g=gs.at(-1);const png=await cold.evaluate(f=>{__production.renderFrame(f);return __production.renderer.domElement.toDataURL().split(',')[1];},g-block.start);assert.equal(hash(Buffer.from(png,'base64')),expected.get(g).sha256);await cold.close();await page.close();
 }
 await writeFile('evidence/names100-s5/seeking.json',JSON.stringify({status:'PASS',browser:browser.version(),checks,coldReversePixels:true,geometryMaterialsPersistent:true,noGhostDepthHelpersForMouth:true},null,2)+'\n');console.log(`PASS${checks.length} real WebGL speech/silence/count/ghost/resident boundaries,cold/reverse pixels,persistent geometry/materials/eyes and no double mouth`);
}finally{if(browser)await browser.close();await server.close();}
