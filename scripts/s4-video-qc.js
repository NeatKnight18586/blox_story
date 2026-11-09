// Decode/PTS/cuts/native playback using existing P1 verifier, plus full voiced playback.
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {chromium} from 'playwright';
import {verifyVideo,run} from './pipeline/video.js';
import {startServer} from './pipeline/server.js';
const r=JSON.parse(await readFile('evidence/names100-s4/assembly.json')),clean=JSON.parse(await readFile('renders/names100-s4/last-run.json')),plan={width:720,height:1280,fps:15,frameCount:821,shots:clean.shots},server=await startServer(process.cwd());let browser;
try{
 browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 for(const key of ['silent',...r.voiced?['voiced']:[]])r[key].verification=await verifyVideo(plan,path.resolve(r[key].file),server,browser);
 if(r.voiced){
  const a=JSON.parse((await run('ffprobe',['-v','error','-select_streams','v:0','-show_packets','-show_data_hash','sha256','-show_entries','packet=data_hash','-of','json',r.silent.file])).stdout),b=JSON.parse((await run('ffprobe',['-v','error','-select_streams','v:0','-show_packets','-show_data_hash','sha256','-show_entries','packet=data_hash','-of','json',r.voiced.file])).stdout);assert.deepEqual(a,b);r.videoPacketsIdenticalAfterAudioMux=true;
  const player=await chromium.launch({headless:true,executablePath:process.env.PLAYBACK_CHROMIUM||'/usr/bin/chromium',args:['--no-sandbox','--autoplay-policy=no-user-gesture-required']});
  try{
   server.setVideo(path.resolve(r.voiced.file));const p=await player.newPage();await p.goto(server.url+'/__p1_player');await p.waitForFunction(()=>document.querySelector('video').readyState>=2);
   r.fullVoicedPlayback=await p.evaluate(async()=>{
    const v=document.querySelector('video');v.muted=false;v.volume=.8;const context=new AudioContext(),source=context.createMediaElementSource(v),analyser=context.createAnalyser();source.connect(analyser);analyser.connect(context.destination);await context.resume();let windows=0,audible=0,peakRms=0,callbacks=0;
    const samples=new Float32Array(analyser.fftSize),timer=setInterval(()=>{analyser.getFloatTimeDomainData(samples);const rms=Math.sqrt(samples.reduce((n,x)=>n+x*x,0)/samples.length);windows++;if(rms>.0001)audible++;peakRms=Math.max(peakRms,rms);},100);
    const mark=()=>{callbacks++;if(!v.ended)v.requestVideoFrameCallback(mark);};v.requestVideoFrameCallback(mark);const started=performance.now();
    try{const end=new Promise((resolve,reject)=>{v.addEventListener('ended',resolve,{once:true});v.addEventListener('error',()=>reject(new Error('Playback error')),{once:true});setTimeout(()=>reject(new Error('Full playback timeout')),75000);});await v.play();await end;return {ended:v.ended,duration:v.duration,currentTime:v.currentTime,wallSeconds:(performance.now()-started)/1000,muted:v.muted,windows,audibleWindows:audible,peakRms,frameCallbacks:callbacks,error:v.error?.message??null};}
    finally{clearInterval(timer);await context.close();}
   });assert(r.fullVoicedPlayback.ended&&!r.fullVoicedPlayback.muted&&r.fullVoicedPlayback.audibleWindows>100&&!r.fullVoicedPlayback.error);
  }finally{await player.close();}
 }
 r.status='TECHNICAL_PASS_HUMAN_REVIEW_PENDING';await writeFile('evidence/names100-s4/assembly.json',JSON.stringify(r,null,2)+'\n');console.log('PASS full decode/821PTS/22cuts/native playback; voiced stream-copy identity and full unmuted playback when available');
}finally{if(browser)await browser.close();await server.close();}
