import {applyEndingPerformance} from './performance.js';
import {ghostFrontDepth} from './look-style.js';
import * as THREE from 'three';
import {createBedroom} from './assets/bedroom.js';
import {createCourtyard} from './assets/courtyard.js';
import {box} from './assets/box.js';
import {createCounterOverlay} from './assets/labels.js';
import {applyFace} from '../appearance/faces.js';
import {ENDING_COUNTER,S2_COUNTER,ease} from './ending-cues.js';
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
 const s2=['s2','s3b'].includes(plan.ending.visuals),depth=s2?ghostFrontDepth(avatars.eli,'s2_forgotten_depth'):null;
 const overlay=createCounterOverlay({actor:'eli',before:s2?100:99,after:0,values:s2?[100,...S2_COUNTER.map(c=>c.value)]:ENDING_COUNTER.map(c=>c.value)},null),original=new WeakMap(),blue=new THREE.Color(0x7c9eaf),pale=new THREE.Color(s2?0xb3dde2:0xadcfd4);
 for(const a of Object.values(avatars)){for(const face of ['nervous','startled','thoughtful','relieved','worried'])applyFace(a,face);}
 // Changing transparent changes Three.js shader defines; invalidate on transitions.
 function tint(a,mix,ghost=false){a.root.traverse(o=>{if(!o.isMesh||o.userData.lookDepth)return;const m=o.material;if(!original.has(m))original.set(m,{color:m.color.clone(),opacity:m.opacity,transparent:m.transparent,depthWrite:m.depthWrite});const base=original.get(m);let isFace=false;for(let n=o;n;n=n.parent)if(n===a.faceLayer)isFace=true;m.color.copy(base.color).lerp(ghost?pale:blue,isFace?0:(ghost?1:.65)*mix);m.opacity=ghost?1-.42*mix:1;const transparent=ghost&&mix>0;if(m.transparent!==transparent){m.transparent=transparent;m.needsUpdate=true;}m.depthWrite=!ghost||mix===0;});}
 return {overlay,apply(state,actors,scene){
  const g=state.globalFrame,e=avatars.eli,m=avatars.mara,c=world.courtyard;
  world.room.visible=state.location==='bedroom';c.group.visible=!world.room.visible;world.door.apply(state.doorOpen);
  if(world.room.visible){scene.background.set(0x071521);scene.fog.color.set(0x102939);scene.fog.density=.033;world.warmth.intensity=s2?8:4;}
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
  if(s2){
   // A visible return for each early name, then a modest reunion on existing pivots.
   const embrace=ease((g-1371)/26),parent=residents[0],child=residents[1];
   parent.pivots.head.rotation.set(.23+.07*embrace,.3+.3*embrace,0);parent.pivots.rightShoulder.rotation.set(-.12-.08*embrace,0,.25+.12*embrace);
   child.root.rotation.y=g<1296?.1:-.35-.4*embrace;child.pivots.head.rotation.set(-.2,.15*embrace,0);child.pivots.leftShoulder.rotation.set(-.05-.15*embrace,0,-.35-.12*embrace);
   // Echo Mara's cyan ghost vocabulary, keep dark eyes and at least .78 opacity.
   e.root.traverse(o=>{if(!o.isMesh||o.userData.lookDepth)return;const mat=o.material,base=original.get(mat);let face=false;for(let n=o;n;n=n.parent)if(n===e.faceLayer)face=true;mat.color.copy(base.color).lerp(pale,face?0:.9*state.forgotten);mat.opacity=face?1:1-.22*state.forgotten;const transparent=!face&&state.forgotten>0;if(mat.transparent!==transparent){mat.transparent=transparent;mat.needsUpdate=true;}mat.depthWrite=face||state.forgotten===0;});
   Object.assign(depth.material,{transparent:false,opacity:1,colorWrite:false,depthWrite:true});for(const d of depth.meshes)d.visible=state.forgotten>0;
  }
  if(plan.ending.visuals==='s3b'){applyEndingPerformance(g,e,m,residents);c.fill.position.set(...(g>=1490?[-3,5,-4]:[3,5,8]));}
  overlay.apply(state);
  // This reverse insert needs its counter above the eyes, not over the face.
  if(plan.ending.visuals==='s3b'&&g>=1490&&g<1546)overlay.panel.position.y=580;
 },draw(renderer){overlay.draw(renderer);}};
}
