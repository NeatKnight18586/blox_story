import * as THREE from 'three';
import {createBedroom} from './assets/bedroom.js';
import {createCourtyard} from './assets/courtyard.js';
import {box} from './assets/box.js';
import {createCounterOverlay} from './assets/labels.js';
import {applyFace} from '../appearance/faces.js';
import {ENDING_COUNTER,ease} from './ending-cues.js';
export function createEndingStage(scene){
 const bedroom=createBedroom(scene,{visuals:'v1'}),room=new THREE.Group();room.name='ending_bedroom';
 // Give the existing hinged door a real aperture only in this ending set.
 scene.getObjectByName('side_wall').visible=false;bedroom.door.hinge.scale.z=2;
 for(const [z,length] of [[1.55,3.1],[8.15,1.7]])box(scene,'door_wall',[.25,7,length],0x1b303d,[-6.1,3.5,z]);
 box(scene,'door_header',[.25,2.3,4.2],0x1b303d,[-6.1,5.85,5.2]);box(scene,'door_step',[7,.2,7],0x263e49,[-8,-.1,5.2]);
 for(const o of [...scene.children])room.add(o);scene.add(room);
 const courtyard=createCourtyard(scene);return {...bedroom,room,courtyard};
}
export function createEndingEffects(plan,avatars,world){
 const overlay=createCounterOverlay({actor:'eli',before:99,after:0,values:ENDING_COUNTER.map(c=>c.value)},null),original=new WeakMap(),blue=new THREE.Color(0x7c9eaf),pale=new THREE.Color(0xadcfd4);
 for(const a of Object.values(avatars)){for(const face of ['nervous','startled','thoughtful','relieved','worried'])applyFace(a,face);}
 function tint(a,mix,ghost=false){a.root.traverse(o=>{if(!o.isMesh)return;const m=o.material;if(!original.has(m))original.set(m,{color:m.color.clone(),opacity:m.opacity,transparent:m.transparent,depthWrite:m.depthWrite});const base=original.get(m);let isFace=false;for(let n=o;n;n=n.parent)if(n===a.faceLayer)isFace=true;m.color.copy(base.color).lerp(ghost?pale:blue,isFace?0:(ghost?1:.65)*mix);m.opacity=ghost?1-.42*mix:1;m.transparent=ghost&&mix>0;m.depthWrite=!ghost||mix===0;});}
 return {overlay,apply(state,actors,scene){
  const g=state.globalFrame,e=avatars.eli,m=avatars.mara,c=world.courtyard;
  world.room.visible=state.location==='bedroom';c.group.visible=!world.room.visible;world.door.apply(state.doorOpen);
  if(world.room.visible){scene.background.set(0x071521);scene.fog.color.set(0x102939);scene.fog.density=.033;world.warmth.intensity=4;}
  else{scene.background.set(0x112c3b).lerp(new THREE.Color(0xc4a68b),state.sunrise);scene.fog.color.copy(scene.background);scene.fog.density=.018;c.sky.color.set(0x81b9db).lerp(new THREE.Color(0xffe0bb),state.sunrise);c.sun.color.set(0xa2d8ff).lerp(new THREE.Color(0xffd19c),state.sunrise);c.sun.intensity=1.6+state.sunrise*.9;}
  const face=g<1203?'thoughtful':g<1296?'nervous':g<1529?'thoughtful':g<1546?'startled':'worried';applyFace(e,face);actors.eli.face=face;applyFace(m,'relieved');actors.mara.face='relieved';
  // Restrained gestures on the approved pivots. Feet and action root unchanged.
  if(g>=1054&&g<1096)e.pivots.leftShoulder.rotation.x-=.45*state.doorOpen;
  if(g>=1203&&g<1296)e.pivots.leftShoulder.rotation.z-=.16;
  if(g>=1490){const reach=ease((g-1490)/26)*(1-state.forgotten);e.pivots.rightShoulder.rotation.z+=.26*reach;e.pivots.head.rotation.x+=.12*state.forgotten;}
  if(g>=1529){m.root.rotation.y+=1.5*state.forgotten;m.pivots.head.rotation.y+=.12*state.forgotten;}
  tint(e,state.forgotten);const residents=c.residents;
  // Before the reunion, same cheap figures wait outside; afterwards hold the embrace.
  for(let i=0;i<2;i++){const a=residents[i];a.root.position.set(...(g<1296?[[-8.8,0,4.5],[-9.5,0,6.0]][i]:[[2.4,0,-1.8],[4.6,0,-1.0]][i]));if(state.location==='courtyard'&&g<1296)a.root.position.set(...[[-.1,0,-1.8],[2.4,0,-1]][i]);a.root.rotation.y=g<1296?.1:[.05,-.35][i];tint(a,1-(i===0?state.adultRestored:state.childRestored),true);}
  // Proxies can appear through the open doorway without duplicating their meshes.
  for(const a of residents){const parent=world.room.visible?world.room:c.group;if(a.root.parent!==parent)parent.add(a.root);}
  overlay.apply(state);
 },draw(renderer){overlay.draw(renderer);}};
}
