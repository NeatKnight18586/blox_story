// Eight bounded native shots; five legacy overlays share the exact clean scene.
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {chromium} from 'playwright';
import {loadStory,blockFor,openBlock,hash} from './names100.js';
import {loadCounterClock} from './counter-clock.js';
import {startServer} from './pipeline/server.js';
const globals=[145,850,1248,1528,1529,700,1392,1628],comparison=new Set(globals.slice(0,5)),out='evidence/names100-p4',raw='renders/names100-p4-baseline';await mkdir(out,{recursive:true});await mkdir(raw,{recursive:true});
const story=await loadStory(),server=await startServer(process.cwd()),frames=[],errors=[];let browser,page,current;
try{
 browser=await chromium.launch({headless:true,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 for(const g of [...globals].sort((a,b)=>a-b)){const b=blockFor(story,g);if(current!==b.id){if(page)await page.close();const input=JSON.parse(await readFile(b.id==='ending'?'stories/names100/s3b-ending.json':b.file));input.counterMode='clean';page=await openBlock(browser,server,{input},720,1280);page.on('pageerror',e=>errors.push(e.message));current=b.id;}
 const r=await page.evaluate(({local,legacy})=>{const p=__production,state=p.renderFrame(local),gl=p.renderer.getContext(),ext=gl.getExtension('WEBGL_debug_renderer_info');const clean=p.renderer.domElement.toDataURL().split(',')[1],fx=[p.reveal,p.ending,p.opening,p.look].filter(f=>f?.overlay?.panel);let old=null;if(legacy){for(const f of fx){f.overlay.panel.visible=true;f.draw(p.renderer);f.overlay.panel.visible=false;}old=p.renderer.domElement.toDataURL().split(',')[1];}
 const before=JSON.stringify(state);const repeat=p.renderFrame(local);return {state,clean,legacy:old,repeat:p.renderer.domElement.toDataURL().split(',')[1],repeatState:before===JSON.stringify(repeat),width:gl.drawingBufferWidth,height:gl.drawingBufferHeight,pixelRatio:p.renderer.getPixelRatio(),rendererSize:p.renderer.getSize({set(x,y){return [x,y];}}),backend:gl.getParameter(ext.UNMASKED_RENDERER_WEBGL),panelsHidden:fx.every(f=>!f.overlay.panel.visible)};},{local:g-b.start,legacy:comparison.has(g)});
 const png=Buffer.from(r.clean,'base64');assert.equal(png.readUInt32BE(16),720);assert.equal(png.readUInt32BE(20),1280);assert(r.width===720&&r.height===1280&&r.pixelRatio===1&&r.panelsHidden&&r.repeatState&&r.state.identity);assert.equal(hash(png),hash(Buffer.from(r.repeat,'base64')));
 await writeFile(`${out}/clean-${g}.png`,png);if(r.legacy)await writeFile(`${raw}/legacy-${g}.png`,Buffer.from(r.legacy,'base64'));delete r.clean;delete r.repeat;delete r.legacy;frames.push({globalFrame:g,sourceFile:b.id==='ending'?'stories/names100/s3b-ending.json':b.file,cleanSha256:hash(png),comparison:comparison.has(g),...r});console.log('Native clean720x1280 global',g);
 }
 assert.deepEqual(errors,[]);await writeFile(`${out}/counter-clock.json`,JSON.stringify(await loadCounterClock())+'\n');await writeFile(`${out}/native-captures.json`,JSON.stringify({status:'PASS',browser:browser.version(),uniqueNativeFrames:8,comparisonFrames:5,upscaled:false,nativeFramebuffer:[720,1280],frames,errors},null,2)+'\n');
}finally{if(browser)await browser.close();await server.close();}
