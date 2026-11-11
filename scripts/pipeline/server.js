import http from 'node:http';
import path from 'node:path';
import {realpath,stat} from 'node:fs/promises';
import {createReadStream} from 'node:fs';
const types={'.html':'text/html','.js':'text/javascript','.json':'application/json','.png':'image/png','.glb':'model/gltf-binary','.mp4':'video/mp4','.md':'text/plain'};
export async function startServer(root){
 root=await realpath(root);let video=null;
 const server=http.createServer(async(req,res)=>{
  try{
   if(!['GET','HEAD'].includes(req.method)){res.writeHead(405).end();return;}
   const url=new URL(req.url,'http://localhost');let file;
   if(url.pathname==='/__p1_player'){res.writeHead(200,{'content-type':'text/html'}).end('<video muted playsinline preload="auto" src="/__p1_video"></video>');return;}
   if(url.pathname==='/__p1_video'){if(!video)throw new Error('Video not ready');file=video;}
   else{const relative=decodeURIComponent(url.pathname);if(relative.split('/').some(p=>p.startsWith('.')))throw new Error('Hidden path');file=path.resolve(root,'.'+relative);if((await stat(file)).isDirectory())file=path.join(file,'index.html');file=await realpath(file);if(!file.startsWith(root+path.sep))throw new Error('Outside server root');}
   const size=(await stat(file)).size,type=types[path.extname(file)];if(!type)throw new Error('Unsupported resource');
   let start=0,end=size-1,status=200;const range=req.headers.range;
   if(range){const match=/^bytes=(\d+)-(\d*)$/.exec(range);if(!match){res.writeHead(416,{'content-range':`bytes */${size}`}).end();return;}start=Number(match[1]);end=match[2]?Math.min(Number(match[2]),end):end;if(start>end||start>=size){res.writeHead(416,{'content-range':`bytes */${size}`}).end();return;}status=206;}
   res.writeHead(status,{'content-type':type,'content-length':end-start+1,'accept-ranges':'bytes','cache-control':'no-store',...(status===206?{'content-range':`bytes ${start}-${end}/${size}`}:{})});
   if(req.method==='HEAD')res.end();else{const stream=createReadStream(file,{start,end});stream.on('error',()=>res.destroy());stream.pipe(res);}
  }catch{if(!res.headersSent)res.writeHead(404).end();else res.destroy();}
 });
 await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});
 return {url:`http://127.0.0.1:${server.address().port}`,setVideo(file){video=file;},close:()=>new Promise(resolve=>{server.close(resolve);server.closeAllConnections();})};
}
