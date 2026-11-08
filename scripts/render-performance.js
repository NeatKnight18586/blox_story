// Only the three S3B proofs. Original P1 export/verification and native clock reused.
import assert from 'node:assert/strict';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import {readFile,mkdir} from 'node:fs/promises';
import {chromium} from 'playwright';
import {openBlock,hash,storyEngineHash} from './names100.js';
import {compileShotList} from '../production/timeline.js';
import {startServer} from './pipeline/server.js';
import {prepareOutput,acquireLock,atomicWrite,checkBudget,directoryBytes} from './pipeline/files.js';
import {encodeVideo,verifyVideo,contactSheet} from './pipeline/video.js';
const only=process.argv[2];if(only!==undefined&&only!=='C')throw new Error('Only optional argument: C (bounded ending repair)');
const targets=[['A','shy',259,320,482],['B','ending',945,1296,1490],['C','ending',945,1490,1641]];
const out=await prepareOutput('renders/names100-s3b-motion'),release=await acquireLock(out),server=await startServer(process.cwd());let browser;
const started=performance.now(),report={status:'RUNNING',scope:'Three bounded S3B silent previews only; no full episode',engineSha256:await storyEngineHash(),scriptSha256:hash(await readFile(new URL(import.meta.url))),clips:[],errors:[]};
try{
 browser=await chromium.launch({headless:true,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});report.browser=browser.version();
 for(const [id,kind,sourceStart,start,end] of targets.filter(t=>!only||t[0]===only)){
  const clipStart=performance.now(),source=await readFile(`stories/names100/s3b-${kind}.json`),input=JSON.parse(source),native=compileShotList(input),page=await openBlock(browser,server,{input},180,320);
  page.on('pageerror',e=>report.errors.push(e.message));const dir=path.join(out,`${id}-${randomUUID()}`);await mkdir(dir);
  const plan={width:180,height:320,fps:15,frameCount:Math.ceil((end-start)/2),shots:native.shots.filter(s=>s.end>start-sourceStart&&s.start<end-sourceStart).map(s=>({...s,start:Math.max(0,Math.ceil((sourceStart+s.start-start)/2)),end:Math.min(Math.ceil((end-start)/2),Math.ceil((sourceStart+s.end-start)/2))}))};
  const frames=[];async function capture(i){const g=start+2*i;const r=await page.evaluate(local=>{const p=__production,state=p.renderFrame(local);return {state,png:p.renderer.domElement.toDataURL().split(',')[1]};},g-sourceStart);assert(r.state.identity);assert.equal((r.state.opening??r.state.ending).globalFrame,g);return {globalFrame:g,state:r.state,png:Buffer.from(r.png,'base64')};}
  for(let i=0;i<plan.frameCount;i++){const r=await capture(i),file=`frame-${String(i).padStart(5,'0')}.png`;await atomicWrite(path.join(dir,file),r.png);frames.push({globalFrame:r.globalFrame,file,sha256:hash(r.png),state:r.state});}
  // Every encoded input, not just representative poses, must be repeatable.
  for(let i=plan.frameCount-1;i>=0;i--){const r=await capture(i);assert.equal(hash(r.png),frames[i].sha256);assert.deepEqual(r.state,frames[i].state);}
  const zeroBoundary=[];if(id==='C')for(const g of [1528,1529,1530]){const state=await page.evaluate(f=>__production.renderFrame(f),g-sourceStart);assert.equal(state.ending.counter,g<1529?1:0);zeroBoundary.push({globalFrame:g,counter:state.ending.counter,forgotten:state.ending.forgotten});}
  assert.deepEqual(report.errors,[]);await checkBudget(out,await directoryBytes(out),128*1024*1024);
  const movie=path.join(dir,'movie.mp4'),ffmpegArgs=await encodeVideo(plan,dir,movie),verification=await verifyVideo(plan,movie,server,browser),contactFrames=await contactSheet(plan,movie,path.join(dir,'contact-sheet.png'));
  const clip={id,...plan,nativeStart:start,nativeEnd:end,sourceStart,inputSha256:hash(source),result:path.relative(process.cwd(),dir),frames,zeroBoundary,ffmpegArgs,verification,contactFrames,sha256:hash(await readFile(movie)),determinism:'all frames reverse pixel/state match',seconds:(performance.now()-clipStart)/1000};
  await atomicWrite(path.join(dir,'manifest.json'),JSON.stringify(clip,null,2)+'\n');report.clips.push(clip);console.log(`PASS ${id}: ${plan.frameCount} frames, ${plan.frameCount/15}s, all reverse pixels/states, full decode/PTS/cuts/native playback`);await page.close();
 }
 report.status='PASS';
}catch(e){report.status='FAIL';report.error=String(e.stack??e);throw e;}
finally{report.seconds=(performance.now()-started)/1000;if(browser)await browser.close();await server.close();await atomicWrite(path.join(out,only?'last-run-C.json':'last-run.json'),JSON.stringify(report,null,2)+'\n');await release();}
