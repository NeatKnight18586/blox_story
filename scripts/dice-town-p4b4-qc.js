import{chromium}from'playwright';import{startServer}from'./pipeline/server.js';import{writeFile}from'node:fs/promises';import assert from'node:assert/strict';
const start=performance.now(),server=await startServer(process.cwd()),b=await chromium.launch({args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});try{const page=await b.newPage({viewport:{width:720,height:1280}});await page.goto(server.url+'/production/dice-town-p4b4/');await page.waitForFunction(()=>window.__backstory);const q=await page.evaluate(async()=>{
const T=await import('three'),{OBB}=await import('three/addons/math/OBB.js'),e=__backstory,{scene,renderer,camera,pip,leo,pin,photo,photoHold,book,cover}=e;renderer.render=()=>{};const errors=[];
const points=m=>{const a=m.geometry.attributes.position,r=[];for(let i=0;i<a.count;i++)r.push(new T.Vector3().fromBufferAttribute(a,i).applyMatrix4(m.matrixWorld));return r;};
const obb=m=>{m.geometry.computeBoundingBox();return new OBB().fromBox3(m.geometry.boundingBox).applyMatrix4(m.matrixWorld);};
const extent=m=>{const a=points(m).map(v=>v.project(camera));return{minX:Math.min(...a.map(p=>p.x)),maxX:Math.max(...a.map(p=>p.x)),minY:Math.min(...a.map(p=>p.y)),maxY:Math.max(...a.map(p=>p.y))};};
const inFrame=m=>{const a=extent(m);return a.minX>-.99&&a.maxX<.99&&a.minY>-.99&&a.maxY<.99;};
let identity=true,maxCrankGap=0,minGripRadialClearance=Infinity,minPhotoFaceGap=Infinity,maxPinPalmPenetration=0,minBookPhoneWidth=Infinity,pinInitialError=Infinity,pinFaceOcclusions=0,photoFaceOcclusions=0,maxFootStepError=0;
const frames=[];for(const shot of Object.keys(e.counts))for(let f=0;f<15;f++){
const s=e.render(shot,f,720);identity&&=s.identity;let count=0;scene.traverse(o=>{if(o.name==='shared_locking_pin')count++;});if(count!==1)errors.push(`${shot}:${f}:duplicate pin`);
if(shot==='D17'){
const palm=new T.Vector3(0,-.85,.5).applyMatrix4(pip.parts.leftArm.matrixWorld),grip=new T.Box3().setFromObject(e.grip);maxCrankGap=Math.max(maxCrankGap,Math.abs(grip.min.y-palm.y));for(const p of points(pip.parts.leftArm))if(p.z>=1.35&&p.z<=2.05)minGripRadialClearance=Math.min(minGripRadialClearance,Math.hypot(p.x+2.15,p.y-4.6)-.16);
if(!inFrame(pip.parts.head)||!inFrame(pip.parts.leftArm)||!inFrame(e.grip))errors.push(`D17:${f}:framing`);
}
if(['D18','D20','D21'].includes(shot)){
if(!inFrame(photo)||!inFrame(pip.parts.head))errors.push(`${shot}:${f}:photo/face frame`);
for(const body of Object.values(pip.parts))if(obb(photo).intersectsOBB(obb(body),-1e-6))errors.push(`${shot}:${f}:photo/${body.name}`);
const box=new T.Box3().setFromObject(photo),head=new T.Box3().setFromObject(pip.parts.head);minPhotoFaceGap=Math.min(minPhotoFaceGap,box.distanceToPoint(head.getCenter(new T.Vector3())));
const occluders=[];photoHold.traverse(o=>{if(o.isMesh)occluders.push(o);});for(const m of pip.faceLayer.children.filter(m=>m.name.startsWith('eye')||m.name==='mouth')){const v=m.getWorldPosition(new T.Vector3()),ray=new T.Raycaster(camera.position,v.clone().sub(camera.position).normalize());if(ray.intersectObjects(occluders,false).some(h=>h.distance<camera.position.distanceTo(v)-.001))photoFaceOcclusions++;}
}
if(shot==='D22'){
if(s.bookCover!==-2)errors.push(`D22:${f}:cover closed`);for(const m of [book,cover]){if(!inFrame(m))errors.push(`D22:${f}:book clipped`);for(const part of Object.values(leo.parts))if(obb(m).intersectsOBB(obb(part),-1e-5))errors.push(`D22:${f}:book/${part.name}`);}
if(!inFrame(leo.parts.head))errors.push(`D22:${f}:head clipped`);const x=extent(book),y=extent(cover);minBookPhoneWidth=Math.min(minBookPhoneWidth,(Math.max(x.maxX,y.maxX)-Math.min(x.minX,y.minX))*195);
}
if(shot==='D24'){
if(f===0)pinInitialError=pin.getWorldPosition(new T.Vector3()).distanceTo(e.received.pinPosition);
const shaft=pin.getObjectByName('shaft'),arm=pip.parts.leftArm;for(const part of Object.values(pip.parts))if(obb(shaft).intersectsOBB(obb(part),-1e-6))errors.push(`D24:${f}:shaft/${part.name}`);
if(!inFrame(pip.parts.head))errors.push(`D24:${f}:head frame`);pin.traverse(m=>{if(m.isMesh&&!inFrame(m))errors.push(`D24:${f}:pin frame`);});
const occluders=[];pin.traverse(m=>{if(m.isMesh)occluders.push(m);});for(const m of pip.faceLayer.children.filter(m=>m.name.startsWith('eye')||m.name==='mouth')){const v=m.getWorldPosition(new T.Vector3()),ray=new T.Raycaster(camera.position,v.clone().sub(camera.position).normalize());if(ray.intersectObjects(occluders,false).some(h=>h.distance<camera.position.distanceTo(v)-.001))pinFaceOcclusions++;}
}
if(shot!=='D22'){const footMin=Math.min(...['leftLeg','rightLeg'].flatMap(n=>points(pip.parts[n]).map(p=>p.y)));const stepTop=new T.Box3().setFromObject(e.step).max.y;maxFootStepError=Math.max(maxFootStepError,Math.abs(footMin-stepTop));}
frames.push(s);
}
return{errors,identity,framesChecked:frames.length,childScale:pip.root.scale.toArray(),sourcePhotoTexture:[photo.material.map.image.width,photo.material.map.image.height],maxCrankGap,minGripRadialClearance,minPhotoFaceCenterDistance:minPhotoFaceGap,minBookPhoneWidth,pinInitialWorldPoseError:pinInitialError,maxFootStepError,pinFaceOcclusions,photoFaceOcclusions,frames,method:'Actual vertex projections, transformed mesh OBB overlap checks, material palm/handle fit, actual cylinder clearance and camera-to-facial-feature raycasts. Intended photo paper/hinge attachments excluded. No general physics claims.'};});
const gatePage=await b.newPage({viewport:{width:720,height:1280}});await gatePage.goto(server.url+'/production/dice-town-p3b4/');await gatePage.waitForFunction(()=>window.__grounding);const gate=await gatePage.evaluate(()=>{__grounding.render('closed',true,720);return{angles:__grounding.leaves.map(x=>x.hinge.rotation.y),size:[__grounding.renderer.domElement.width,__grounding.renderer.domElement.height]};});await gatePage.screenshot({path:'evidence/dice-town-p4b4/D21-gate.png'});await gatePage.close();
const r={...q,gate,wallSeconds:(performance.now()-start)/1000,status:'CHECKING'};const out='evidence/dice-town-p4b4/geometry.json';await writeFile(out,JSON.stringify(r,null,2));assert.deepEqual(q.errors,[]);assert(q.identity);assert.deepEqual(q.childScale,[.65,.65,.65]);assert(q.maxCrankGap<.012&&q.minGripRadialClearance>-.001);assert(q.pinInitialWorldPoseError<1e-12);assert(q.maxFootStepError<1e-5);assert(q.pinFaceOcclusions===0&&q.photoFaceOcclusions===0);assert(q.minBookPhoneWidth>40);assert.deepEqual(gate.angles,[0,0]);assert.deepEqual(gate.size,[720,1280]);r.status='PASS';await writeFile(out,JSON.stringify(r,null,2));console.log('PASS90 pose geometry, crank fit, photo/face/frame clearance, open notebook, same received pin and closed gate');}finally{await b.close();await server.close();}
