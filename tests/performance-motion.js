// Additional out-of-order browser seeks against the actual encoded inputs.
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {chromium} from 'playwright';
import {openBlock,hash} from '../scripts/names100.js';
import {startServer} from '../scripts/pipeline/server.js';
const report=JSON.parse(await readFile('renders/names100-s3b-motion/last-run.json'));assert.equal(report.status,'PASS');
const server=await startServer(process.cwd());let browser;const checks=[];
try{
 browser=await chromium.launch({headless:true,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 for(const clip of report.clips){
  const kind=clip.id==='A'?'shy':'ending',input=JSON.parse(await readFile(`stories/names100/s3b-${kind}.json`)),page=await openBlock(browser,server,{input},180,320);
  await page.evaluate(()=>{const p=__production;window.refs=()=>[...Object.values(p.avatars),...(p.ending?p.world.courtyard.residents:[])].flatMap(a=>[a.root,...Object.values(a.parts),...Object.values(a.pivots),...Object.values(a.parts).flatMap(m=>[m.geometry,m.material])]);window.original=refs();});
  for(const index of [...new Set([Math.floor(clip.frameCount*.7),0,clip.frameCount-1,3,Math.floor(clip.frameCount*.4),1])]){
   const frame=clip.frames[index],r=await page.evaluate(f=>{const p=__production,state=p.renderFrame(f);return {state,png:p.renderer.domElement.toDataURL().split(',')[1],identity:original.every((o,i)=>o===refs()[i])};},frame.globalFrame-clip.sourceStart);
   assert(r.identity&&r.state.identity);assert.deepEqual(r.state,frame.state);assert.equal(hash(Buffer.from(r.png,'base64')),frame.sha256);checks.push({id:clip.id,index,globalFrame:frame.globalFrame,sha256:frame.sha256,identity:true});
  }
  await page.close();
 }
 await writeFile('evidence/names100-s3b/motion-random-seeking.json',JSON.stringify({status:'PASS',checks,browser:browser.version(),scope:'Actual WebGL random seeks against all three preview input sequences, including resident pivots/geometry/material identity'},null,2)+'\n');console.log('PASS 18 actual WebGL random seeks, persistent cast/resident body/pivot/material identity, matching movie-input pixels/states');
}finally{if(browser)await browser.close();await server.close();}
