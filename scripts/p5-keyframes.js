// Bounded native finish proof; raw captures remain under ignored renders/.
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {chromium} from 'playwright';
import {loadStory,blockFor,openBlock,hash} from './names100.js';
import {startServer} from './pipeline/server.js';
const gs=[700,1392,1528,1529,1628],out='renders/names100-p5-stills',evidence='evidence/names100-p5';
await mkdir(out,{recursive:true});await mkdir(evidence,{recursive:true});
const story=await loadStory(),server=await startServer(process.cwd()),frames=[],reverse=[],errors=[];let browser,page,current;
try{
 browser=await chromium.launch({headless:true,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 for(const g of gs){
  const b=blockFor(story,g);
  if(current!==b.id){if(page)await page.close();const input=JSON.parse(await readFile(b.id==='ending'?'stories/names100/s3b-ending.json':b.file));input.counterMode='clean';input.finish='p5';page=await openBlock(browser,server,{input},720,1280);page.on('pageerror',e=>errors.push(e.message));current=b.id;}
  const result=await page.evaluate(f=>{
   const p=__production,state=p.renderFrame(f),gl=p.renderer.getContext(),ext=gl.getExtension('WEBGL_debug_renderer_info');
   const png=p.renderer.domElement.toDataURL().split(',')[1];
   const surfaces=[...p.finish.helpers].map(([o,d])=>({source:o.name,active:d.visible,sharedGeometry:d.geometry===o.geometry,depthWrite:d.material.depthWrite,colorWrite:d.material.colorWrite}));
   return {png,state,width:gl.drawingBufferWidth,height:gl.drawingBufferHeight,pixelRatio:p.renderer.getPixelRatio(),backend:gl.getParameter(ext.UNMASKED_RENDERER_WEBGL),surfaces,shadows:p.finish.lights.map(l=>({map:l.shadow.mapSize.toArray(),radius:l.shadow.radius,bias:l.shadow.bias,normalBias:l.shadow.normalBias,frustum:[l.shadow.camera.left,l.shadow.camera.right,l.shadow.camera.bottom,l.shadow.camera.top]}))};
  },g-b.start);
  const png=Buffer.from(result.png,'base64');delete result.png;
  assert.equal(result.width,720);assert.equal(result.height,1280);assert.equal(result.pixelRatio,1);assert.equal(png.readUInt32BE(16),720);assert.equal(png.readUInt32BE(20),1280);assert(result.state.identity);assert(result.surfaces.every(s=>s.sharedGeometry&&!s.colorWrite&&s.depthWrite));
  await writeFile(`${out}/clean-${g}.png`,png);frames.push({globalFrame:g,sha256:hash(png),...result});
  // Reverse from restored/final states; real framebuffer must exactly repeat.
  const other=b.id==='reveal'?926-b.start:1640-b.start;
  const again=await page.evaluate(({other,f})=>{const p=__production;p.renderFrame(other);const state=p.renderFrame(f);return {state,png:p.renderer.domElement.toDataURL().split(',')[1]};},{other,f:g-b.start});
  assert.deepEqual(again.state,result.state);assert.equal(hash(Buffer.from(again.png,'base64')),hash(png));reverse.push({globalFrame:g,from:other+b.start,pixels:true,state:true});
  console.log('PASS native finish',g);
 }
 assert.deepEqual(errors,[]);
 await writeFile(`${evidence}/native-captures.json`,JSON.stringify({status:'PASS',browser:browser.version(),upscaled:false,uniqueNativeFrames:5,dimensions:[720,1280],frames,reverse,errors},null,2)+'\n');
}finally{if(browser)await browser.close();await server.close();}
