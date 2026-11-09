// S7 sunrise motion safety gate: 60 native 720x1280 30fps frames, no audio/full episode.
import assert from 'node:assert/strict';
import {mkdir,rm,writeFile,readFile} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {loadSpeechStory} from './s5-story.js';
import {blockFor,openBlock} from './names100.js';
import {startServer} from './pipeline/server.js';
import {chromium} from 'playwright';
const first=1320,count=60,story=await loadSpeechStory(),b=blockFor(story,first);
assert.equal(b.id,'ending');assert(first+count<=b.end);
const out='renders/names100-s7-color-proof',frames=out+'/motion-cache';
await mkdir(frames,{recursive:true});
const server=await startServer(process.cwd());
const browser=await chromium.launch({headless:true,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const data={status:'PENDING',start:first,end:first+count-1,frames:count,dimension:[720,1280],fps:30};
const hash=x=>createHash('sha256').update(x).digest('hex');
try{
 const page=await openBlock(browser,server,{...b,input:{...b.input,environmentStyle:'s7'}},720,1280);
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 const key=new Map();
 for(let i=0;i<count;i++){
  const g=first+i;
  const payload=await page.evaluate(frame=>{
   const p=window.__production,state=p.renderFrame(frame);
   return {state,enabled:p.environmentStyle?.enabled,look:p.environmentStyle?.status(),
    png:p.renderer.domElement.toDataURL('image/png').split(',')[1]};
  },g-b.start);
  assert(payload.enabled);assert(payload.state.identity);
  assert.equal(payload.state.ending.globalFrame,g);
  assert(Number.isFinite(payload.look.lastDawn));
  const png=Buffer.from(payload.png,'base64');
  await writeFile(frames+'/'+String(i).padStart(4,'0')+'.png',png);
  if([1320,1338,1356,1379].includes(g)){
   key.set(g,hash(png));await writeFile(out+'/sunrise-g'+g+'.png',png);
  }
 }
 // Random-access/seek check after a later frame; no accumulated state.
 for(const g of key.keys()){
  const payload=await page.evaluate(frame=>{
   const p=window.__production;p.renderFrame(p.plan.frameCount-1);p.renderFrame(frame);
   return p.renderer.domElement.toDataURL('image/png').split(',')[1];
  },g-b.start);
  assert.equal(hash(Buffer.from(payload,'base64')),key.get(g),'S7 sunrise motion reverse seek mismatch');
 }
 assert.deepEqual(errors,[]);
 await page.close();
 const mp4=out+'/sunrise-transition-2s.mp4';
 const encode=spawnSync('ffmpeg',['-hide_banner','-loglevel','error','-y','-framerate','30','-start_number','0',
  '-i',frames+'/%04d.png','-c:v','libx264','-preset','veryfast','-crf','18','-pix_fmt','yuv420p',
  '-movflags','+faststart',mp4],{encoding:'utf8',timeout:120000});
 if(encode.status!==0)throw Error('FFmpeg failed: '+JSON.stringify({status:encode.status,signal:encode.signal,error:String(encode.error),stderr:encode.stderr}));
 const verify=spawnSync('ffprobe',['-v','error','-count_frames','-select_streams','v:0',
  '-show_entries','stream=width,height,r_frame_rate,codec_name,nb_read_frames','-of','json',mp4],
  {encoding:'utf8',timeout:30000});
 if(verify.status!==0)throw Error('FFprobe failed: '+verify.stderr);
 const stream=JSON.parse(verify.stdout).streams[0];
 assert.deepEqual([stream.width,stream.height,stream.r_frame_rate,Number(stream.nb_read_frames)],[720,1280,'30/1',60]);
 data.status='PASS';data.codec=stream.codec_name;data.duration=2;data.keyframes=Object.fromEntries(key);
 await writeFile(out+'/MOTION_REPORT.json',JSON.stringify(data,null,2));
 await rm(frames,{recursive:true,force:true});
 console.log('PASS S7: native 2-second sunrise motion, 60 frames, seeking exact, H264 decoded.');
}finally{await browser.close();await server.close();}
