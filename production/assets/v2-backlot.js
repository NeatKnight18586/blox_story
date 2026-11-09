// Selective 2.5D street layers: repeatable silhouettes behind the in-focus action.
import * as THREE from 'three';
import {box} from './box.js';
export const BACKLOT_PALETTES=Object.freeze({
 moonlit:Object.freeze({building:0x354b60,roof:0x21364c,trim:0x718494,glass:0x9c8564}),
 sunrise:Object.freeze({building:0x857d78,roof:0x656c79,trim:0xb0a99b,glass:0xd4a773})
});
export function createV2Backlot(parent,{palette='moonlit',layout='street_depth'}={}){
 if(!Object.hasOwn(BACKLOT_PALETTES,palette)||!['street_depth','homecoming'].includes(layout))throw new Error('Unknown backdrop');
 const c=BACKLOT_PALETTES[palette],root=new THREE.Group();root.name=`v2_${layout}_${palette}`;parent.add(root);
 const placements=layout==='street_depth'?[
  [-9,-13,5.7,7.4],[-2.2,-17,5.0,8.3],[5,-22,6.8,9.0],[10.7,-16,4.6,6.2]
 ]:[[-9,-15,5.5,6.6],[8.5,-18,6,8.2]];
 for(const [x,z,w,h] of placements){
  const g=new THREE.Group();g.name='facade_module';root.add(g);
  const building=box(g,'wall',[w,h,1.4],c.building,[x,h/2,z]);building.castShadow=false;
  const roof=box(g,'roof',[w+.25,.20,1.65],c.roof,[x,h-.03,z]);roof.castShadow=false;
  for(const delta of [-w*.24,w*.24]){
   const frame=box(g,'window_frame',[.82,1.16,.09],c.trim,[x+delta,h*.62,z+.76]);frame.castShadow=false;
   const glass=box(g,'window_glass',[.62,.94,.10],c.glass,[x+delta,h*.62,z+.815]);
   glass.castShadow=false;glass.material.emissive.set(c.glass);glass.material.emissiveIntensity=.16;
  }
 }
 // Two readable distant practical cues: a curb and one unanimated street light.
 const curb=box(root,'street_curb',[20,.11,.14],c.trim,[0,.055,-7]);curb.castShadow=false;
 const lamp=new THREE.Group();lamp.name='streetlamp_module';root.add(lamp);lamp.position.set(-6.8,0,-5.6);
 const pole=box(lamp,'pole',[.13,4.7,.13],c.roof,[0,2.35,0]);pole.castShadow=false;
 const shade=box(lamp,'shade',[.64,.18,.58],c.roof,[0,4.76,0]);shade.castShadow=false;
 const bulb=box(lamp,'lamp_warm',[.33,.28,.33],c.glass,[0,4.56,0]);bulb.material.emissive.set(c.glass);bulb.material.emissiveIntensity=.5;bulb.castShadow=false;
 root.userData.focusClearance=[-1.8,1.8];root.userData.layer='background_only';
 return root;
}
