import{chromium}from'playwright';import{startServer}from'./pipeline/server.js';import{writeFile}from'node:fs/promises';import assert from'node:assert/strict';
const server=await startServer(process.cwd()),b=await chromium.launch({args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});const start=performance.now();try{const p=await b.newPage();await p.goto(server.url+'/production/dice-town-p4b3/');await p.waitForFunction(()=>window.__ending);
const r=await p.evaluate(async()=>{
 const T=await import('three'),{OBB}=await import('three/addons/math/OBB.js'),e=__ending,{scene,renderer,camera,gate,leaves,child,leo,hold,cover}=e;const draw=renderer.render;renderer.render=()=>{};
 function obb(m){m.geometry.computeBoundingBox();return new OBB().fromBox3(m.geometry.boundingBox).applyMatrix4(m.matrixWorld);}
 function verts(m){const a=m.geometry.attributes.position,r=[];for(let i=0;i<a.count;i++)r.push(new T.Vector3().fromBufferAttribute(a,i).applyMatrix4(m.matrixWorld));return r;}
 function bodyBounds(m){const b=new T.Box3();for(const p of verts(m))b.expandByPoint(p);return b;}
 function project(m){return verts(m).map(p=>p.project(camera)).reduce((b,p)=>({minX:Math.min(b.minX,p.x),maxX:Math.max(b.maxX,p.x),minY:Math.min(b.minY,p.y),maxY:Math.max(b.maxY,p.y)}),{minX:Infinity,maxX:-Infinity,minY:Infinity,maxY:-Infinity});}
 const errors=[],posts=gate.children.filter(o=>['gate_post','gate_wall_return','continuous_gate_land','continuous_road','gate_threshold'].includes(o.name)),leafMeshes=leaves.flatMap(({hinge})=>hinge.children.filter(m=>m.isMesh&&m.name!=='hinge_plate'));
 let gateMinY=Infinity,originalPostOverlap=false,gatePoseChecks=0;
 e.render('D33',0,720);
 // Quantify legacy closed installation without changing its source or screenshots.
 for(const {hinge,sign} of leaves){hinge.position.x=sign*3;hinge.scale.x=1;}scene.updateMatrixWorld(true);
 originalPostOverlap=leafMeshes.some(m=>posts.filter(p=>p.name==='gate_post').some(p=>obb(m).intersectsOBB(obb(p),1e-9)));
 for(const {hinge,sign}of leaves){hinge.position.x=sign*2.85;hinge.scale.x=.95;}
 for(let frame=0;frame<=260;frame++){
  // Dense 261-position sweep supplements all27 authored motion samples.
  e.render('D33',Math.min(26,Math.floor(frame/10)),720);for(const {hinge,sign}of leaves)hinge.rotation.y=-sign*1.24*frame/260;scene.updateMatrixWorld(true);
  for(const m of leafMeshes){gateMinY=Math.min(gateMinY,bodyBounds(m).min.y);for(const p of posts)if(obb(m).intersectsOBB(obb(p),1e-8))errors.push(`gate:${frame}:${m.name}/${p.name}`);}
  // Leaves intentionally meet at the closed seam; no positive-volume overlap.
  if(frame>0&&obb(leafMeshes[0]).intersectsOBB(obb(leafMeshes[3]),-1e-7))errors.push(`leaf/leaf:${frame}`);
  gatePoseChecks++;
 }
 // Complete body crosses the original leaf planeZ=0. An open gate has no central slab.
 let maxFootDrift=0,sumFootDrift2=0,maxContactError=0,maxPenetration=0,minSwing=Infinity,maxSwing=0,startZ,endZ,startMinZ,endMaxZ,minPipNdc=Infinity,maxPipNdc=-Infinity;const walking=[];
 for(let frame=0;frame<30;frame++){
  e.render('D34',frame,720);const s=e.sample.walk,hip=child.pivots[s.contacts.support[0]==='leftLeg'?'leftHip':'rightHip'];const contact=new T.Vector3(...s.contacts.localPoint).applyMatrix4(hip.matrixWorld),anchor=new T.Vector3(...s.contacts.anchors[0]).multiplyScalar(.65).applyAxisAngle(new T.Vector3(0,1,0),Math.PI).add(new T.Vector3(0,.025,.7));
  const drift=Math.hypot(contact.x-anchor.x,contact.z-anchor.z);maxFootDrift=Math.max(maxFootDrift,drift);sumFootDrift2+=drift*drift;maxContactError=Math.max(maxContactError,Math.abs(contact.y-.025));
  let min=Infinity,swing=Infinity;for(const [name,m]of Object.entries(child.parts)){
   min=Math.min(min,bodyBounds(m).min.y);if(name===s.contacts.swing)swing=bodyBounds(m).min.y-.025;
   for(const p of [...leafMeshes,...posts.filter(p=>['gate_post','gate_wall_return'].includes(p.name))])if(obb(m).intersectsOBB(obb(p),1e-8))errors.push(`Pip:${frame}:${name}/${p.name}`);
   const b=project(m);minPipNdc=Math.min(minPipNdc,b.minX,b.minY);maxPipNdc=Math.max(maxPipNdc,b.maxX,b.maxY);
  }
  maxPenetration=Math.max(maxPenetration,.025-min);minSwing=Math.min(minSwing,swing);maxSwing=Math.max(maxSwing,swing);walking.push({frame,z:child.root.position.z,contactY:contact.y,footDrift:drift,swingClearance:swing});if(frame===0){startZ=child.root.position.z;startMinZ=Math.min(...Object.values(child.parts).map(m=>bodyBounds(m).min.z));}if(frame===29){endZ=child.root.position.z;endMaxZ=Math.max(...Object.values(child.parts).map(m=>bodyBounds(m).max.z));}
 }
 let bookBodyIntersections=0,bookFaceIntersections=0,minBookNdc=Infinity,maxBookNdc=-Infinity,bookWidths=[],faceWidths=[];
 for(let frame=0;frame<27;frame++){
  e.render('D38',frame,720);for(const m of [e.book,cover]){
   for(const [n,b]of Object.entries(leo.parts))if(n!=='leftArm'&&obb(m).intersectsOBB(obb(b),1e-7)){bookBodyIntersections++;errors.push(`book:${frame}:${m.name}/${n}`);if(n==='head')bookFaceIntersections++;}
   // Palm support touches at the book back surface; require no volume penetration.
   if(obb(m).intersectsOBB(obb(leo.parts.leftArm),-1e-5)){bookBodyIntersections++;errors.push(`book/palm:${frame}:${m.name}`);}
   const b=project(m);minBookNdc=Math.min(minBookNdc,b.minX,b.minY);maxBookNdc=Math.max(maxBookNdc,b.maxX,b.maxY);
  }
  const cb=project(cover),bb=project(e.book),fb=project(leo.parts.head);bookWidths.push((Math.max(cb.maxX,bb.maxX)-Math.min(cb.minX,bb.minX))*195);faceWidths.push((fb.maxX-fb.minX)*195);
 }
 const sourceIdentity=e.render('D33',0,720).identity&&e.render('D34',29,720).identity&&e.render('D38',26,720).identity;renderer.render=draw;
 return {errors,originalPostOverlap,gatePoseChecks,gateMinY,gateFloorClearance:gateMinY-.025,walking:{frames:30,startZ,endZ,startMinZ,endMaxZ,heightScale:child.root.scale.toArray(),maxFootDrift,rmsFootDrift:Math.sqrt(sumFootDrift2/30),maxContactError,maxPenetration,minSwingClearance:minSwing,maxSwingClearance:maxSwing,minNdc:minPipNdc,maxNdc:maxPipNdc,samples:walking},notebook:{frames:27,bookBodyIntersections,bookFaceIntersections,minNdc:minBookNdc,maxNdc:maxBookNdc,minPhoneBookWidth:Math.min(...bookWidths),minPhoneFaceWidth:Math.min(...faceWidths)},sourceIdentity};
});
await writeFile('evidence/dice-town-p4b3/geometry.json',JSON.stringify({status:'CHECKING',wallSeconds:(performance.now()-start)/1000,...r},null,2));assert.deepEqual(r.errors,[]);assert(r.originalPostOverlap);assert(r.walking.startZ>0&&r.walking.endZ<-.4&&r.walking.startMinZ>.11&&r.walking.endMaxZ<0);assert(r.walking.maxFootDrift<.001&&r.walking.maxContactError<.001&&r.walking.maxPenetration<.001);assert(r.walking.minNdc>-1&&r.walking.maxNdc<1);assert(r.notebook.minNdc>-1&&r.notebook.maxNdc<1);assert(r.notebook.minPhoneBookWidth>30&&r.notebook.minPhoneFaceWidth>60);assert(r.sourceIdentity);await writeFile('evidence/dice-town-p4b3/geometry.json',JSON.stringify({status:'PASS',wallSeconds:(performance.now()-start)/1000,...r},null,2));console.log('PASS dense gate sweep, scaled readable gait/contact, book/body clearance and mobile framing',JSON.stringify({walking:r.walking,notebook:r.notebook}));}finally{await b.close();await server.close();}
