import * as THREE from 'three';
import {box} from './assets/box.js';
// S4 only: three town assemblies and two home cues, no new lighting system.
export function createStoryBackground(world){
 const c=world.courtyard;if(!c)return null;const group=new THREE.Group();group.name='s4_background';c.group.add(group);
 // 1: one distant stepped roofline, on the street opposite the existing facades.
 const roofs=new THREE.Group();roofs.name='s4_roofline';group.add(roofs);
 for(const [x,z,w,h,color] of [[11,2,6,6.2,0x526579],[15,-2,5,8.3,0x455d74]]){
  box(roofs,'occupied_house',[w,h,3.5],color,[x,h/2,z]);box(roofs,'roof_cap',[w+.15,.18,3.65],0x394b5d,[x,h-.05,z]);
 }
 // 2: restrained window patches on the existing street facades + new roofline.
 const windows=new THREE.Group();windows.name='s4_town_windows';group.add(windows);
 function warmWindow(parent,x,y,z,width=0.65){const m=box(parent,'warm_window',[width,.85,.035],0xc09a61,[x,y,z],.012);m.material.emissive.set(0xb17a3c);m.material.emissiveIntensity=.24;m.castShadow=false;return m;}
 for(const [x,y,z] of [[-7.3,4.4,-.96],[-9.8,6,-11.46]])warmWindow(windows,x,y,z);
 for(const z of [-2.4,-4.1]){const pane=warmWindow(windows,-5.27,4.4,z);pane.rotation.y=Math.PI/2;}
 // 3: reuse the existing street lamp/porch; one familiar grounded doorway step.
 box(group,'s4_neighbor_step',[1.8,.12,.65],0x748391,[-7.3,.06,-.7]);
 // Home cue1: shallow trim gives the existing doorway depth, same home position.
 const trim=new THREE.Group();trim.name='s4_home_trim';group.add(trim);
 for(const x of [2.13,5.07])box(trim,'door_trim',[.14,5.16,.24],0x969d9f,[x,2.58,-5.5],.015);
 box(trim,'door_trim_header',[3.08,.16,.24],0x969d9f,[3.6,5.16,-5.5],.015);
 // Home cue2: one quiet warm window, not a point light or bright focus pull.
 const home=warmWindow(group,6.4,4.6,-5.59,1.15);home.name='s4_home_window';home.scale.y=1.3;home.material.color.set(0x8e795c);home.material.emissiveIntensity=.08;
 box(group,'home_window_mullion',[.07,1.15,.045],0x485a69,[6.4,4.6,-5.56],.008);
 // The reused residents are not in the main cast action-reset loop. Restore
 // their authored factory transforms before applying the existing S3B cues,
 // so seeking from the later child walk cannot leak a shoulder/hip backwards.
 const rest=c.residents.flatMap(a=>[a.root,...Object.values(a.pivots)]).map(o=>({o,position:o.position.clone(),quaternion:o.quaternion.clone(),scale:o.scale.clone()}));
 return {group,resetResidents(){for(const r of rest){r.o.position.copy(r.position);r.o.quaternion.copy(r.quaternion);r.o.scale.copy(r.scale);}}};
}
