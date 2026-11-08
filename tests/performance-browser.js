import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {chromium} from 'playwright';
import {startServer} from '../scripts/pipeline/server.js';
import {openBlock,hash} from '../scripts/names100.js';
const out='evidence/names100-s3b',raw='renders/names100-s3b-keyframes';
await mkdir(out,{recursive:true});await mkdir(raw,{recursive:true});
const payoffOnly=process.argv.includes('--payoff-only');
const previous=payoffOnly?JSON.parse(await readFile(out+'/keyframes.json')):null;
const targets=payoffOnly?{ending:[1628]}:{shy:[334,427,474],ending:[1300,1366,1388,1420,1470,1490,1528,1562,1628]},frames=previous?previous.frames.filter(f=>!(f.variant==='s3b'&&f.globalFrame===1628)):[],errors=[];
const server=await startServer(process.cwd());let browser;
try{
 browser=await chromium.launch({headless:true,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 for(const [kind,globals] of Object.entries(targets))for(const variant of (payoffOnly?['s3b']:['s2','s3b'])){
  const input=JSON.parse(await readFile(`stories/names100/${variant}-${kind}.json`)),start=kind==='shy'?259:945;
  const page=await openBlock(browser,server,{input},360,640);page.on('pageerror',e=>errors.push(e.message));
  const backend=await page.evaluate(async()=>{window.T=await import('three');window.people=()=>[...Object.entries(__production.avatars),...(__production.ending?__production.world.courtyard.residents:[]).map((a,i)=>[i?'child':'parent',a])];window.references=()=>people().flatMap(([,a])=>[a.root,...Object.values(a.parts),...Object.values(a.pivots),...Object.values(a.parts).flatMap(m=>[m.geometry,m.material])]);window.saved=references();const gl=__production.renderer.getContext(),e=gl.getExtension('WEBGL_debug_renderer_info');return {webgl:gl.getParameter(gl.VERSION),renderer:gl.getParameter(e.UNMASKED_RENDERER_WEBGL)};});
  async function capture(g){return page.evaluate(f=>{const p=__production,state=p.renderFrame(f);p.scene.updateMatrixWorld(true);const v=new T.Vector3(),heads=[],torsos=[];let minBodyY=Infinity;
   for(const [id,a] of people()){let left=Infinity,right=-Infinity,bottom=Infinity,top=-Infinity;for(const m of Object.values(a.parts)){const pos=m.geometry.attributes.position;for(let i=0;i<pos.count;i++){v.fromBufferAttribute(pos,i).applyMatrix4(m.matrixWorld);minBodyY=Math.min(minBodyY,v.y);if(m===a.parts.head){v.project(p.camera);left=Math.min(left,v.x);right=Math.max(right,v.x);bottom=Math.min(bottom,v.y);top=Math.max(top,v.y);}}}heads.push({id,left,right,bottom,top});torsos.push(new T.Box3().setFromObject(a.parts.torso));}
   let maxTorsoOverlap=0;for(let i=0;i<torsos.length;i++)for(let j=i+1;j<torsos.length;j++){const b=torsos[i].clone().intersect(torsos[j]);if(!b.isEmpty()){const s=b.getSize(new T.Vector3());maxTorsoOverlap=Math.max(maxTorsoOverlap,s.x*s.y*s.z);}}
   const e=p.avatars.eli,hand=e.pivots.rightShoulder.localToWorld(new T.Vector3(0,-1.99,0)).project(p.camera);
   const eyes=e.faceLayer.children.filter(o=>o.name.startsWith('eye_')||o.geometry?.type==='SphereGeometry').map(o=>{o.geometry.computeBoundingBox();const point=o.localToWorld(o.geometry.boundingBox.getCenter(new T.Vector3())),ray=new T.Raycaster(p.camera.position,point.sub(p.camera.position).normalize());const hit=ray.intersectObjects(p.scene.children,true).find(({object})=>{if(object.material.colorWrite===false)return false;for(let n=object;n;n=n.parent)if(!n.visible)return false;return true;})?.object;let visible=false;for(let n=hit;n;n=n.parent)if(n===e.faceLayer)visible=true;return {name:o.name,visible,first:hit?.name};});
   return {state,png:p.renderer.domElement.toDataURL().split(',')[1],heads,eyes,handNdc:hand.toArray(),minBodyY,maxTorsoOverlap,bodyCounts:people().map(([id,a])=>[id,Object.keys(a.parts).length]),identity:saved.every((r,i)=>r===references()[i]),eliOpacity:e.parts.head.material.opacity,eliShadow:e.parts.torso.castShadow,eliHeadVisible:e.root.visible&&e.parts.head.visible};
  },g-start);}
  for(const g of globals){const r=await capture(g),png=Buffer.from(r.png,'base64');delete r.png;assert(r.identity&&r.state.identity&&r.minBodyY>=-.01);assert(r.bodyCounts.every(([,n])=>n===6));if(g>=1529)assert(r.eliOpacity>=.78&&r.eliShadow&&r.eliHeadVisible);if(variant==='s3b'&&[1490,1528].includes(g)){assert(r.eyes.length===2&&r.eyes.every(e=>e.visible),JSON.stringify({g,eyes:r.eyes}));assert(Math.abs(r.handNdc[0])<.98&&Math.abs(r.handNdc[1])<.98,'Pre-zero hand must fit');}
   if(variant==='s3b'&&g>=1546){assert(r.heads.filter(h=>['eli','mara'].includes(h.id)).every(h=>h.left>-.98&&h.right<.98&&h.top<.98&&h.bottom>-.98),'Both faces must fit the ending composition');if(g===1628)assert(r.eyes.length===2&&r.eyes.every(e=>e.visible),'Withdrawn Eli must have readable eyes');}
   const file=`${variant}-${g}.png`;await writeFile(`${variant==='s2'?raw:out}/${file}`,png);frames.push({variant,globalFrame:g,file,sha256:hash(png),backend,...r});}
  for(const g of [...globals].reverse()){const r=await capture(g),previous=frames.find(f=>f.variant===variant&&f.globalFrame===g);assert.equal(hash(Buffer.from(r.png,'base64')),previous.sha256);assert.deepEqual(r.state,previous.state);assert.deepEqual(r.heads,previous.heads);assert.deepEqual(r.handNdc,previous.handNdc);}
  if(kind==='ending'&&variant==='s3b'){const a=await capture(1528),b=await capture(1529);assert.equal(a.state.ending.counter,1);assert.equal(b.state.ending.counter,0);assert.equal(a.state.ending.forgotten,0);assert.equal(b.state.ending.forgotten,0);}
  await page.close();
 }
 // Cold baseline images must still match genuine saved S2 evidence exactly.
 const old=JSON.parse(await readFile('evidence/names100-s2/keyframes.json')),golden=[];
 for(const [kind,g] of [['shy',359],['ending',1392],['ending',1600],['ending',992]]){
  const input=JSON.parse(await readFile(`stories/names100/s2-${kind}.json`)),page=await openBlock(browser,server,{input},180,320),png=await page.evaluate(f=>{__production.renderFrame(f);return __production.renderer.domElement.toDataURL().split(',')[1];},g-(kind==='shy'?259:945));
  const sha256=hash(Buffer.from(png,'base64'));assert.equal(sha256,old.frames.find(f=>f.globalFrame===g).sha256);golden.push({globalFrame:g,sha256,match:true});await page.close();if(g===992){const input=JSON.parse(await readFile('stories/names100/s3b-ending.json')),page=await openBlock(browser,server,{input},180,320),png=await page.evaluate(()=>{__production.renderFrame(992-945);return __production.renderer.domElement.toDataURL().split(',')[1];});assert.equal(hash(Buffer.from(png,'base64')),sha256,'S3B must preserve non-target bedroom look');golden.push({globalFrame:992,variant:'s3b',sha256,match:true});await page.close();}
 }
 assert.deepEqual(errors,[]);
 await writeFile(out+'/keyframes.json',JSON.stringify({status:'PASS',reusedUnchangedPairedStills:payoffOnly,scope:'selective stills after verified original-audio mux; perceptual listening and user creative approval remain separate',browser:browser.version(),frames,golden,reversePixelsStatesAndTransformsMatch:true,errors},null,2)+'\n');
 console.log('PASS S3B provisional WebGL stills:12 pairs,reverse pixel/state/transform identity,protected1528/1529,grounding,three unchanged S2 golden hashes');
}finally{if(browser)await browser.close();await server.close();}
