import assert from 'node:assert/strict';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {chromium} from 'playwright';
import {loadAssembly} from './s4-story.js';
import {blockFor,openBlock,hash,storyEngineHash} from './names100.js';
import {startServer} from './pipeline/server.js';
const story=await loadAssembly(),server=await startServer(process.cwd()),checks=[],errors=[],out='renders/names100-s4-probes';await mkdir(out,{recursive:true});let browser,page,current;
const gs=[788,789,850,889,890,926,938,944,945,992,1202,1296,1371,1406,1450,1490,1528,1529,1546,1640];
try{
 browser=await chromium.launch({headless:true,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 for(const g of gs){
  const b=blockFor(story,g);if(b.id!==current){if(page)await page.close();page=await openBlock(browser,server,b,180,320);page.on('pageerror',e=>errors.push(e.message));current=b.id;}
  const r=await page.evaluate(f=>{const p=__production,state=p.renderFrame(f);return {state,png:p.renderer.domElement.toDataURL().split(',')[1],hidden:[p.look,p.opening,p.reveal,p.ending].filter(x=>x?.overlay?.panel).every(x=>!x.overlay.panel.visible)};},g-b.start);
  assert(r.hidden&&r.state.identity);const cue=r.state.opening??r.state.reveal??r.state.ending;assert.equal(cue.globalFrame,g);if([788,789,1528,1529].includes(g))assert.equal(cue.counter,({788:100,789:99,1528:1,1529:0})[g]);
  const other=b.end-b.start-1,repeat=await page.evaluate(({other,f})=>{__production.renderFrame(other);const state=__production.renderFrame(f);return {state,png:__production.renderer.domElement.toDataURL().split(',')[1]};},{other,f:g-b.start});assert.deepEqual(r.state,repeat.state);assert.equal(hash(Buffer.from(r.png,'base64')),hash(Buffer.from(repeat.png,'base64')));
  await writeFile(`${out}/${g}.png`,Buffer.from(r.png,'base64'));checks.push({globalFrame:g,source:b.file,sourceStart:b.start,localFrame:g-b.start,storyShot:story.shots.find(s=>g>=s.start&&g<s.end).id,sha256:hash(Buffer.from(r.png,'base64')),counter:cue.counter,state:r.state,hiddenHud:true,reverseMatch:true});
 }
 assert.deepEqual(errors,[]);await writeFile('evidence/names100-s4/probes.json',JSON.stringify({status:'PASS',browser:browser.version(),checks,errors},null,2)+'\n');
 console.log('PASS20 protected/seam WebGL probes with reverse pixel/state identity; visual review required before gate receipt');
}finally{if(browser)await browser.close();await server.close();}
