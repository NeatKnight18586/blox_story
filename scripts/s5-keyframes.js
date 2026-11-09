import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {chromium} from 'playwright';
import {loadAssembly} from './s4-story.js';
import {loadSpeechStory} from './s5-story.js';
import {blockFor,openBlock,hash} from './names100.js';
import {startServer} from './pipeline/server.js';
const before=await loadAssembly(),after=await loadSpeechStory(),server=await startServer(process.cwd()),out='renders/names100-s5-stills',evidence='evidence/names100-s5',frames=[],errors=[];await mkdir(out,{recursive:true});await mkdir(evidence,{recursive:true});let browser,pages=[],current;
try{
 browser=await chromium.launch({headless:true,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 for(const g of [30,780,1115,1232,1248,1392,1600]){
  const b=blockFor(before,g);if(current!==b.id){for(const p of pages)await p.close();pages=[];for(const story of [before,after]){const p=await openBlock(browser,server,blockFor(story,g),720,1280);p.on('pageerror',e=>errors.push(e.message));pages.push(p);}current=b.id;}
  const pair={globalFrame:g,cameraChanged:false};
  for(const [i,kind]of ['before','after'].entries()){
   const r=await pages[i].evaluate(f=>{const p=__production,state=p.renderFrame(f),gl=p.renderer.getContext(),layer=p.speaking;return {state,png:p.renderer.domElement.toDataURL().split(',')[1],width:gl.drawingBufferWidth,height:gl.drawingBufferHeight,pixelRatio:p.renderer.getPixelRatio(),active:layer?Object.values(layer.meshes).filter(m=>layer.group.visible&&m.visible).map(m=>m.name):[],baseMouthVisible:p.avatars.eli?.faceLayer?.getObjectByName('mouth')?.visible??null};},g-b.start);
   const png=Buffer.from(r.png,'base64');delete r.png;assert.equal(r.width,720);assert.equal(r.height,1280);assert.equal(r.pixelRatio,1);assert(r.state.identity);await writeFile(`${out}/${kind}-${g}.png`,png);pair[kind]={...r,sha256:hash(png)};
  }
  assert.deepEqual(pair.before.state,pair.after.state);
  if([30,1115,1248,1392,1600].includes(g))assert.equal(pair.before.sha256,pair.after.sha256,'Silent/approved environment control must match');
  if([780,1232].includes(g)){
   const r=await pages[1].evaluate(({other,f})=>{const p=__production;p.renderFrame(other);p.renderFrame(f);return p.renderer.domElement.toDataURL().split(',')[1];},{other:b.end-b.start-1,f:g-b.start});assert.equal(hash(Buffer.from(r,'base64')),pair.after.sha256);pair.nativeReversePixelMatch=true;
  }
  frames.push(pair);console.log('PASS genuine native speaking pair',g);
 }
 assert.deepEqual(errors,[]);await writeFile(`${evidence}/native-keyframes.json`,JSON.stringify({status:'CAPTURED_PENDING_REVIEW',native:[720,1280],pixelRatio:1,upscaled:false,browser:browser.version(),frames,errors},null,2)+'\n');
}finally{for(const p of pages)await p.close().catch(()=>{});if(browser)await browser.close();await server.close();}
