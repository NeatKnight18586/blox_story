import * as T from 'three';import{block}from'../../avatar/baseAvatar.js';import{applyFace}from'../../appearance/faces.js';import{sampleAction,applyActionSample}from'../../avatar/actions.js';import{makeDie,topQuaternion,supportY}from'../dice-town-p4b1/die.js';import{sample,counts}from'./motion.js';import{pageTexture}from'./pages.js';
await import('../dice-town-p3b4/scene.js');const w=window.__grounding;
await import('../dice-town-p3b3/scene.js');const market=window.__baker;
const {scene,camera,renderer,leo,extras}=w;
function box(parent,name,size,color,p,r=.025){const m=block(name,size,color,r);m.position.set(...p);parent.add(m);return m;}
const iron=new T.MeshStandardMaterial({color:0x435754,roughness:.66,metalness:.20}),brass=new T.MeshStandardMaterial({color:0xb59b60,roughness:.6,metalness:.22});
function ring(parent,name,r,p){const m=new T.Mesh(new T.TorusGeometry(r,.045,8,32),brass);m.name=name;m.position.set(...p);m.castShadow=true;parent.add(m);return m;}
const additions=new T.Group();additions.name='opening_optin_props';scene.add(additions);
const harness=new T.Group();harness.name='waist_and_shoulder_harness';leo.parts.torso.add(harness);
for(const z of[-.55,.55])box(harness,'waist_webbing',[1.67,.16,.07],0x8a6941,[0,-.30,z],.008);
for(const x of[-.84,.84])box(harness,'waist_side',[.07,.16,1.13],0x8a6941,[x,-.30,0],.008);
for(const x of[-.49,.49])box(harness,'shoulder_webbing',[.14,1.63,.045],0x8a6941,[x,.10,.62],.008);
const bodyRing=ring(leo.root,'harness_load_ring',.105,[-.87,2.72,-.62]),beltPoint=new T.Vector3(-.92,2.72,-.65);
const towerPlate=box(additions,'tower_anchor_plate',[.38,.44,.10],0x435754,[-9.7,1.25,-8.69]);const towerRing=ring(additions,'tower_fixed_ring',.17,[-9.7,1.25,-8.55]);
const clip=new T.Mesh(new T.TorusGeometry(.10,.033,8,24,Math.PI*1.82),brass);clip.name='same_tether_clip';clip.rotation.y=Math.PI/2;additions.add(clip);
const rope=new T.Mesh(new T.TubeGeometry(new T.LineCurve3(new T.Vector3(),new T.Vector3(0,1,0)),24,.035,8,false),new T.MeshStandardMaterial({color:0xbba77e,roughness:1}));rope.name='explicit_taut_tether';rope.castShadow=true;additions.add(rope);
const towerClip=towerRing.position.clone().add(new T.Vector3(0,-.10,.06)),origin=new T.Vector3(-6.7,0,-4.5),rotatedBelt=beltPoint.clone().applyAxisAngle(new T.Vector3(0,1,0),.10),ropeLength=origin.clone().add(rotatedBelt).distanceTo(towerClip);
function tension(y){const dx=origin.x+rotatedBelt.x-towerClip.x,dy=y+rotatedBelt.y-towerClip.y,z=towerClip.z+Math.sqrt(ropeLength**2-dx**2-dy**2)-rotatedBelt.z;leo.root.position.set(origin.x,y,z);leo.root.rotation.set(0,.10,0);}
function tether(end,slack=false){scene.updateMatrixWorld(true);const a=leo.root.localToWorld(beltPoint.clone()),middle=a.clone().lerp(end,.5).add(new T.Vector3(1,-.85,.40));const curve=slack?new T.CatmullRomCurve3([a,middle,end],false,'centripetal'):new T.LineCurve3(a,end),g=new T.TubeGeometry(curve,24,.035,8,false);for(const n of ['position','normal']){rope.geometry.attributes[n].array.set(g.attributes[n].array);rope.geometry.attributes[n].needsUpdate=true;}g.dispose();rope.geometry.computeBoundingSphere();clip.position.copy(end);return{body:a.toArray(),clip:end.toArray(),length:a.distanceTo(end),pathLength:curve.getLength(),slack,path:curve.getPoints(24).map(p=>p.toArray())};}

