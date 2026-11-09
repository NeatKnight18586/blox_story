// Original curated palette: persistent IDs, no random color assignment.
import {block} from '../avatar/baseAvatar.js';
export const SKIN_TONES=Object.freeze({
 porcelain:0xf2d6bf, fair:0xecc39e, peach:0xdba77d, warm:0xc78f65,
 tan:0xb77d53, caramel:0x98613e, umber:0x74462f, deep:0x4c3028
});
export function skinColor(id){
 if(!Object.hasOwn(SKIN_TONES,id))throw new Error(`Unknown skin tone: ${id}`);
 return SKIN_TONES[id];
}
// Optional hand caps below otherwise long block sleeves. Six body meshes unchanged.
export function applySkinDetails(avatar,id){
 const color=skinColor(id);
 if(!avatar.v2Hands){
  const hands=[];
  for(const side of ['left','right']){
   const hand=block(`v2_${side}_hand`,[.76,.25,.82],color,.07);
   hand.position.set(0,-2.055,.025);
   avatar.pivots[`${side}Shoulder`].add(hand);hands.push(hand);
  }
  avatar.v2Hands=hands;
 }
 for(const [i,mesh] of avatar.v2Hands.entries()){
  if(!mesh.parent)avatar.pivots[`${i===0?'left':'right'}Shoulder`].add(mesh);
  mesh.material.color.setHex(color);
 }
 return avatar;
}
export function hideSkinDetails(avatar){
 for(const mesh of avatar.v2Hands??[])mesh.removeFromParent();
 // Keep cached meshes, so a later tone switch never creates new meshes.
}
