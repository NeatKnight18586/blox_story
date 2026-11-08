import assert from 'node:assert/strict';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {chromium} from 'playwright';
const exec=promisify(execFile);
export const run=(command,args)=>exec(command,args,{maxBuffer:32*1024*1024});
export async function encodeVideo(plan,frameDir,video){
 const cuts=plan.shots.slice(1).map(s=>s.start),args=['-y','-hide_banner','-loglevel','error','-framerate',String(plan.fps),'-start_number','0','-i',`${frameDir}/frame-%05d.png`,'-frames:v',String(plan.frameCount),'-c:v','libx264','-threads','2','-preset','medium','-crf','20','-profile:v','main','-level:v','3.1','-pix_fmt','yuv420p','-vf','scale=out_color_matrix=bt709:out_range=tv,setsar=1','-color_primaries','bt709','-color_trc','bt709','-colorspace','bt709','-color_range','tv','-g',String(plan.fps*2),...(cuts.length?['-force_key_frames',cuts.map(f=>f/plan.fps).join(',')]:[]),'-fps_mode','cfr','-movflags','+faststart','-an',video];
 await run('ffmpeg',args);return args;
}
export async function verifyVideo(plan,video,server,renderBrowser){
 const probe=JSON.parse((await run('ffprobe',['-v','error','-count_frames','-show_streams','-show_format','-of','json',video])).stdout),stream=probe.streams.find(s=>s.codec_type==='video');
 assert.equal(stream.codec_name,'h264');assert.equal(stream.pix_fmt,'yuv420p');assert.equal(stream.width,plan.width);assert.equal(stream.height,plan.height);assert.equal(stream.sample_aspect_ratio,'1:1');assert.equal(stream.display_aspect_ratio,'9:16');assert.equal(stream.avg_frame_rate,`${plan.fps}/1`);assert.equal(Number(stream.nb_read_frames),plan.frameCount);assert(Math.abs(Number(probe.format.duration)-plan.frameCount/plan.fps)<.001);
 const frames=JSON.parse((await run('ffprobe',['-v','error','-select_streams','v:0','-show_frames','-show_entries','frame=best_effort_timestamp_time,key_frame','-of','json',video])).stdout).frames;
 assert.equal(frames.length,plan.frameCount);frames.forEach((f,i)=>assert(Math.abs(Number(f.best_effort_timestamp_time)-i/plan.fps)<1e-5));const cuts=plan.shots.slice(1).map(s=>({frame:s.start,time:s.start/plan.fps}));cuts.forEach(c=>assert.equal(frames[c.frame].key_frame,1));
 await run('ffmpeg',['-v','error','-i',video,'-f','null','-']);server.setVideo(video);
 let browser=renderBrowser,extra=null;let page=await browser.newPage();
 try{
  await page.goto(server.url+'/__p1_player');const support=await page.evaluate(()=>document.querySelector('video').canPlayType('video/mp4; codecs="avc1.4D401F"'));
  if(!support){await page.close();extra=await chromium.launch({executablePath:process.env.PLAYBACK_CHROMIUM||'/usr/bin/chromium',headless:true,args:['--no-sandbox']});browser=extra;page=await browser.newPage();await page.goto(server.url+'/__p1_player');}
  await page.waitForFunction(()=>{const v=document.querySelector('video');return v.readyState>=2||v.error;});
  const playback=await page.evaluate(async()=>{const v=document.querySelector('video');if(v.error)throw new Error(v.error.message);await v.play();await new Promise(r=>setTimeout(r,150));v.pause();return {width:v.videoWidth,height:v.videoHeight,duration:v.duration,advancedTo:v.currentTime,error:v.error?.message??null};});
  assert(playback.advancedTo>0);assert.equal(playback.width,plan.width);assert.equal(playback.height,plan.height);assert.equal(playback.error,null);
  const duration=plan.frameCount/plan.fps,seeks=[duration*.5,...cuts.map(c=>Math.min(duration-1/plan.fps,c.time+.1))];
  await page.evaluate(async(times)=>{const v=document.querySelector('video');for(const t of times){if(Math.abs(v.currentTime-t)<.0001)continue;await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(new Error('Seek timeout')),10000);v.addEventListener('seeked',()=>{clearTimeout(timer);resolve();},{once:true});v.currentTime=t;});}},seeks);
  return {probe,decode:{frames:frames.length,continuousPts:true,noErrors:true},cuts,playback:{...playback,browser:browser.version(),fallback:!!extra,seeks}};
 }finally{await page.close().catch(()=>{});if(extra)await extra.close();}
}
export async function contactSheet(plan,video,file){
 const indices=plan.shots.flatMap(s=>[s.start,Math.floor((s.start+s.end-1)/2),s.end-1]);const selected=indices.length<=12?[...new Set(indices)]:Array.from({length:12},(_,i)=>Math.floor(i*(plan.frameCount-1)/11));
 const cols=Math.min(3,selected.length),rows=Math.ceil(selected.length/cols),selection=selected.map(i=>`eq(n,${i})`).join('+');
 await run('ffmpeg',['-y','-v','error','-i',video,'-vf',`select='${selection}',scale=180:320,tile=${cols}x${rows}`,'-frames:v','1','-threads','2',file]);return selected;
}
