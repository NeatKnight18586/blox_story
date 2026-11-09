import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {chromium} from 'playwright';
import {loadAssembly} from './s4-story.js';
import {blockFor,openBlock,hash} from './names100.js';
import {startServer} from './pipeline/server.js';
const out='renders/names100-s4-gate';await mkdir(out,{recursive:true});await mkdir('evidence/names100-s4',{recursive:true});
const before=await loadAssembly(undefined,{background:false}),after=await loadAssembly(),server=await startServer(process.cwd()),frames=[];let browser;
try{
 browser=await chromium.launch({headless:true,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 for(const g of [30,700,1392,1628]){
  const pair={globalFrame:g,cameraChanged:g===30};
  for(const [name,story] of [['before',before],['after',after]]){
   const b=blockFor(story,g),page=await openBlock(browser,server,b,720,1280);
   const result=await page.evaluate(f=>{const p=__production,state=p.renderFrame(f),gl=p.renderer.getContext();return {png:p.renderer.domElement.toDataURL().split(',')[1],state,width:gl.drawingBufferWidth,height:gl.drawingBufferHeight,pixelRatio:p.renderer.getPixelRatio(),background:p.background?.group.children.map(o=>o.name)??[]};},g-b.start);
   const png=Buffer.from(result.png,'base64');delete result.png;assert.equal(result.width,720);assert.equal(result.height,1280);assert.equal(result.pixelRatio,1);assert(result.state.identity);await writeFile(`${out}/${name}-${g}.png`,png);pair[name]={...result,sha256:hash(png)};await page.close();
  }
  if(g===700)assert.equal(pair.before.sha256,pair.after.sha256,'Bedroom must be pixel identical');
  frames.push(pair);console.log('PASS paired native S4A',g);
 }
 await writeFile('evidence/names100-s4/environment-gate.json',JSON.stringify({status:'CAPTURED_PENDING_VISUAL_REVIEW',browser:browser.version(),nativeSize:[720,1280],upscaled:false,frames},null,2)+'\n');
}finally{if(browser)await browser.close();await server.close();}
