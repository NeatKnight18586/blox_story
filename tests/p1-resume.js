import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdtemp,readFile,writeFile,rm} from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
const temp=await mkdtemp(path.join(os.tmpdir(),'blox-p1-resume-')),out=path.join(temp,'output'),file=path.join(temp,'shots.json');
const json=async p=>JSON.parse(await readFile(p,'utf8'));
const fixture=JSON.parse(await readFile('production/not-today.json'));fixture.output={width:180,height:320,fps:30};fixture.shots=[{...fixture.shots[0],end:12}];fixture.events=[];fixture.props=[];
await writeFile(file,JSON.stringify(fixture));
async function run(extra=[],interrupt=false){
 return await new Promise((resolve,reject)=>{const child=spawn(process.execPath,['scripts/render-shot-list.js','--shots',file,'--out',out,...extra]);let stdout='',stderr='',signaled=false;child.stdout.on('data',data=>{stdout+=data;if(interrupt&&!signaled&&stdout.includes('Captured 1/')){signaled=true;child.kill('SIGTERM');}});child.stderr.on('data',data=>stderr+=data);child.on('error',reject);child.on('close',code=>resolve({code,stdout,stderr,signaled}));});
}
try{
 const interrupted=await run([],true);assert(interrupted.signaled);assert.equal(interrupted.code,130,interrupted.stderr);let report=await json(path.join(out,'last-run.json'));assert.equal(report.status,'PAUSED');assert(report.frames.length>0&&report.frames.length<12);
 const key=report.jobKey,cache=path.join(out,'.p1-cache',key),first=report.frames[0].file;await writeFile(path.join(cache,first),'corrupt');
 const resumed=await run();assert.equal(resumed.code,0,resumed.stderr);report=await json(path.join(out,'last-run.json'));assert.equal(report.status,'PASS');assert.equal(report.jobKey,key);assert.equal(report.cache.repaired,1);assert.equal(report.cache.reused+report.cache.rendered,12);assert(report.determinism.reversePixelMatch);assert.equal(report.verification.decode.frames,12);assert(report.verification.playback.advancedTo>0);
 const movieHash=report.mp4Sha256;const cached=await run();assert.equal(cached.code,0,cached.stderr);report=await json(path.join(out,'last-run.json'));assert.equal(report.cache.reused,12);assert.equal(report.cache.rendered,0);assert.equal(report.mp4Sha256,movieHash);
 const good=await readFile(path.join(out,'latest.json'),'utf8');const failed=await run(['--max-temp-mb','0.000001']);assert.equal(failed.code,1);assert.match(failed.stderr,/budget/);assert.equal(await readFile(path.join(out,'latest.json'),'utf8'),good);
 fixture.title+=' changed';await writeFile(file,JSON.stringify(fixture));const changed=await run(['--stop-after','1']);assert.equal(changed.code,0,changed.stderr);report=await json(path.join(out,'last-run.json'));assert.notEqual(report.jobKey,key);assert.equal(report.cache.reused,0);assert.equal(report.cache.rendered,1);assert.equal(await readFile(path.join(out,'latest.json'),'utf8'),good);
 console.log('PASS P1 real WebGL/MP4 recovery: SIGTERM checkpoint, corrupt-frame repair, complete resume, 12/12 cache reuse, input invalidation, failed/paused publication preserves verified latest; full decode and native browser playback');
}finally{await rm(temp,{recursive:true,force:true});}
