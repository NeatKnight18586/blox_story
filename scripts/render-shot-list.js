import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash,randomUUID} from 'node:crypto';
import {mkdir,readdir,readFile,rename,lstat} from 'node:fs/promises';
import {availableParallelism} from 'node:os';
import {compileShotList} from '../production/timeline.js';
import {safePath,safeRead,atomicWrite,prepareOutput,acquireLock,directoryBytes,checkBudget} from './pipeline/files.js';
import {startServer} from './pipeline/server.js';
import {run,encodeVideo,verifyVideo,contactSheet} from './pipeline/video.js';
const root=fileURLToPath(new URL('../',import.meta.url)),hash=data=>createHash('sha256').update(data).digest('hex');
function options(argv){
 const opts={resume:true,budget:512*1024*1024,stopAfter:Infinity};
 for(let i=0;i<argv.length;i++){
  const key=argv[i];if(key==='--no-resume'){opts.resume=false;continue;}if(key==='--resume'){opts.resume=true;continue;}
  if(!['--shots','--out','--reference','--stop-after','--max-temp-mb','--range'].includes(key)||!argv[i+1]||argv[i+1].startsWith('--'))throw new Error('Usage: --shots FILE --out DIRECTORY [--resume|--no-resume] [--reference MANIFEST] [--stop-after N] [--max-temp-mb N] [--range START:END]');
  const value=argv[++i];if(key==='--stop-after'){opts.stopAfter=Number(value);if(!Number.isInteger(opts.stopAfter)||opts.stopAfter<1)throw new Error('Invalid stop-after');}else if(key==='--max-temp-mb'){opts.budget=Number(value)*1024*1024;if(!Number.isFinite(opts.budget)||opts.budget<=0||opts.budget>4096*1024*1024)throw new Error('Invalid temporary budget');}else opts[key.slice(2)]=value;
 }
 if(!opts.shots||!opts.out)throw new Error('Required: --shots FILE --out DIRECTORY');return opts;
}
async function engineHash(){
 const files=['package.json','package-lock.json','scripts/render-shot-list.js'];
 async function visit(dir){for(const name of (await readdir(path.join(root,dir),{withFileTypes:true})).sort((a,b)=>a.name.localeCompare(b.name))){const rel=path.join(dir,name.name);if(name.isDirectory())await visit(rel);else if(/\.(js|html)$/.test(name.name))files.push(rel);}}
 for(const dir of ['avatar','appearance','production','scripts/pipeline'])await visit(dir);
 const h=createHash('sha256');for(const file of files.sort())h.update(file).update('\0').update(await readFile(path.join(root,file))).update('\0');return h.digest('hex');
}
async function main(opts){
 const source=await readFile(path.resolve(opts.shots));if(source.length>1024*1024)throw new Error('Shot list exceeds 1MiB');const input=JSON.parse(source),sourcePlan=compileShotList(input);
 let rangeStart=0,rangeEnd=sourcePlan.frameCount;
 if(opts.range){const match=/^(\d+):(\d+)$/.exec(opts.range);if(!match)throw new Error('Invalid range; expected START:END');rangeStart=Number(match[1]);rangeEnd=Number(match[2]);if(!Number.isSafeInteger(rangeStart)||!Number.isSafeInteger(rangeEnd)||rangeStart>=rangeEnd||rangeEnd>sourcePlan.frameCount)throw new Error('Range outside input timeline');}
 const plan=opts.range?{...sourcePlan,frameCount:rangeEnd-rangeStart,shots:sourcePlan.shots.filter(s=>s.end>rangeStart&&s.start<rangeEnd).map(s=>({...s,start:Math.max(s.start,rangeStart)-rangeStart,end:Math.min(s.end,rangeEnd)-rangeStart}))}:sourcePlan;
 let reference=opts.reference?JSON.parse(await readFile(path.resolve(opts.reference))):null;if(reference&&opts.range&&reference.frames.length===sourcePlan.frameCount)reference={...reference,frames:reference.frames.slice(rangeStart,rangeEnd)};if(reference)assert.equal(reference.frames.length,plan.frameCount,'Reference frame count differs');
 const out=await prepareOutput(opts.out),release=await acquireLock(out),started=performance.now();
 const report={status:'RUNNING',title:plan.title,width:plan.width,height:plan.height,fps:plan.fps,frameCount:plan.frameCount,duration:plan.frameCount/plan.fps,shotListSha256:hash(source),shots:plan.shots.map(s=>({id:s.id,start:s.start,end:s.end,camera:s.camera,...(s.composition?{composition:s.composition}:{})})),frames:[],cache:{reused:0,rendered:0,repaired:0},timings:{},errors:[],resources:{availableParallelism:availableParallelism(),ffmpegThreads:2,rssMethod:'1-second sampled summed exporter/browser/server/encoder process-tree RSS; shared pages counted per process'}};
 if(opts.range)report.range={start:rangeStart,endExclusive:rangeEnd,sourceFrameCount:sourcePlan.frameCount};
 if(plan.cast)report.cast=plan.cast;if(plan.reveal)report.reveal=plan.reveal;if(plan.ending)report.ending=plan.ending;
 let browser,server,timer,peak=0,sampling=false,aborted=false,signal=null;
 const interrupt=name=>{aborted=true;signal=name;};const sigint=()=>interrupt('SIGINT'),sigterm=()=>interrupt('SIGTERM');process.on('SIGINT',sigint);process.on('SIGTERM',sigterm);
 try{
  timer=setInterval(async()=>{if(sampling)return;sampling=true;try{const {stdout}=await run('ps',['-eo','pid=,ppid=,rss=']);const rows=stdout.trim().split('\n').map(l=>l.trim().split(/\s+/).map(Number)),ids=new Set([process.pid]);let more=true;while(more){more=false;for(const [pid,parent] of rows)if(ids.has(parent)&&!ids.has(pid)){ids.add(pid);more=true;}}peak=Math.max(peak,rows.filter(([pid])=>ids.has(pid)).reduce((n,[,,rss])=>n+rss,0)/1024);}catch{}finally{sampling=false;}},1000);timer.unref();
  server=await startServer(root);browser=await chromium.launch({headless:true,handleSIGINT:false,handleSIGTERM:false,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  const page=await browser.newPage({viewport:{width:plan.width,height:plan.height},deviceScaleFactor:1});page.on('pageerror',e=>report.errors.push(e.message));
  await page.addInitScript(data=>window.__shotListInput=data,input);await page.goto(server.url+'/production/');await page.waitForFunction(()=>window.__production||window.__productionError);const error=await page.evaluate(()=>window.__productionError);if(error)throw new Error(error);
  report.backend=await page.evaluate(()=>{const gl=__production.renderer.getContext(),ext=gl.getExtension('WEBGL_debug_renderer_info');return {webgl:gl.getParameter(gl.VERSION),renderer:ext?gl.getParameter(ext.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER)};});report.browser=browser.version();report.engineSha256=await engineHash();
  report.jobKey=hash(JSON.stringify({source:report.shotListSha256,engine:report.engineSha256,browser:report.browser,backend:report.backend,platform:process.platform,arch:process.arch,...(opts.range?{range:[rangeStart,rangeEnd]}:{})}));
  const cacheRoot=path.join(out,'.p1-cache');await safePath(cacheRoot);await mkdir(cacheRoot,{recursive:true});const cache=path.join(cacheRoot,report.jobKey);await safePath(cache);await mkdir(cache,{recursive:true});
  const checkpoint=path.join(cache,'checkpoint.json');let entries={};
  if(opts.resume){try{const saved=JSON.parse(await safeRead(checkpoint));if(saved.jobKey===report.jobKey&&saved.entries&&typeof saved.entries==='object')entries=saved.entries;}catch(e){if(e.code!=='ENOENT'&&!(e instanceof SyntaxError))throw e;report.cache.checkpointMissingOrInvalid=true;}}
  let checkpointSize=0;try{checkpointSize=(await lstat(checkpoint)).size;}catch(e){if(e.code!=='ENOENT')throw e;}
  let bytes=await directoryBytes(cacheRoot);await checkBudget(cacheRoot,bytes,opts.budget);report.cache.bytesAtStart=bytes;
  async function capture(i){const data=await page.evaluate(frame=>{const state=__production.renderFrame(frame);return {state,png:__production.renderer.domElement.toDataURL('image/png').split(',')[1]};},i+rangeStart);if(opts.range)data.state={...data.state,sourceFrame:data.state.frame,frame:i,outputTime:i/plan.fps};assert(data.state.identity);const png=Buffer.from(data.png,'base64');assert.equal(png.readUInt32BE(16),plan.width);assert.equal(png.readUInt32BE(20),plan.height);return {...data,png};}
  let at=performance.now();
  for(let i=0;i<plan.frameCount;i++){
   if(aborted||report.cache.rendered>=opts.stopAfter)break;
   const file=`frame-${String(i).padStart(5,'0')}.png`,full=path.join(cache,file),entry=entries[i];let valid=false,oldSize=0;
   if(opts.resume&&entry?.file===file&&entry.state?.frame===i&&entry.state?.identity===true&&(!opts.range||entry.state.sourceFrame===i+rangeStart)){try{const png=await safeRead(full);oldSize=png.length;valid=png.length>24&&png.readUInt32BE(16)===plan.width&&png.readUInt32BE(20)===plan.height&&hash(png)===entry.sha256;}catch(e){if(e.code!=='ENOENT')throw e;}}
   if(valid)report.cache.reused++;else{
    const {state,png}=await capture(i);await safePath(full);try{oldSize=(await lstat(full)).size;}catch(e){if(e.code!=='ENOENT')throw e;}
    entries[i]={file,state,sha256:hash(png),bytes:png.length};const nextCheckpoint=JSON.stringify({version:1,jobKey:report.jobKey,entries}),nextSize=Buffer.byteLength(nextCheckpoint);
    // Reserve temporary atomic-write copies as well as the resulting cache.
    await checkBudget(cacheRoot,bytes+png.length+nextSize,opts.budget);await atomicWrite(full,png);await atomicWrite(checkpoint,nextCheckpoint);bytes+=png.length-oldSize+nextSize-checkpointSize;checkpointSize=nextSize;report.cache.rendered++;if(entry)report.cache.repaired++;
    if(report.cache.rendered%5===0||i===0)console.log(`Captured ${i+1}/${plan.frameCount}; cached ${report.cache.reused}`);
   }
   report.frames.push(entries[i]);
  }
  report.timings.captureSeconds=(performance.now()-at)/1000;
  if(report.frames.length!==plan.frameCount){report.status='PAUSED';report.reason=signal||'stop-after budget';report.cache.bytesAtEnd=await directoryBytes(cacheRoot);if(signal)process.exitCode=130;console.log(`PAUSED: ${report.frames.length} frames checkpointed`);return;}
  const names=(await readdir(cache)).filter(f=>/^frame-\d+\.png$/.test(f)).sort();assert.deepEqual(names,report.frames.map(f=>f.file),'Unexpected or missing cache frames');
  at=performance.now();for(let i=plan.frameCount-1;i>=0;i--){if(aborted)throw new Error(`Interrupted during verification: ${signal}`);const {state,png}=await capture(i);assert.equal(hash(png),entries[i].sha256,`Frame ${i} is not deterministic`);assert.deepEqual(state,entries[i].state);if(reference)assert.equal(entries[i].sha256,reference.frames[i].sha256,`Feasibility regression at frame ${i}`);}
  report.resources.frameBytes=report.frames.reduce((n,f)=>n+f.bytes,0);
  report.timings.repeatSeconds=(performance.now()-at)/1000;report.determinism={allFrames:plan.frameCount,reversePixelMatch:true,referenceMatch:!!reference};assert.deepEqual(report.errors,[]);
  const pending=path.join(cache,`video-${randomUUID()}.mp4`);at=performance.now();report.ffmpegArgs=await encodeVideo(plan,cache,pending);report.timings.encodeSeconds=(performance.now()-at)/1000;await checkBudget(cacheRoot,await directoryBytes(cacheRoot),opts.budget);
  at=performance.now();report.verification=await verifyVideo(plan,pending,server,browser);report.timings.verificationSeconds=(performance.now()-at)/1000;
  if(aborted)throw new Error(`Interrupted before publication: ${signal}`);
  const results=path.join(out,'results');await safePath(results);await mkdir(results,{recursive:true});const result=path.join(results,`${report.jobKey.slice(0,12)}-${randomUUID()}`);await mkdir(result,{mode:0o700});
  const movie=path.join(result,'movie.mp4'),sheet=path.join(result,'contact-sheet.png');await safePath(movie);await rename(pending,movie);report.contactFrames=await contactSheet(plan,movie,sheet);
  report.mp4Sha256=hash(await safeRead(movie));report.resources.mp4Bytes=(await safeRead(movie)).length;report.result=path.relative(out,result);report.cache.bytesAtEnd=await directoryBytes(cacheRoot);report.status='PASS';report.resources.peakSampledSubtreeRssMiB=peak;report.timings.totalSeconds=(performance.now()-started)/1000;
  await atomicWrite(path.join(result,'manifest.json'),JSON.stringify(report,null,2)+'\n');
  await atomicWrite(path.join(out,'latest.json'),JSON.stringify({version:1,jobKey:report.jobKey,result:report.result,videoSha256:report.mp4Sha256,manifestSha256:hash(await safeRead(path.join(result,'manifest.json')))},null,2)+'\n');
  console.log(`PASS ${plan.frameCount} frames. MP4: ${movie}`);
 }catch(e){report.status='FAIL';report.failure=String(e.stack||e);throw e;}
 finally{
  clearInterval(timer);report.resources.peakSampledSubtreeRssMiB=peak;report.timings.totalSeconds=(performance.now()-started)/1000;
  if(browser)await browser.close().catch(()=>{});if(server)await server.close();await atomicWrite(path.join(out,'last-run.json'),JSON.stringify(report,null,2)+'\n');await release();process.removeListener('SIGINT',sigint);process.removeListener('SIGTERM',sigterm);
 }
}
try{await main(options(process.argv.slice(2)));}catch(e){console.error(e.message);process.exitCode=1;}
