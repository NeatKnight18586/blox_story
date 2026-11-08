import * as THREE from 'three';
import {block} from '../avatar/baseAvatar.js';
const color=v=>Number.isInteger(v)&&v>=0&&v<=0xffffff||typeof v==='string'&&/^#[0-9a-f]{6}$/i.test(v);
export function normalizeWardrobe({hair=null,hairColor=0x40291f,clothing=null,clothingColor=0x24758a,cosmetic=null}={}){
 if(![null,'bob'].includes(hair)||![null,'vest'].includes(clothing)||!color(hairColor)||!color(clothingColor)||hair&&cosmetic)throw new Error('Invalid wardrobe (bob hair and cap are exclusive)');
 return {hair,hairColor,clothing,clothingColor};
}
function makeHair(){
 const group=new THREE.Group();group.name='hair_bob';
 function piece(name,size,position,radius=.06){const mesh=block(name,size,0x40291f,radius);mesh.position.set(...position);mesh.userData.tint=true;group.add(mesh);return mesh;}
 piece('crown',[1.32,.3,1.16],[0,1.14,-.02],.12);
 piece('back',[1.3,.68,.22],[0,.8,-.5],.08);
 for(const sign of [-1,1])piece('temple',[.16,.6,.7],[sign*.61,.8,-.12]);
 piece('fringe',[.58,.18,.14],[-.28,1,.5]).rotation.z=.06;return group;
}
function makeVest(avatar){
 const group=new THREE.Group();group.name='clothing_vest';
 const shell=new THREE.Mesh(avatar.parts.torso.geometry.clone(),new THREE.MeshStandardMaterial({color:0x24758a,roughness:.9}));
 shell.name='vest_shell';shell.scale.set(1.008,.97,1.016);shell.castShadow=true;shell.receiveShadow=true;shell.userData.tint=true;group.add(shell);
 // Shallow original front trim/buttons; the shell follows the chosen torso.
 const trim=block('vest_trim',[.045,1.65,.012],0xf1ddb5,.005);trim.position.z=.517;group.add(trim);
 for(const y of [-.45,0,.45]){const button=block('vest_button',[.055,.055,.02],0xf1ddb5,.01);button.position.set(.11,y,.525);group.add(button);}return group;
}
export function applyWardrobe(avatar,recipe){
 const state=normalizeWardrobe(recipe);avatar.wardrobeCache??=new Map();
 for(const [field,name,parent,tint,make] of [['hairLayer',state.hair,avatar.pivots.head,state.hairColor,makeHair],['clothingLayer',state.clothing,avatar.parts.torso,state.clothingColor,()=>makeVest(avatar)]]){
  if(avatar[field])avatar[field].removeFromParent();avatar[field]=null;
  if(name){if(!avatar.wardrobeCache.has(name))avatar.wardrobeCache.set(name,make());const layer=avatar.wardrobeCache.get(name);layer.traverse(o=>{if(o.userData.tint)o.material.color.set(tint);});parent.add(layer);avatar[field]=layer;}
 }
 return avatar;
}
