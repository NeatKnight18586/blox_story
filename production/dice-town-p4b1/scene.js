import * as T from 'three';import{block}from'../../avatar/baseAvatar.js';import{makeDie,topQuaternion,supportY,rollingTransform,FACE_NORMALS}from'./die.js';import{sample,COUNTS}from'./motion.js';import{makeFamilyPhoto}from'./photo.js';
await import('../dice-town-p3b4/scene.js');const world=window.__grounding;
await import('../dice-town-p3b1/scene.js');const chamber=window.__proof;
const die=makeDie();world.scene.add(die.group);const pin=chamber.pin,pip=chamber.pip;const ids=Object.values(pip.parts).map(m=>m.uuid),pinId=pin.uuid;
// Reuse the received pin asset and rigid palm support from P3B1, then parent it
// to the same existing arm so no per-frame hand/prop teleport is possible.
chamber.render('handoff',71);pip.root.rotation.y=-Math.PI/2;pip.root.position.set(.75,1.582,3.28);pip.pivots.leftShoulder.rotation.x=-Math.PI/2;pip.root.updateMatrixWorld(true);
const palm=new T.Vector3(0,-.85,.5).applyMatrix4(pip.parts.leftArm.matrixWorld);pin.position.copy(palm).add(new T.Vector3(0,.08,.35));pin.rotation.set(0,0,0);pin.updateMatrixWorld(true);pip.parts.leftArm.attach(pin);
const step=chamber.scene.getObjectByName('work_step');step.position.set(.75,.791,3.15);
// One small original faded photo prop, sharing mother gray sweep/cream V/purple
// and child rust motifs. Flat photo artwork only; no family rig or text card.
const photo=makeFamilyPhoto();photo.position.set(-1.15,4.25,2.3);photo.rotation.y=-.35;chamber.scene.add(photo);
const tray=block('photo_support_tray',[1.08,.08,1.7],0x696e65);tray.position.set(-1.15,3.73,1.50);chamber.scene.add(tray);const foot=block('photo_support_foot',[.18,.16,.25],0x696e65);foot.position.set(-1.15,3.64,.75);chamber.scene.add(foot);
const pinLocal={position:pin.position.clone(),quaternion:pin.quaternion.clone()};
function render(shot,frame=0,width=720,value=5){const choice=shot==='D27'||shot==='D30';let state={shot,frame,value};world.renderer.domElement.style.display=choice?'none':'block';chamber.renderer.domElement.style.display=choice?'block':'none';
 if(choice){state=sample(shot,frame);chamber.renderer.setSize(width,width*16/9);chamber.die.visible=false;chamber.leo.root.visible=false;pip.root.visible=step.visible=true;photo.visible=true;
 chamber.scene.children.filter(g=>g.type==='Group'&&g.position.x===-1&&g.position.y===4.6).forEach(g=>g.rotation.z=0);
 pip.root.position.set(.75,1.582,3.28-state.advance);pip.root.rotation.set(0,-Math.PI/2,0);for(const p of Object.values(pip.pivots))p.rotation.set(0,0,0);pip.pivots.leftShoulder.rotation.x=state.arm;pip.pivots.rightShoulder.rotation.x=-.08;pip.pivots.head.rotation.set(state.headPitch,state.headYaw,0);pin.position.copy(pinLocal.position);pin.quaternion.copy(pinLocal.quaternion);
 chamber.camera.position.set(-3.7,6.4,8);chamber.camera.lookAt(-.1,4.3,2.5);chamber.camera.fov=54;chamber.camera.updateProjectionMatrix();chamber.scene.updateMatrixWorld(true);chamber.renderer.render(chamber.scene,chamber.camera);
 }else{const draw=world.renderer.render;world.renderer.render=()=>{};try{world.render('D28',true,width);}finally{world.renderer.render=draw;}
 // Flush the existing decorative road/seams beneath the physical plinth top.
 world.plaza.traverse(m=>{if(m.name==='continuous_road')m.position.y=-.001;if(m.name==='road_stone_edge')m.position.y=-.021;});
 world.scene.children.forEach(m=>{if(m.name==='radial_joint')m.position.y=.013;if(m.name==='brass_access')m.visible=false;});
 world.die.visible=false;world.leo.root.visible=false;die.group.visible=true;const q=topQuaternion(value);die.group.quaternion.copy(q);die.group.position.set(-1,supportY(die.body,q),-1);
 if(shot==='D29'||shot==='D31'){state=sample(shot,frame);const t=rollingTransform(die.body,state.phi);die.group.position.copy(t.position);die.group.quaternion.copy(t.quaternion);}
 if(shot==='D32'){die.group.quaternion.identity();die.group.position.copy(rollingTransform(die.body,0).position);}
 const cam=world.camera;if(shot==='D32'){cam.position.set(9,12,11);cam.lookAt(-1,3,-3.92);cam.fov=50;}else if(shot==='montage'){cam.position.set(8,10,13);cam.lookAt(-1,3.5,-1);cam.fov=54;}else{cam.position.set(10,10,16);cam.lookAt(-1,3.2,-1.5);cam.fov=60;}cam.updateProjectionMatrix();world.scene.updateMatrixWorld(true);world.renderer.render(world.scene,cam);}
 const active=choice?chamber:world;return{...state,identity:pin.uuid===pinId&&ids.every((id,i)=>id===Object.values(pip.parts)[i].uuid),pinInstalled:false,diePosition:choice?null:die.group.position.toArray(),dieQuaternion:choice?null:die.group.quaternion.toArray(),pinWorld:choice?pin.getWorldPosition(new T.Vector3()).toArray():null,camera:{position:active.camera.position.toArray(),fov:active.camera.fov}};
}
window.__finale={render,world,chamber,die,photo,pin,pip,counts:COUNTS,FACE_NORMALS};render('montage',0,720,5);
