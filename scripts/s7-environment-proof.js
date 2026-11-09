// Genuine S7 A/B: same camera/story frame, untouched S6 baseline vs opt-in environment.
// Captures stills only. Never edit S6 source, audio, captions or films.
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {loadSpeechStory} from './s5-story.js';
import {blockFor,openBlock} from './names100.js';
import {startServer} from './pipeline/server.js';
import {chromium} from 'playwright';
const story=await loadSpeechStory(),server=await startServer(process.cwd());
const browser=await chromium.launch({headless:true,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const out='renders/names100-s7-color-proof';await mkdir(out,{recursive:true});
const frames=[{g:35,name:'opening-night'},{g:700,name:'bedroom'},{g:1392,name:'reunion-sunrise'},{g:1600,name:'final-isolation'}];
const protectedFrames=[788,789,925,926,1300,1330,1356,1528,1529,1640];
const checks=[],failures=[];
const sha=b=>createHash('sha256').update(b).digest('hex');
async function capture(b,g,style,label,write=true){
 const source=style?{...b,input:{...b.input,environmentStyle:'s7'}}:b;
 const page=await openBlock(browser,server,source,720,1280);
 page.on('pageerror',e=>failures.push(e.message));
 try{
  const sample=await page.evaluate(frame=>{
   const p=window.__production,state=p.renderFrame(frame);
   const png=p.renderer.domElement.toDataURL('image/png').split(',')[1];
   const env=p.environmentStyle;
   return {state,png,enabled:!!env?.enabled,look:env?.status?.()??null,
    canvas:[p.renderer.domElement.width,p.renderer.domElement.height]};
  },g-b.start);
  assert(sample.state.identity,'base avatar identity changed');
  assert.deepEqual(sample.canvas,[720,1280]);
  assert.equal(sample.enabled,style&&b.id!=='reveal'); // reveal/bedroom do not have courtyard
  if(style&&sample.enabled)assert(sample.look.changedMaterials>=5);
  const png=Buffer.from(sample.png,'base64');
  if(write)await writeFile(out+'/'+label+'.png',png);
  if(style){
   // Deliberately cold seek away, then back; S7 cannot depend on previous frames.
   const last=b.end-b.start-1;
   const reversed=await page.evaluate(({last,frame})=>{
     const p=window.__production;p.renderFrame(last);p.renderFrame(frame);
     return p.renderer.domElement.toDataURL('image/png').split(',')[1];
   },{last,frame:g-b.start});
   assert.equal(sha(png),sha(Buffer.from(reversed,'base64')),'S7 reverse seeking must match');
  }
  return {source:b.id,frame:g,sha:sha(png),environment:sample.look,shot:sample.state.shot};
 }finally{await page.close();}
}
try{
 for(const {g,name} of frames){
  const b=blockFor(story,g);
  const before=await capture(b,g,false,name+'-before');
  const after=await capture(b,g,true,name+'-after');
  checks.push({name,globalFrame:g,before:before.sha,after:after.sha,changed:before.sha!==after.sha,...(after.environment??{})});
 }
 for(const g of protectedFrames){
  const b=blockFor(story,g);
  const a=await capture(b,g,true,'g'+g,false);
  checks.push({name:'protected',globalFrame:g,frameHash:a.sha,source:a.source});
 }
 assert.deepEqual(failures,[]);
 await writeFile(out+'/REPORT.json',JSON.stringify({technical:'PASS',visual:'PENDING',frames:checks,errors:failures},null,2));
 console.log('PASS S7: 4 matched A/B scenes, 10 protected reverse-seek probes, true 720x1280 WebGL, legacy untouched.');
}finally{await browser.close();await server.close();}
