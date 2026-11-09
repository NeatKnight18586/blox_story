import assert from 'node:assert/strict';
import {mkdir,writeFile}from'node:fs/promises';
import{chromium}from'playwright';
import{loadSpeechStory}from'./s5-story.js';
import{blockFor,openBlock,hash}from'./names100.js';
import{startServer}from'./pipeline/server.js';
const story=await loadSpeechStory(),server=await startServer(process.cwd()),out='renders/s7-clouds',checks=[];await mkdir(out,{recursive:true});let browser;
try{browser=await chromium.launch({headless:true,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
for(const g of[35,1392,1600]){const b=blockFor(story,g),p=await openBlock(browser,server,{input:{...b.input,environmentStyle:'s7'}},720,1280);const r=await p.evaluate(f=>{const p=__production,s=p.renderFrame(f),cloud=p.scene.getObjectByName('s7_clouds');const old=new cloud.constructor(),template=cloud.children[0].children[0],d=s.ending?.sunrise??0;for(const[x,y,z,w]of[[-12,11,-26,3.5],[12,13,-28,2.9]]){const mat=template.material.clone();mat.color.set(0xf7d4bd);mat.opacity=d*.28;const m=new template.constructor(template.geometry,mat);m.position.set(x,y,z);m.scale.set(w,.5,1.2);m.visible=d>.03;old.add(m);}cloud.parent.add(old);cloud.visible=false;p.renderFrame(f);const before=p.renderer.domElement.toDataURL().split(',')[1];old.removeFromParent();cloud.visible=true;p.renderFrame(f);const after=p.renderer.domElement.toDataURL().split(',')[1];return{before,after,state:s,clumps:cloud.children.length};},g-b.start);assert(r.state.identity);assert.equal(r.clumps,3);for(const k of['before','after'])await writeFile(`${out}/${k}-${g}.png`,Buffer.from(r[k],'base64'));checks.push({g,clumps:r.clumps,before:hash(Buffer.from(r.before,'base64')),after:hash(Buffer.from(r.after,'base64'))});await p.close();}
await writeFile(out+'/checks.json',JSON.stringify(checks,null,2));}finally{if(browser)await browser.close();await server.close();}
