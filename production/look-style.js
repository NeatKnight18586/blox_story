import * as THREE from 'three';
import {box} from './assets/box.js';
import {createCounterOverlay} from './assets/labels.js';
// S1 art direction only. Opt-in set dressing/light state; no animation engine.
function facade(parent,x,z,width,height,depth,color){
 const group=new THREE.Group();group.name='s1_facade';parent.add(group);
 box(group,'building',[width,height,depth],color,[x,height/2,z]);
 box(group,'roof_edge',[width+.12,.18,depth+.12],0x506475,[x,height-.12,z]);
 box(group,'quiet_window',[1.2,1.8,.08],0x20394e,[x,height*.6,z+depth/2+.045]);return group;
}
function dressCourtyard(c){
 const group=c.group;
 const wall=group.getObjectByName('home_wall');wall.scale.set(.56,.85,1);wall.position.set(3,3.825,-6);wall.material.color.set(0x74818c);
 for(const name of ['home_door','home_lintel'])group.getObjectByName(name).position.x=3.6;
 for(const name of ['window_recess','window_sill'])group.children.filter(o=>o.name===name).forEach((o,i)=>o.position.x=[-.4,6.4][i]);
 group.getObjectByName('street').material.color.set(0x536372);
 for(const o of group.children.filter(o=>o.name==='path_stone')){o.material.color.set(0x85909a);Object.assign(o.material,{polygonOffset:true,polygonOffsetFactor:-1,polygonOffsetUnits:-1});}
 facade(group,-8,-4,5.4,7.6,6,0x324b65);facade(group,-9,-15,5.6,10,7,0x3e536a);
 // Three purposeful details: home porch, sidewalk boundary, one practical lamp.
 const porch=new THREE.Group();porch.name='s1_home_threshold';group.add(porch);
 box(porch,'stoop',[3.4,.18,1.1],0x8f9699,[3.6,.09,-5.15]);box(porch,'step',[3.4,.1,.5],0x7c888e,[3.6,.05,-4.4]);
 for(const x of [1.95,5.25])box(porch,'porch_post',[.16,5.5,.16],0x8c979f,[x,2.93,-5.15]);box(porch,'canopy',[3.8,.18,1.7],0x485a69,[3.6,5.77,-5.3]);
 box(group,'s1_sidewalk_edge',[.14,.12,15],0x7b8b98,[-4.9,.06,1.5]);
 const lamp=new THREE.Group();lamp.name='s1_street_lamp';group.add(lamp);lamp.position.set(-4.65,0,-3.5);
 box(lamp,'lamp_post',[.12,5.6,.12],0x253a4b,[0,2.8,0]);box(lamp,'lamp_cap',[.65,.12,.6],0x263847,[0,5.67,0]);
 const glass=box(lamp,'lamp_glass',[.35,.3,.35],0xffbf79,[0,5.45,0],.015);glass.material.emissive.set(0xffa552);glass.material.emissiveIntensity=.6;
 const practical=new THREE.PointLight(0xffb76e,3,7,2);practical.position.set(0,5.35,0);lamp.add(practical);
 group.traverse(o=>{if(o.isMesh&&o.material.isMeshStandardMaterial&&!o.parent?.name.startsWith('face_'))o.material.roughness=.92;});
 return {practical};
}
function dressBedroom(group){
 facade(group,-7,-10,5,8.5,4,0x20374c);facade(group,7,-15,5,10,4,0x233b51);
 const lamp=group.getObjectByName('unlit_desk_lamp');if(!lamp)return;lamp.userData.unlit=false;lamp.position.set(1.2,1.38,.48);const notebook=group.getObjectByName('personal_notebook');notebook.position.x=.25;notebook.position.y=1.4075;
 const shade=lamp.getObjectByName('shade');shade.material=shade.material.clone();shade.material.emissive.set(0x9f5929);shade.material.emissiveIntensity=.3;
 const bulb=new THREE.Mesh(new THREE.SphereGeometry(.065,12,8),new THREE.MeshBasicMaterial({color:0xffcb88}));bulb.name='s1_lamp_bulb';bulb.position.y=.68;lamp.add(bulb);
 const light=new THREE.PointLight(0xffb66c,3.5,5,2);light.position.set(0,.68,0);lamp.add(light);
}
function ghostFrontDepth(avatar){
 // Shared geometry, one depth-only material, opaque queue after the scenery.
 // This removes visible back surfaces without changing the .58 ghost opacity.
 const material=new THREE.MeshBasicMaterial({colorWrite:false,depthWrite:true}),helpers=[];
 avatar.root.traverse(o=>{if(!o.isMesh)return;for(let n=o;n;n=n.parent)if(n===avatar.faceLayer||n.userData.revealTag)return;helpers.push(o);});
 return {material,meshes:helpers.map(o=>{const d=new THREE.Mesh(o.geometry,material);d.name='s1_ghost_front_depth';d.position.copy(o.position);d.quaternion.copy(o.quaternion);d.scale.copy(o.scale);d.renderOrder=10;d.userData.lookDepth=true;o.parent.add(d);return d;})};
}
export function createLook(plan,scene,world,avatars){
 const c=world.courtyard,night=plan.environment.kind==='home-courtyard',overlay=night?createCounterOverlay({actor:'eli',before:100,after:99},null):null;
 const depth=plan.reveal?ghostFrontDepth(avatars.mara):null;
 if(c)world.styleDetails=dressCourtyard(c);if(world.room)dressBedroom(world.room);else if(plan.reveal)dressBedroom(scene);
 if(night){scene.background=new THREE.Color();scene.fog=new THREE.FogExp2();for(const a of c.residents)a.root.visible=false;}
 return {apply(state){
  if(c&&(!state.ending||state.ending.location==='courtyard')){
   const dawn=state.ending?.sunrise??0;
   scene.background.set(0x10243a).lerp(new THREE.Color(0xc5aa98),dawn);scene.fog.color.copy(scene.background);scene.fog.density=.016-.004*dawn;
   c.sky.color.set(0x789fc2).lerp(new THREE.Color(0xbacfe0),dawn);c.sky.groundColor.set(0x263b50);c.sky.intensity=.85+.2*dawn;
   c.sun.color.set(0x96bbd8).lerp(new THREE.Color(0xffc89c),dawn);c.sun.intensity=1.4+.9*dawn;c.fill.color.set(0xb6cfe1);c.fill.intensity=.55;world.styleDetails.practical.intensity=3*(1-.8*dawn);
  }
  if(plan.reveal){
   // Front depth prevents transparent hair/back surfaces doubling over the face;
   // opacity and restoration timing are untouched, including .58 through889.
   Object.assign(depth.material,{transparent:false,opacity:1,depthWrite:true,colorWrite:false});for(const d of depth.meshes)d.visible=state.reveal.ghostToHuman<1;
   scene.background.set(0x091c2e);scene.fog.color.set(0x172f43);scene.fog.density=.025;
  }
  if(overlay)overlay.apply({counter:100,counterEmphasis:false,whisper:false});
 },draw(renderer){if(overlay)overlay.draw(renderer);},overlay};
}
