import {constants} from 'node:fs';
import {lstat,mkdir,readdir,open,rename,unlink,statfs} from 'node:fs/promises';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import {hostname} from 'node:os';
export async function safePath(value){
 const absolute=path.resolve(value);let current=path.parse(absolute).root;
 for(const component of absolute.slice(current.length).split(path.sep).filter(Boolean)){
  current=path.join(current,component);try{const s=await lstat(current);if(s.isSymbolicLink()||s.isFile()&&s.nlink!==1)throw new Error(`Unsafe linked path: ${current}`);}catch(e){if(e.code!=='ENOENT')throw e;}
 }
 return absolute;
}
export async function safeRead(file){
 await safePath(file);const handle=await open(file,constants.O_RDONLY|constants.O_NOFOLLOW);
 try{const s=await handle.stat();if(!s.isFile()||s.nlink!==1||s.size>32*1024*1024)throw new Error('Unsafe or oversized cache file');return await handle.readFile();}finally{await handle.close();}
}
export async function atomicWrite(file,data){
 await safePath(file);await mkdir(path.dirname(file),{recursive:true});await safePath(path.dirname(file));
 const temp=path.join(path.dirname(file),`.write-${randomUUID()}`),handle=await open(temp,'wx',0o600);
 try{await handle.writeFile(data);await handle.sync();}finally{await handle.close();}
 try{await safePath(file);await rename(temp,file);}catch(e){await unlink(temp).catch(()=>{});throw e;}
}
export async function prepareOutput(directory){
 const out=await safePath(directory);await mkdir(out,{recursive:true});await safePath(out);
 const marker=path.join(out,'.p1-owner.json');
 try{const data=JSON.parse(await safeRead(marker));if(data.format!=='blox-story-p1'||data.version!==1)throw new Error('Unrecognized output ownership marker');}
 catch(e){if(e.code!=='ENOENT')throw e;if((await readdir(out)).length)throw new Error('Refusing nonempty unowned output directory');const h=await open(marker,'wx',0o600);try{await h.writeFile(JSON.stringify({format:'blox-story-p1',version:1}));await h.sync();}finally{await h.close();}}
 return out;
}
export async function acquireLock(out){
 const file=path.join(out,'.p1-lock.json'),nonce=randomUUID();
 for(let attempt=0;attempt<2;attempt++){
  await safePath(file);
  try{const h=await open(file,'wx',0o600);try{await h.writeFile(JSON.stringify({pid:process.pid,host:hostname(),nonce}));await h.sync();}finally{await h.close();}
   return async()=>{const data=JSON.parse(await safeRead(file));if(data.nonce!==nonce)throw new Error('Output lock ownership changed');await unlink(file);};
  }catch(e){if(e.code!=='EEXIST')throw e;const before=await lstat(file),data=JSON.parse(await safeRead(file));if(data.host!==hostname()||!Number.isInteger(data.pid)||data.pid<=0)throw new Error('Cannot reclaim foreign/invalid output lock');let dead=false;try{process.kill(data.pid,0);}catch(error){if(error.code==='ESRCH')dead=true;else throw error;}if(!dead)throw new Error(`Output is locked by live PID ${data.pid}`);const after=await lstat(file);if(before.ino!==after.ino||before.mtimeMs!==after.mtimeMs)throw new Error('Lock changed during stale-lock check');await unlink(file);}
 }
 throw new Error('Could not acquire output lock');
}
export async function directoryBytes(dir){
 await safePath(dir);let total=0;for(const name of await readdir(dir)){const file=path.join(dir,name);await safePath(file);const s=await lstat(file);total+=s.isDirectory()?await directoryBytes(file):s.size;}return total;
}
export async function checkBudget(dir,bytes,budget){
 if(bytes>budget)throw new Error('Temporary cache budget exceeded; existing output preserved');const disk=await statfs(dir);if(Number(disk.bavail)*Number(disk.bsize)<1024*1024)throw new Error('Insufficient free disk space');
}
