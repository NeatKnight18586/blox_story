// Two bounded native previews through the unchanged P1 resumable exporter.
import assert from 'node:assert/strict';
import {mkdir,readFile,writeFile,copyFile} from 'node:fs/promises';
import path from 'node:path';
import {chromium} from 'playwright';
import {loadSpeechStory} from './s5-story.js';
import {blockFor,hash} from './names100.js';
import {run,verifyVideo} from './pipeline/video.js';
import {startServer} from './pipeline/server.js';
const wav=process.argv[2],story=await loadSpeechStory(),evidence='evidence/names100-s5',raw='renders/names100-s5-inputs',report={status:'RUNNING',clips:[],newFullEpisodes:0};await mkdir(raw,{recursive:true});await mkdir(evidence,{recursive:true});
if(wav)assert.equal(hash(await readFile(wav)),'3d5e0a116971d3d17a7c3adac79423e443d63040b2120be7562a0660f22b4ae4');
const native=JSON.parse(await readFile(`${evidence}/native-keyframes.json`));assert.equal(native.status,'PASS');
const server=await startServer(process.cwd());let browser;
try{
 browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 for(const [id,start,end,key]of [['whisper',760,798,780],['naming',1203,1260,1232]]){
  const b=blockFor(story,start);assert.equal(blockFor(story,end-1).id,b.id);const input=structuredClone(b.input);input.output={width:720,height:1280,fps:30};const file=`${raw}/${id}.json`,out=`renders/names100-s5-${id}`;await writeFile(file,JSON.stringify(input)+'\n');
  const rendered=await run(process.execPath,['scripts/render-shot-list.js','--shots',file,'--range',`${start-b.start}:${end-b.start}`,'--out',out]);console.log(rendered.stdout.trim());
  const r=JSON.parse(await readFile(`${out}/last-run.json`));assert.equal(r.status,'PASS');assert.equal(r.frameCount,end-start);assert.equal(r.determinism.allFrames,end-start);assert(r.determinism.reversePixelMatch);assert.equal(r.frames[key-start].sha256,native.frames.find(f=>f.globalFrame===key).after.sha256);
  const source=path.join(out,r.result,'movie.mp4'),silent=`${evidence}/${id}.mp4`,privateFile=path.join(out,'narrated-captioned.mp4');
  // Evaluate global ASS on exact integer-ms frame clocks, then restore local PTS.
  const filters=`settb=1/1000,setpts=trunc((N+${start})*1000/30)+1,ass=stories/names100/counter/generated/p5-editorial.ass,ass=stories/names100/captions/generated/S4.ass,settb=1/30,setpts=N,setsar=1`;
  const cuts=r.shots.slice(1).map(s=>s.start/30),args=['-y','-v','error','-i',source,'-vf',filters,'-frames:v',String(end-start),'-r','30','-c:v','libx264','-threads','2','-preset','medium','-crf','20','-profile:v','main','-level:v','3.1','-pix_fmt','yuv420p',...(cuts.length?['-force_key_frames',cuts.join(',')]:[]),'-movflags','+faststart','-an',silent];await run('ffmpeg',args);
  const plan={width:720,height:1280,fps:30,frameCount:end-start,shots:r.shots},verification=await verifyVideo(plan,silent,server,browser),clip={id,start,end,frameCount:end-start,duration:(end-start)/30,sourceStart:b.start,sourceSha256:r.shotListSha256,cleanSha256:r.mp4Sha256,sha256:hash(await readFile(silent)),file:silent,verification,allReversePixels:true,frames:r.frames.map((f,i)=>({globalFrame:start+i,sha256:f.sha256,state:f.state})),nativeKeyMatches:key};
  if(wav){await run('ffmpeg',['-y','-v','error','-i',silent,'-i',wav,'-map','0:v:0','-map','1:a:0','-af',`atrim=start_sample=${start*1470}:end_sample=${end*1470},asetpts=PTS-STARTPTS`,'-c:v','copy','-c:a','aac','-b:a','192k','-movflags','+faststart',privateFile]);clip.originalAudio={file:privateFile,sha256:hash(await readFile(privateFile)),sampleStart:start*1470,sampleEnd:end*1470,verification:await verifyVideo(plan,privateFile,server,browser)};}
  report.clips.push(clip);console.log(`PASS native${id}: ${end-start} frames; all reverse pixels, decode/PTS/cuts/playback; original sample-offset audio${!!wav}`);
 }
 report.status='PASS';await writeFile(`${evidence}/motion.json`,JSON.stringify(report,null,2)+'\n');
}finally{if(browser)await browser.close();await server.close();}
