import * as T from 'three';import{block}from'../../avatar/baseAvatar.js';import{makeDie,topQuaternion,supportY,FACE_NORMALS}from'../dice-town-p4b1/die.js';import{sample,transform}from'./motion.js';
await import('../dice-town-p3b4/scene.js');const world=window.__grounding,die=makeDie();world.scene.add(die.group);
const brass=block('brief_brass_edge',[.34,.12,.45],0xc5a052,.01);brass.material.metalness=.25;brass.material.roughness=.48;world.scene.add(brass);
const shaft=block('concealed_paddle_stub',[.12,1,.12],0x344b51,.01);world.scene.add(shaft);
const slot=new T.Mesh(new T.PlaneGeometry(.45,.28),new T.MeshStandardMaterial({color:0x26383d,roughness:1}));slot.name='service_slot_cue';slot.rotation.x=-Math.PI/2;slot.position.set(-2.3,.021,1.9);world.scene.add(slot);
const ids=die.group.children.flatMap(g=>g.isMesh?[g.uuid]:g.children.map(m=>m.uuid));const ray=new T.Raycaster();
function underside(){let min=Infinity;for(const x of[-2.47,-2.13])for(const z of[1.675,2.125]){ray.set(new T.Vector3(x,-4,z),new T.Vector3(0,1,0));const h=ray.intersectObject(die.body,false)[0];if(h)min=Math.min(min,h.point.y);}return min;}
// Derive contact from real geometry at the near-six pose, then hold the tiny
// edge's height as the die moves away. This is a clue, not a new crank rig.
const contact=transform(die.body,12);die.group.position.copy(contact.position);die.group.quaternion.copy(contact.quaternion);die.group.updateMatrixWorld(true);const contactTop=underside()-.004;
function render(frame=0,width=720,view='wide'){
 const d28=view==='D28',s=sample(frame);world.camera.clearViewOffset();slot.visible=!d28;world.renderer.setSize(width,width*16/9);const draw=world.renderer.render;world.renderer.render=()=>{};try{world.render('D28',true,width);}finally{world.renderer.render=draw;}
 world.plaza.traverse(m=>{if(m.name==='continuous_road')m.position.y=-.001;if(m.name==='road_stone_edge')m.position.y=-.021;});world.scene.children.forEach(m=>{if(m.name==='radial_joint')m.position.y=.013;});world.die.visible=false;die.group.visible=true;brass.visible=shaft.visible=!d28&&s.tip>.001;
 if(d28){const q=topQuaternion(5);die.group.quaternion.copy(q);die.group.position.set(-1,supportY(die.body,q),-1);world.leo.root.position.set(4.3,.02,0);world.leo.root.rotation.y=-Math.PI/2;}
 else{const pose=transform(die.body,frame);die.group.position.copy(pose.position);die.group.quaternion.copy(pose.quaternion);world.leo.root.visible=false;
 world.plaza.traverse(m=>{if(m.name==='continuous_road')m.position.y=-.001;if(m.name==='road_stone_edge')m.position.y=-.021;});world.scene.children.forEach(m=>{if(m.name==='radial_joint')m.position.y=.013;if(m.name==='brass_access')m.visible=false;});
 const top=-.1+(contactTop+.1)*s.tip;brass.position.set(-2.3,top-.06,1.9);shaft.scale.y=Math.max(.001,top+.20);shaft.position.set(-2.3,(top-.20)/2,1.9);
 world.camera.position.set(10,10,21);world.camera.lookAt(-.6,3.8,-1);world.camera.fov=64;world.camera.updateProjectionMatrix();}
 if(view==='clue')world.camera.setViewOffset(720,1280,168,568,288,512);world.scene.updateMatrixWorld(true);world.renderer.render(world.scene,world.camera);
 let topValue=0,up=-Infinity;for(const[n,normal]of Object.entries(FACE_NORMALS)){const y=new T.Vector3(...normal).applyQuaternion(die.group.quaternion).y;if(y>up){up=y;topValue=+n;}}
 return{...s,view,diePosition:die.group.position.toArray(),dieQuaternion:die.group.quaternion.toArray(),topValue,topNormalY:up,contactTop,tipVisible:brass.visible,identity:ids.every((id,i)=>id===die.group.children.flatMap(g=>g.isMesh?[g.uuid]:g.children.map(m=>m.uuid))[i]),camera:{position:world.camera.position.toArray(),fov:world.camera.fov}};
}
window.__mystery={render,world,die,brass,shaft,slot,underside,contactTop,FACE_NORMALS};render(0);
