import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {mkdir,readdir,readFile,writeFile,unlink,stat,rename} from 'node:fs/promises';
import {availableParallelism} from 'node:os';
import {compileShotList} from '../production/timeline.js';
const exec=promisify(execFile),out='evidence/production',raw=`${out}/raw`,frames=`${raw}/frames`;
const run=async(command,args)=>exec(command,args,{maxBuffer:16*1024*1024});
const hash=buffer=>createHash('sha256').update(buffer).digest('hex');
const started=performance.now(),planSource=await readFile('production/feasibility.json'),plan=compileShotList(JSON.parse(planSource));
await mkdir(frames,{recursive:true});
// Only remove exporter-owned numbered temporary frames, never other artifacts.
for(const f of await readdir(frames))if(/^frame-\d+\.png$/.test(f))await unlink(`${frames}/${f}`);
const report={status:'RUNNING',shotListSha256:hash(planSource),width:plan.width,height:plan.height,fps:plan.fps,frameCount:plan.frameCount,duration:plan.frameCount/plan.fps,shots:plan.shots.map(s=>({id:s.id,start:s.start,end:s.end,camera:s.camera})),interaction:{triggerFrame:plan.prop.triggerFrame,distance:plan.triggerDistance,radius:plan.prop.radius},frames:[],errors:[],resources:{availableParallelism:availableParallelism(),ffmpegThreads:2,peakSampledSubtreeRssMiB:0,rssMethod:'1-second ps samples of exporter/browser/encoder subtree; summed RSS counts shared pages per process; HTTP server excluded'},timings:{}};
let browser,playbackBrowser,peak=0,sampling=false;
const timer=setInterval(async()=>{if(sampling)return;sampling=true;try{const {stdout}=await run('ps',['-eo','pid=,ppid=,rss=']);const rows=stdout.trim().split('\n').map(l=>l.trim().split(/\s+/).map(Number));const ids=new Set([process.pid]);let changed=true;while(changed){changed=false;for(const [pid,parent] of rows)if(ids.has(parent)&&!ids.has(pid)){ids.add(pid);changed=true;}}peak=Math.max(peak,rows.filter(([pid])=>ids.has(pid)).reduce((n,[,,rss])=>n+rss,0)/1024);}catch{}finally{sampling=false;}},1000);timer.unref();
try{
 browser=await chromium.launch({headless:true,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});report.browser=browser.version();
 const page=await browser.newPage({viewport:{width:720,height:1280},deviceScaleFactor:1});page.on('pageerror',e=>report.errors.push(e.message));
 await page.goto('http://127.0.0.1:8000/production/');await page.waitForFunction(()=>!!window.__production);
 report.webgl=await page.evaluate(()=>{const gl=__production.renderer.getContext();return gl.getParameter(gl.VERSION);});
 async function capture(frame){
  const data=await page.evaluate(frame=>{const state=__production.renderFrame(frame);return {...state,png:__production.renderer.domElement.toDataURL('image/png').split(',')[1]};},frame);
  assert(data.identity,'canonical mesh/pivot identity changed');const png=Buffer.from(data.png,'base64');assert.equal(png.readUInt32BE(16),720);assert.equal(png.readUInt32BE(20),1280);delete data.png;return {state:data,png};
 }
 let at=performance.now(),rawBytes=0;
 for(let frame=0;frame<plan.frameCount;frame++){
  const {state,png}=await capture(frame),filename=`frame-${String(frame).padStart(4,'0')}.png`;await writeFile(`${frames}/${filename}`,png);rawBytes+=png.length;
  report.frames.push({...state,file:filename,sha256:hash(png),bytes:png.length});if(frame%30===0)console.log(`Rendered ${frame}/${plan.frameCount}`);
 }
 report.timings.renderSeconds=(performance.now()-at)/1000;report.resources.rawPngBytes=rawBytes;
 const actual=(await readdir(frames)).filter(f=>/^frame-\d+\.png$/.test(f)).sort();assert.deepEqual(actual,report.frames.map(f=>f.file),'missing/extra numbered frames');
 at=performance.now();
 for(let frame=plan.frameCount-1;frame>=0;frame--){const {png,state}=await capture(frame);assert.equal(hash(png),report.frames[frame].sha256,`nondeterministic frame ${frame}`);assert.equal(state.shot,report.frames[frame].shot);}
 report.timings.repeatSeconds=(performance.now()-at)/1000;report.determinism={allFramesRepeated:plan.frameCount,order:'reverse',pngHashesIdentical:true};assert.deepEqual(report.errors,[]);
 const cuts=plan.shots.slice(1).map(s=>s.start);report.cuts=cuts.map(frame=>({frame,time:frame/plan.fps,from:report.frames[frame-1].shot,to:report.frames[frame].shot,differentSourcePixels:report.frames[frame-1].sha256!==report.frames[frame].sha256}));assert(report.cuts.every(c=>c.differentSourcePixels));
 const pending=`${raw}/feasibility.pending.mp4`,video=`${out}/feasibility.mp4`;
 const args=['-y','-hide_banner','-loglevel','error','-framerate',String(plan.fps),'-start_number','0','-i',`${frames}/frame-%04d.png`,'-frames:v',String(plan.frameCount),'-c:v','libx264','-threads','2','-preset','medium','-crf','20','-profile:v','main','-level:v','3.1','-pix_fmt','yuv420p','-vf','scale=out_color_matrix=bt709:out_range=tv','-color_primaries','bt709','-color_trc','bt709','-colorspace','bt709','-color_range','tv','-g','60','-force_key_frames',cuts.map(f=>f/plan.fps).join(','),'-fps_mode','cfr','-movflags','+faststart','-an',pending];
 report.ffmpeg={version:(await run('ffmpeg',['-version'])).stdout.split('\n')[0],args};
 at=performance.now();await run('ffmpeg',args);report.timings.encodeSeconds=(performance.now()-at)/1000;
 const probe=JSON.parse((await run('ffprobe',['-v','error','-count_frames','-show_streams','-show_format','-of','json',pending])).stdout);report.probe=probe;
 const stream=probe.streams.find(s=>s.codec_type==='video');assert.equal(stream.codec_name,'h264');assert.equal(stream.pix_fmt,'yuv420p');assert.equal(stream.width,720);assert.equal(stream.height,1280);assert.equal(stream.avg_frame_rate,'30/1');assert.equal(Number(stream.nb_read_frames),plan.frameCount);assert(Math.abs(Number(probe.format.duration)-plan.frameCount/plan.fps)<.001);
 const decoded=JSON.parse((await run('ffprobe',['-v','error','-select_streams','v:0','-show_frames','-show_entries','frame=best_effort_timestamp_time,key_frame,pict_type','-of','json',pending])).stdout).frames;
 assert.equal(decoded.length,plan.frameCount);decoded.forEach((f,i)=>assert(Math.abs(Number(f.best_effort_timestamp_time)-i/plan.fps)<1e-5,'decoded timing gap/duplicate'));for(const c of report.cuts)assert.equal(decoded[c.frame].key_frame,1,'cut must be encoded as keyframe');
 at=performance.now();await run('ffmpeg',['-v','error','-i',pending,'-f','null','-']);report.timings.decodeSeconds=(performance.now()-at)/1000;report.decode={allFrames:decoded.length,continuousPts:true,noErrors:true,cutKeyframes:true};
 // Independently measure visual cut strength from the encoded/decoded MP4.
 const sceneFile=`${raw}/scene-scores.txt`;
 await run('ffmpeg',['-y','-hide_banner','-loglevel','error','-i',pending,'-vf',`select='gte(scene,0)',metadata=mode=print:key=lavfi.scene_score:file=${sceneFile}`,'-an','-f','null','-']);
 const scores=[];let index=-1;for(const line of (await readFile(sceneFile,'utf8')).split('\n')){const m=line.match(/^frame:(\d+)/);if(m)index=Number(m[1]);if(line.startsWith('lavfi.scene_score='))scores[index]=Number(line.split('=')[1]);}
 assert.equal(scores.length,plan.frameCount);for(const c of report.cuts){c.decodedSceneScore=scores[c.frame];assert(c.decodedSceneScore>.03,'shot cut is insufficiently distinct');}
 report.highestSceneChanges=scores.map((score,frame)=>({frame,score})).sort((a,b)=>b.score-a.score).slice(0,4);
 await rename(pending,video);report.resources.mp4Bytes=(await stat(video)).size;report.mp4Sha256=hash(await readFile(video));
 // Actual HTML5 H.264 playback, not just container metadata.
 await page.goto('http://127.0.0.1:8000/production/player.html');
 const codec=await page.evaluate(()=>document.querySelector('video').canPlayType('video/mp4; codecs="avc1.4D401F"'));
 let playerPage=page;
 report.playbackBackend={renderBrowserH264Support:codec,renderBrowser:browser.version()};
 if(!codec){
  // Playwright's bundled Chromium may omit proprietary H.264 decoding. Use
  // an already installed codec-capable browser, without altering the MP4.
  const executablePath=process.env.PLAYBACK_CHROMIUM||'/usr/bin/chromium';
  playbackBrowser=await chromium.launch({executablePath,headless:true,args:['--no-sandbox']});
  playerPage=await playbackBrowser.newPage();await playerPage.goto('http://127.0.0.1:8000/production/player.html');
  report.playbackBackend.fallback={executablePath,version:playbackBrowser.version()};
 }
 await playerPage.waitForFunction(()=>{const v=document.querySelector('video');return v&&v.readyState>=2;},null,{timeout:30000});
 report.playback=await playerPage.evaluate(async()=>{const v=document.querySelector('video');await v.play();await new Promise(r=>setTimeout(r,400));v.pause();return {width:v.videoWidth,height:v.videoHeight,duration:v.duration,advancedTo:v.currentTime,error:v.error?.message??null};});
 assert.equal(report.playback.width,720);assert.equal(report.playback.height,1280);assert(report.playback.advancedTo>0);assert.equal(report.playback.error,null);
 await playerPage.evaluate(async()=>{const v=document.querySelector('video');for(const time of [2.1,4.6,7])await new Promise((resolve,reject)=>{v.addEventListener('seeked',resolve,{once:true});v.addEventListener('error',reject,{once:true});v.currentTime=time;});});
 report.playback.seekAcrossCuts=true;report.status='PASS';console.log('PASS: real 7.2s H.264 MP4, 216 frames, deterministic rerender, cuts, full decode and HTML5 playback');
}catch(error){report.status='PARTIAL';report.failure=String(error.stack||error);throw error;}
finally{clearInterval(timer);report.resources.peakSampledSubtreeRssMiB=peak;report.timings.totalSeconds=(performance.now()-started)/1000;report.resources.exporterMaxRssKiB=process.resourceUsage().maxRSS;if(playbackBrowser)await playbackBrowser.close();if(browser)await browser.close();await writeFile(`${out}/manifest.json`,JSON.stringify(report,null,2)+'\n');}
