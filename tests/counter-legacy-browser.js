import assert from 'node:assert/strict';import {readFile,writeFile} from 'node:fs/promises';import {chromium} from 'playwright';
import {openBlock,hash} from '../scripts/names100.js';import {startServer} from '../scripts/pipeline/server.js';
const server=await startServer(process.cwd());let browser;const checked=[];
try{browser=await chromium.launch({headless:true,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});const old=JSON.parse(await readFile('evidence/names100-s2/keyframes.json'));
 for(const [file,g] of [['s2-rule',145],['s2-reveal',850],['s2-ending',1248],['s2-ending',1529]]){
  const input=JSON.parse(await readFile(`stories/names100/${file}.json`)),start=(input.opening??input.reveal??input.ending).globalStart;
  for(const mode of [undefined,'legacy']){if(mode)input.counterMode=mode;const page=await openBlock(browser,server,{input},180,320);const png=await page.evaluate(local=>{__production.renderFrame(local);return __production.renderer.domElement.toDataURL().split(',')[1];},g-start);const sha256=hash(Buffer.from(png,'base64'));assert.equal(sha256,old.frames.find(f=>f.globalFrame===g).sha256);checked.push({g,mode:mode??'default',sha256});await page.close();}
 }
 await writeFile('evidence/names100-p4/legacy-regression.json',JSON.stringify({status:'PASS',checked,archivedPixelsUnchanged:true},null,2)+'\n');console.log('PASS four archived legacy frames in default and explicit legacy modes,8 actual WebGL golden matches');
}finally{if(browser)await browser.close();await server.close();}
