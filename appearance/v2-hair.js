// Original block-game hairstyles; hair IDs represent silhouette, not gender.
import * as THREE from 'three';
import {block} from '../avatar/baseAvatar.js';
export const HAIR_STYLES=Object.freeze([
 'side_swept','spiky','messy_fringe','curtains','long_straight',
 'ponytail','twin_buns','curly_crop','low_bun'
]);
export const HAIR_COLORS=Object.freeze({
 black:0x24252b, espresso:0x372820, brown:0x6b4932, chestnut:0x935e3b,
 blonde:0xd4ad65, platinum:0xe7d5aa, auburn:0x9d4c35, blue_black:0x2b344b
});
export function hairColor(id){
 if(!Object.hasOwn(HAIR_COLORS,id))throw new Error(`Unknown hair color: ${id}`);
 return HAIR_COLORS[id];
}
export function makeV2Hair(id){
 if(!HAIR_STYLES.includes(id))throw new Error(`Unknown hair style: ${id}`);
 const g=new THREE.Group();g.name=`hair_${id}`;
 function p(name,size,at,r=.06,twist=0){
  const m=block(name,size,0x44342b,r);m.position.set(...at);m.rotation.z=twist;
  m.userData.tint=true;g.add(m);return m;
 }
 // A small fitted cap forms a continuous scalp, not detached disconnected cubes.
 p('scalp',[1.30,.27,1.12],[0,1.13,-.015],.11);
 const side=(length=.38)=>{for(const s of [-1,1])p('side_lock',[.16,length,.62],[s*.603,.96-length*.35,-.075],.075)};
 const back=(length=.45)=>p('back_layer',[1.20,length,.20],[0,1.05-length*.49,-.505],.075);
 switch(id){
  case 'side_swept':side(.23);p('sweep',[.86,.21,.19],[-.16,1.06,.46],.09,-.15);p('sweep_tip',[.37,.16,.14],[.38,.98,.50],.06,.25);break;
  case 'spiky':side(.20);for(const [x,h,t] of [[-.43,.25,-.25],[-.13,.40,-.08],[.20,.32,.17],[.47,.23,.28]])p('spike',[.23,h,.26],[x,1.28+h*.28,-.025],.07,t);break;
  case 'messy_fringe':side(.29);back(.34);for(const [x,y,t] of [[-.38,1.04,-.18],[-.06,1.02,.12],[.29,1.01,.19]])p('fringe',[.44,.19,.25],[x,y,.48],.07,t);break;
  case 'curtains':side(.24);back(.29);for(const s of [-1,1])p('curtain',[.48,.39,.20],[s*.29,.91,.46],.085,s*.11);break;
  case 'long_straight':side(.76);back(.91);p('front_part',[.56,.17,.18],[-.29,1.07,.47],.06);break;
  case 'ponytail':side(.27);back(.34);p('tie',[.31,.22,.23],[0,1.05,-.64],.09);p('pony',[.36,.73,.32],[0,.62,-.79],.13);break;
  case 'twin_buns':side(.23);for(const s of [-1,1])p('bun',[.47,.47,.45],[s*.60,1.22,-.09],.19);break;
  case 'curly_crop':side(.29);for(const x of [-.44,-.17,.14,.41])for(const z of [-.25,.23])p('curl',[.32,.29,.32],[x,1.27,z],.13);break;
  case 'low_bun':side(.35);back(.41);p('low_bun',[.54,.48,.52],[0,.73,-.68],.22);break;
 }
 return g;
}
