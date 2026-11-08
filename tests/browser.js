import {chromium} from 'playwright';
import assert from 'node:assert/strict';
const browser=await chromium.launch({headless:true,args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const page=await browser.newPage({viewport:{width:768,height:920},deviceScaleFactor:1});const errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.goto('http://127.0.0.1:8000');await page.waitForFunction(()=>!!window.__blockstory);
const identity=await page.evaluate(()=>{window.originalParts=Object.values(__blockstory.avatar.parts);return __blockstory.renderer.getContext().getParameter(__blockstory.renderer.getContext().VERSION);});
for(const [name,view,face,cosmetic] of [['01-front','front','classic_smile',''],['02-threequarter','threequarter','classic_smile',''],['03-side','side','classic_smile',''],['04-face','closeup','classic_smile',''],['05-blank','front','blank',''],['06-cap','threequarter','classic_smile','cap'],['07-removed','threequarter','classic_smile',''],['08-worried','closeup','worried','']]){
 await page.selectOption('#view',view);await page.selectOption('#face',face);await page.selectOption('#cosmetic',cosmetic);await page.locator('canvas').screenshot({path:`evidence/${name}.png`});
}
await page.selectOption('#pose','look_down');await page.selectOption('#pose','walk_demo');await page.click('#play');await page.waitForTimeout(100);await page.click('#play');await page.selectOption('#pose','neutral');
assert(await page.evaluate(()=>Object.values(__blockstory.avatar.parts).every((p,i)=>p===originalParts[i])&&__blockstory.avatar.cosmetic===null));
await page.setViewportSize({width:390,height:844});await page.selectOption('#view','front');await page.selectOption('#face','classic_smile');await page.screenshot({path:'evidence/09-mobile.png'});
await page.evaluate(()=>{document.querySelector('#stage').style.height='200px';document.querySelector('#stage').style.minHeight='200px';window.dispatchEvent(new Event('resize'));});await page.locator('canvas').screenshot({path:'evidence/10-small.png'});
assert.deepEqual(errors,[]);console.log('PASS: WebGL '+identity+', controls, retained mesh identity, cosmetic removal, mobile and 10 captures; no page errors');await browser.close();