const notebook=leo.root.getObjectByName('notebook'),bookHold=new T.Group();bookHold.name='physical_notebook';leo.parts.leftArm.add(bookHold);bookHold.position.set(0,-.78,.59);bookHold.add(notebook);notebook.position.set(0,0,0);
const pages=[pageTexture(false),pageTexture(true)];const page=box(bookHold,'ink_page',[.48,.61,.01],0xffffff,[0,0,.0975],.005);page.material.map=pages[0];
const coverHinge=new T.Group();coverHinge.position.set(-.26,0,.125);coverHinge.rotation.y=-2;bookHold.add(coverHinge);const cover=box(coverHinge,'open_front_cover',[.52,.67,.025],0x9b6748,[.26,0,0],.005);box(cover,'inner_blank_page',[.48,.61,.006],0xe9d5ac,[0,0,-.017],.004);
const die=makeDie();scene.add(die.group);
// Actual camera-bounded service aperture; only this opt-in view uses cut paving.
const hatch=new T.Group();hatch.name='installed_service_hatch';additions.add(hatch);const H={x:3.2,z:6.5,w:4.4,d:3.2};
for(const sign of[-1,1]){box(hatch,'stone_rim',[.22,.20,H.d+.44],0xb6ad96,[H.x+sign*(H.w/2+.11),.10,H.z]);box(hatch,'stone_rim',[H.w,.20,.22],0xb6ad96,[H.x,.10,H.z+sign*(H.d/2+.11)]);box(hatch,'well_wall',[.16,3,H.d],0x354341,[H.x+sign*(H.w/2+.08),-1.5,H.z]);box(hatch,'well_wall',[H.w,3,.16],0x354341,[H.x,-1.5,H.z+sign*(H.d/2+.08)]);}
box(hatch,'well_bottom',[H.w,.12,H.d],0x1e2b29,[H.x,-3.4,H.z]);
const lid=new T.Group();lid.position.set(H.x,.15,H.z-H.d/2);lid.rotation.x=-1.30;hatch.add(lid);box(lid,'open_hatch_lid',[H.w-.08,.12,H.d-.08],0x435754,[0,0,(H.d-.08)/2]);
const finalArm=new T.Euler(-1.00,0,-.103),handoffOrigin=new T.Vector3(3.8,0,8.4);const finalPalm=new T.Vector3(-.53*.88,-1.845,.5).applyEuler(finalArm).add(new T.Vector3(-1.51,4.02,0)).applyAxisAngle(new T.Vector3(0,1,0),Math.PI).add(handoffOrigin),hatchClip=finalPalm.clone().add(new T.Vector3(0,.08,0));
const hatchRing=ring(hatch,'fixed_hatch_ring',.17,hatchClip.clone().add(new T.Vector3(0,.14,-.10)).toArray());box(hatch,'safety_stanchion',[.16,4,.18],0x435754,[hatchRing.position.x,2,hatchRing.position.z-.20]);box(hatch,'stanchion_foot',[.40,.12,.42],0x59665f,[hatchRing.position.x,.06,hatchRing.position.z-.20]);
const ground=w.plaza.getObjectByName('continuous_town_ground'),oldGround=ground.geometry;
const sh=new T.Shape();sh.moveTo(-70,-80);sh.lineTo(70,-80);sh.lineTo(70,80);sh.lineTo(-70,80);sh.closePath();const hole=new T.Path();const cx=H.x,cy=-(H.z+30);hole.moveTo(cx-H.w/2,cy-H.d/2);hole.lineTo(cx-H.w/2,cy+H.d/2);hole.lineTo(cx+H.w/2,cy+H.d/2);hole.lineTo(cx+H.w/2,cy-H.d/2);hole.closePath();sh.holes.push(hole);const aperture=new T.ExtrudeGeometry(sh,{depth:.25,bevelEnabled:false});aperture.rotateX(-Math.PI/2);aperture.translate(0,-.125,0);
const cup=new T.Group();cup.name='loose_market_cup';market.scene.add(cup);const cupMat=new T.MeshStandardMaterial({color:0x5c858b,roughness:.65});const cupWall=new T.Mesh(new T.CylinderGeometry(.23,.18,.44,24,1,true),cupMat);cupWall.position.y=.22;cup.add(cupWall);const cupBase=new T.Mesh(new T.CylinderGeometry(.18,.18,.035,24),cupMat);cupBase.position.y=.0175;cup.add(cupBase);const cupLip=new T.Mesh(new T.TorusGeometry(.23,.026,8,24),cupMat);cupLip.rotation.x=Math.PI/2;cupLip.position.y=.44;cup.add(cupLip);const handle=new T.Mesh(new T.TorusGeometry(.13,.036,8,20),cupMat);handle.position.set(.25,.25,0);cup.add(handle);cup.traverse(m=>{if(m.isMesh)m.castShadow=m.receiveShadow=true;});
const ids=[leo,...extras,market.baker].flatMap(a=>Object.values(a.parts).map(m=>m.uuid));let last;
function reset(a){for(const[n,p]of Object.entries(a.pivots)){p.position.fromArray(a.restPositions[n]);p.rotation.set(0,0,0);}}
function setCam(c,p,t,f){c.position.set(...p);c.lookAt(...t);c.fov=f;c.aspect=9/16;c.updateProjectionMatrix();c.updateMatrixWorld(true);}
function render(shot,frame=0,width=720){const isResult=shot==='one'||shot==='two',s=isResult?sample('D08',0):sample(shot,frame),m=shot==='D08'||shot==='D09';renderer.domElement.style.display=m?'none':'block';market.renderer.domElement.style.display=m?'block':'none';
const draw=renderer.render;renderer.render=()=>{};try{w.render('D01',true,width);}finally{renderer.render=draw;}reset(leo);extras.forEach(reset);applyFace(leo,'nervous');leo.root.visible=false;extras.forEach(a=>a.root.visible=false);w.pip.visible=false;
// Never use storyboard/buildStage cards as finished sources. Original law sign
// is also hidden; rule results here are physical pips on actual die surfaces.
for(const o of scene.children)if(o.geometry?.type==='PlaneGeometry'&&o.position.y===1.12)o.visible=false;
scene.getObjectByName('brass_access').visible=false;for(const o of scene.children)if(o.name==='radial_joint')o.visible=shot!=='D14';for(const o of w.plaza.children)if(o.name==='paving_joint')o.visible=shot!=='D14';clip.rotation.set(0,Math.PI/2,0);
bookHold.visible=false;harness.visible=bodyRing.visible=towerPlate.visible=towerRing.visible=rope.visible=clip.visible=false;hatch.visible=shot==='D14';ground.geometry=shot==='D14'?aperture:oldGround;w.plaza.getObjectByName('inset_radial_paving').visible=shot!=='D14';die.group.visible=isResult;w.die.visible=!isResult;
let line=null,walk=null;
if(shot==='D02'){
 for(const [j,index]of[1,2].entries()){const a=extras[index],p=s.lift[j?2:0];a.root.visible=true;a.root.position.set(...[[3.5,0,7.3],[6,0,4]][j]);a.root.rotation.set(p.lean,[-.1,.25][j],p.tilt);for(const[n,r]of Object.entries(p.pivots))a.pivots[n].rotation.set(...r);if(j===1)a.pivots.rightShoulder.rotation.z*=.45;a.root.updateMatrixWorld(true);let min=Infinity;for(const n of['leftLeg','rightLeg']){const v=a.parts[n].geometry.attributes.position;for(let i=0;i<v.count;i++)min=Math.min(min,new T.Vector3().fromBufferAttribute(v,i).applyMatrix4(a.parts[n].matrixWorld).y);}a.root.position.y=p.height-min;}
 setCam(camera,[11,10.5,19],[3.5,3.2,4],56);
}else if(['D05','D06','D07','D12'].includes(shot)){
 leo.root.visible=true;tension(s.heroY);harness.visible=bodyRing.visible=towerPlate.visible=towerRing.visible=rope.visible=clip.visible=true;
 leo.pivots.head.rotation.set(.04+.06*s.s,-.05,0);leo.pivots.leftShoulder.rotation.x=-1.10;leo.pivots.rightShoulder.rotation.x=.05;line=tether(towerClip);
 if(shot==='D05'){const a=extras[2],p=s.lift[2];a.root.visible=true;a.root.position.set(-9.5,1.4+.6*s.s,-7.3);a.root.rotation.set(0,.20,0);for(const[n,r]of Object.entries(p.pivots))a.pivots[n].rotation.set(...r);a.pivots.leftShoulder.rotation.z=-.35;a.pivots.rightShoulder.rotation.z=.20;setCam(camera,[-8.5,4.5,7],[-7.8,2.8,-6.1],56);}
 else if(shot==='D06')setCam(camera,[-11.5,3.9,1],[-8.4,2.4,-6.4],58);
 else{bookHold.visible=true;page.material.map=pages[shot==='D12'?1:0];leo.pivots.leftShoulder.rotation.x=-1.08+.035*s.s;leo.pivots.head.rotation.set(.30+.025*s.s,-.25,0);scene.updateMatrixWorld(true);const p=page.getWorldPosition(new T.Vector3());if(shot==='D07')setCam(camera,p.clone().add(new T.Vector3(-1,2,2.7)).toArray(),p.clone().add(new T.Vector3(.22,.30,-.12)).toArray(),44);else setCam(camera,p.clone().add(new T.Vector3(.20,2.5,1.1)).toArray(),p.toArray(),32);}
}else if(isResult){const value=shot==='one'?1:2;const q=topQuaternion(value);die.group.quaternion.copy(q);die.group.position.set(-1,supportY(die.body,q),-1);setCam(camera,[8,12,13],[-1,3.4,-1],48);
}else if(m){
 const a=market.baker;reset(a);a.root.visible=true;market.shoes.forEach(o=>o.visible=false);cup.visible=shot==='D08';market.stall.visible=shot==='D08';applyFace(a,'nervous');a.root.rotation.set(0,0,0);
 if(shot==='D08'){a.root.position.set(-.85,0,-.10);cup.position.set(1.2,2.4+s.cupHeight,2);cup.rotation.set(0,0,-.08*s.s);setCam(market.camera,[5,4.8,8.4],[.2,2.1,1.3],42);}
 else{walk=sampleAction('walk',s.walkTime,{gait:'readable'});const scaled={...walk,root:{...walk.root,position:walk.root.position.map(v=>v*.93)}};applyActionSample(a,scaled);a.root.position.z=-scaled.root.position[2];for(const n of['leftHip','rightHip','leftShoulder','rightShoulder'])a.pivots[n].rotation.x*=-1;setCam(market.camera,[6.6,3.6,4.3],[0,2.4,-.8],52);}
 market.renderer.setSize(width,width*16/9);market.scene.updateMatrixWorld(true);market.camera.updateMatrixWorld(true);market.renderer.render(market.scene,market.camera);
}else if(shot==='D14'){
 leo.root.visible=true;harness.visible=bodyRing.visible=rope.visible=clip.visible=true;
 if(frame<18){leo.root.position.copy(handoffOrigin);leo.root.rotation.set(0,Math.PI,0);leo.pivots.leftShoulder.rotation.set(-1.25+.25*s.clip,0,-.20+.097*s.clip);leo.pivots.head.rotation.set(.2,0,0);scene.updateMatrixWorld(true);const end=new T.Vector3(-.53,-.85,.5).applyMatrix4(leo.parts.leftArm.matrixWorld).add(new T.Vector3(0,.08,0));line=tether(end,true);setCam(camera,[9.1,5,4.8],[5.8,3.5,6.7],40);}
 else{leo.root.position.set(H.x,-.08-1.72*s.descent,H.z+.2);leo.root.rotation.set(0,Math.PI,0);leo.pivots.leftShoulder.rotation.x=-1.10;leo.pivots.rightShoulder.rotation.x=-.20;leo.pivots.head.rotation.x=.18;line=tether(hatchClip);setCam(camera,[9,4.8,12],[3.3,.75,6.5],43);}
}
scene.updateMatrixWorld(true);camera.updateMatrixWorld(true);if(!m)renderer.render(scene,camera);last={s,walk,line};return{shot,frame,identity:ids.every((id,i)=>id===[leo,...extras,market.baker].flatMap(a=>Object.values(a.parts).map(m=>m.uuid))[i]),nativeSize:[width,width*16/9],line,cover:bookHold.visible?-2:null,walkZ:shot==='D09'?market.baker.root.position.z:null,cupY:shot==='D08'?cup.position.y:null,leoPosition:leo.root.position.toArray()};
}
window.__opening={render,world:w,market,leo,extras,notebook,bookHold,page,cover,coverHinge,pages,harness,bodyRing,beltPoint,towerRing,towerClip,hatchRing,hatchClip,rope,clip,H,ground,aperture,cup,die,counts,get sample(){return last;}};render('D02');
