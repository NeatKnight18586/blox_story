import assert from 'node:assert/strict';
import {readFile,mkdir,readdir,rename} from 'node:fs/promises';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import {chromium} from 'playwright';
import {loadStory,nativeFrame,blockFor,openBlock,storyEngineHash,hash} from './names100.js';
import {startServer} from './pipeline/server.js';
import {prepareOutput,acquireLock,safePath,safeRead,atomicWrite,directoryBytes,checkBudget} from './pipeline/files.js';
import {encodeVideo,verifyVideo,contactSheet} from './pipeline/video.js';
// Deliberately bounded rough-cut coordinator; P1's final exporter is unchanged.
let out='renders/names100-s2',stopAfter=Infinity;
for(let i=2;i<process.argv.length;i++){const arg=process.argv[i],v=process.argv[++i];if(arg==='--out'&&v)out=v;else if(arg==='--stop-after'&&Number.isInteger(+v)&&+v>0)stopAfter=+v;else throw new Error('Usage: [--out DIRECTORY] [--stop-after N]');}
const story=await loadStory(),engineSha256=await storyEngineHash(),review=JSON.parse(await readFile('evidence/names100-s2/creative-review.json'));
assert.equal(review.status,'PASS','Gate C creative review must pass');assert.equal(review.storySha256,story.jobSourceSha256);assert.equal(review.engineSha256,engineSha256,'Review must match current visual code');
const plan={...story.output,frameCount:821,shots:story.shots.map(s=>({...s,start:Math.ceil(s.start/2),end:Math.ceil(s.end/2)}))};
const output=await prepareOutput(out),release=await acquireLock(output),started=performance.now(),report={status:'RUNNING',scope:'S2 draft; full P1-style reverse verification retained',...plan,nativeFps:30,nativeFrameCount:1641,targetSeconds:54.7,duration:821/15,trailingHoldSeconds:821/15-54.7,engineSha256,storySha256:story.jobSourceSha256,blocks:story.blocks.map(({id,start,end,file,sha256})=>({id,start,end,file,sha256})),frames:[],cache:{rendered:0,reused:0,repaired:0},timings:{},errors:[]};
let browser,server,page,current,aborted=false;const onSignal=()=>aborted=true;process.on('SIGINT',onSignal);process.on('SIGTERM',onSignal);
try{
 server=await startServer(process.cwd());browser=await chromium.launch({headless:true,handleSIGINT:false,handleSIGTERM:false,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});report.browser=browser.version();
 async function use(block){if(current===block.id)return;if(page)await page.close();page=await openBlock(browser,server,block,180,320);page.on('pageerror',e=>report.errors.push(e.message));current=block.id;}
 await use(story.blocks[0]);report.backend=await page.evaluate(()=>{const gl=__production.renderer.getContext(),e=gl.getExtension('WEBGL_debug_renderer_info');return {webgl:gl.getParameter(gl.VERSION),renderer:gl.getParameter(e.UNMASKED_RENDERER_WEBGL)};});
 report.jobKey=hash(JSON.stringify([report.storySha256,engineSha256,report.browser,report.backend,process.platform,process.arch]));const cacheRoot=path.join(output,'.p1-cache');await safePath(cacheRoot);await mkdir(cacheRoot,{recursive:true});const cache=path.join(cacheRoot,report.jobKey);await safePath(cache);await mkdir(cache,{recursive:true});const checkpoint=path.join(cache,'checkpoint.json');let entries={};try{const saved=JSON.parse(await safeRead(checkpoint));if(saved.jobKey===report.jobKey&&saved.entries&&typeof saved.entries==='object'&&!Array.isArray(saved.entries))entries=saved.entries;}catch(e){if(e.code!=='ENOENT'&&!(e instanceof SyntaxError))throw e;}
 async function capture(i){const g=nativeFrame(story,i),b=blockFor(story,g);await use(b);const data=await page.evaluate(local=>{const state=__production.renderFrame(local);return {state,png:__production.renderer.domElement.toDataURL().split(',')[1]};},g-b.start);assert(data.state.identity);assert.equal((data.state.opening??data.state.reveal??data.state.ending).globalFrame,g);data.state={...data.state,frame:i,sourceFrame:g-b.start,block:b.id,globalFrame:g,globalTime:g/30,outputTime:i/15};const png=Buffer.from(data.png,'base64');assert.equal(png.readUInt32BE(16),180);assert.equal(png.readUInt32BE(20),320);return {...data,png};}
 let at=performance.now();
 for(let i=0;i<821;i++){
  if(aborted||report.cache.rendered>=stopAfter)break;const file=`frame-${String(i).padStart(5,'0')}.png`,full=path.join(cache,file),entry=entries[i];let valid=false;
  if(entry?.file===file&&entry.state?.globalFrame===i*2&&entry.state.identity){try{const png=await safeRead(full);valid=png.length>24&&png.readUInt32BE(16)===180&&png.readUInt32BE(20)===320&&hash(png)===entry.sha256;}catch(e){if(e.code!=='ENOENT')throw e;}}
  if(valid)report.cache.reused++;else{const {state,png}=await capture(i);const next={file,state,sha256:hash(png),bytes:png.length};entries[i]=next;const data=JSON.stringify({jobKey:report.jobKey,entries});await checkBudget(cacheRoot,await directoryBytes(cacheRoot)+png.length+Buffer.byteLength(data),256*1024*1024);await atomicWrite(full,png);await atomicWrite(checkpoint,data);report.cache.rendered++;if(entry)report.cache.repaired++;}
  report.frames.push(entries[i]);if(i%50===0)console.log(`Captured ${i+1}/821; reused ${report.cache.reused}`);
 }
 report.timings.captureSeconds=(performance.now()-at)/1000;
 if(report.frames.length!==821){report.status='PAUSED';console.log('PAUSED with verified PNG checkpoint; latest unchanged');}
 else{
  assert.deepEqual((await readdir(cache)).filter(n=>/^frame-\d+\.png$/.test(n)).sort(),report.frames.map(f=>f.file));
  at=performance.now();for(let i=820;i>=0;i--){if(aborted)throw new Error('Interrupted before publication');const {state,png}=await capture(i);assert.equal(hash(png),entries[i].sha256,`Non-repeatable global${i*2}`);assert.deepEqual(state,entries[i].state);if(i%200===0)console.log(`Reverse verified global${i*2}`);}report.timings.reverseSeconds=(performance.now()-at)/1000;report.determinism={allFrames:821,reversePixelMatch:true,reverseStateMatch:true};assert.deepEqual(report.errors,[]);
  const pending=path.join(cache,`movie-${randomUUID()}.mp4`);at=performance.now();report.ffmpegArgs=await encodeVideo(plan,cache,pending);report.timings.encodeSeconds=(performance.now()-at)/1000;await checkBudget(cacheRoot,await directoryBytes(cacheRoot),256*1024*1024);at=performance.now();report.verification=await verifyVideo(plan,pending,server,browser);report.timings.verificationSeconds=(performance.now()-at)/1000;
  if(aborted)throw new Error('Interrupted before publication');const dir=path.join(output,'results',report.jobKey.slice(0,12)+'-'+randomUUID());await safePath(dir);await mkdir(dir,{recursive:true});const movie=path.join(dir,'movie.mp4');await rename(pending,movie);report.contactFrames=await contactSheet(plan,movie,path.join(dir,'contact-sheet.png'));report.mp4Sha256=hash(await safeRead(movie));report.mp4Bytes=(await safeRead(movie)).length;report.pngBytes=report.frames.reduce((n,f)=>n+f.bytes,0);report.cache.bytesAtEnd=await directoryBytes(cacheRoot);report.result=path.relative(output,dir);report.status='PASS';report.timings.totalSeconds=(performance.now()-started)/1000;await atomicWrite(path.join(dir,'manifest.json'),JSON.stringify(report,null,2)+'\n');await atomicWrite(path.join(output,'latest.json'),JSON.stringify({jobKey:report.jobKey,result:report.result,mp4Sha256:report.mp4Sha256},null,2)+'\n');console.log('PASS continuous rough cut:',movie);
 }
}catch(e){report.status='FAIL';report.error=String(e.stack??e);process.exitCode=1;console.error(report.error);}
finally{report.timings.totalSeconds=(performance.now()-started)/1000;if(browser)await browser.close().catch(()=>{});if(server)await server.close();await atomicWrite(path.join(output,'last-run.json'),JSON.stringify(report,null,2)+'\n');await release();process.removeListener('SIGINT',onSignal);process.removeListener('SIGTERM',onSignal);}
