import * as THREE from 'three';
import { presets } from './presets.js';

const MAT = (color, roughness=.88) => new THREE.MeshStandardMaterial({color,roughness,metalness:0});
function block(parent, name, size, material, at, bevel=.075) {
  // RoundedBoxGeometry is an optional addon: create rounded-looking geometry using a bevelled extruded rectangle.
  const [w,h,d]=size, r=Math.min(bevel,w/3,h/3,d/3);
  const shape=new THREE.Shape();
  shape.moveTo(-w/2+r,-h/2);shape.lineTo(w/2-r,-h/2);shape.quadraticCurveTo(w/2,-h/2,w/2,-h/2+r);
  shape.lineTo(w/2,h/2-r);shape.quadraticCurveTo(w/2,h/2,w/2-r,h/2);
  shape.lineTo(-w/2+r,h/2);shape.quadraticCurveTo(-w/2,h/2,-w/2,h/2-r);
  shape.lineTo(-w/2,-h/2+r);shape.quadraticCurveTo(-w/2,-h/2,-w/2+r,-h/2);
  const geo=new THREE.ExtrudeGeometry(shape,{depth:d-2*r,bevelEnabled:true,bevelSegments:2,steps:1,bevelSize:r,bevelThickness:r,curveSegments:3});
  geo.translate(0,0,-d/2+r);
  const mesh=new THREE.Mesh(geo,material);mesh.name=name;mesh.position.set(...at);mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh);return mesh;
}
function pivot(parent,name,at){const p=new THREE.Group();p.name=name;p.position.set(...at);parent.add(p);return p;}
function sphere(parent,name,size,material,at){const m=new THREE.Mesh(new THREE.SphereGeometry(1,12,8),material);m.name=name;m.scale.set(...size);m.position.set(...at);m.castShadow=true;parent.add(m);return m;}
function facePiece(parent,name,size,mat,xyz){return block(parent,name,size,mat,xyz,.012);}
export function createCharacter(preset='kai'){
  const p=typeof preset==='string'?presets[preset]:preset;
  if(!p||!p.id||!p.hairStyle)throw new Error('Unknown character preset');
  const root=new THREE.Group();root.name=p.id;root.userData.characterId=p.id;
  const clothes=MAT(p.top), cuffs=MAT(p.cuff), skin=MAT(p.skin,.79), hair=MAT(p.hair), pants=MAT(p.pants), shoes=MAT(p.shoe,.71);
  const dark=MAT(0x24212B), eyes=MAT(0x211F25,.52), mouthMat=MAT(0x824A4E), accent=MAT(p.accent);
  // Character height ~3.3 world units. Feet touch y=0.
  const torso=pivot(root,'torso',[0,1.92,0]);
  block(torso,'body',[1.17,1.30,.67],clothes,[0,0,0]);
  // Hoodie collar + hood rim behind neck, small front pocket on Kai.
  block(torso,'collar',[.58,.14,.70],cuffs,[0,.62,0]);
  if(p.id==='kai'){
    block(torso,'hood_back',[.81,.68,.23],cuffs,[0,.42,-.43]);
    block(torso,'hood_inset',[.57,.38,.07],clothes,[0,.42,-.567]);
    block(torso,'pocket',[.66,.26,.055],cuffs,[0,-.30,.37],.028);
    block(torso,'drawstring_L',[.027,.27,.03],accent,[-.15,.38,.39],.008);
    block(torso,'drawstring_R',[.027,.27,.03],accent,[.15,.38,.39],.008);
  } else {
    block(torso,'neckline',[.54,.12,.08],cuffs,[0,.61,.35]);
    block(torso,'hem',[1.12,.11,.69],cuffs,[0,-.58,0]);
  }
  block(root,'neck',[.29,.21,.27],skin,[0,2.69,0],.045);
  const head=pivot(root,'head',[0,2.79,0]);
  block(head,'head_shell',[.94,.90,.80],skin,[0,.27,0],.13);
  // Visible face faces +Z. Eyes and brows float just above front face.
  const face=pivot(head,'face',[0,0,0]);
  for(const side of [-1,1]){
    const x=side*.203;
    sphere(face,`eye_${side}`,[.051,.065,.018],eyes,[x,.32,.414]);
  }
  const leftBrow=facePiece(face,'brow_L',[.19,.036,.025],dark,[-.204,.498,.420]);
  const rightBrow=facePiece(face,'brow_R',[.19,.036,.025],dark,[.204,.498,.420]);
  const mouth=facePiece(face,'mouth',[.18,.027,.019],mouthMat,[0,.135,.425]);
  // Top hair layers make recognizable silhouettes rather than a painted flat cap.
  block(head,'hair_cap',[1.00,.21,.88],hair,[0,.72,-.035],.09);
  if(p.hairStyle==='short'){
    block(head,'fringe_L',[.40,.18,.27],hair,[-.29,.625,.34],.06);
    block(head,'fringe_R',[.39,.12,.28],hair,[.20,.66,.32],.05);
    block(head,'sideburn_L',[.16,.28,.36],hair,[-.47,.42,-.07],.05);
    block(head,'sideburn_R',[.16,.23,.36],hair,[.47,.43,-.07],.05);
    block(head,'crown',[.57,.13,.52],hair,[.10,.83,-.16],.06);
  } else {
    block(head,'bob_back',[1.10,.87,.31],hair,[0,.31,-.405],.11);
    block(head,'bob_L',[.24,.87,.66],hair,[-.52,.30,-.08],.09);
    block(head,'bob_R',[.24,.87,.66],hair,[.52,.30,-.08],.09);
    block(head,'bang_L',[.48,.21,.32],hair,[-.28,.63,.32],.065);
    block(head,'bang_R',[.42,.15,.28],hair,[.21,.665,.34],.05);
  }
  const shoulders={}, hips={};
  for(const side of [-1,1]){
    const s=side===-1?'left':'right';
    const shoulder=pivot(torso,`${s}Shoulder`,[side*.75,.45,0]);shoulders[s]=shoulder;
    block(shoulder,`${s}_sleeve`,[.36,.67,.48],clothes,[0,-.30,0],.09);
    block(shoulder,`${s}_cuff`,[.36,.17,.48],cuffs,[0,-.65,0],.045);
    block(shoulder,`${s}_hand`,[.29,.29,.33],skin,[0,-.87,.025],.055);
    const hip=pivot(root,`${s}Hip`,[side*.32,1.27,0]);hips[s]=hip;
    block(hip,`${s}_pant`,[.49,.98,.51],pants,[0,-.49,0],.065);
    block(hip,`${s}_shoe`,[.52,.24,.70],shoes,[0,-1.15,.13],.075);
    block(hip,`${s}_sole`,[.53,.065,.73],dark,[0,-1.2375,.13],.028);
  }
  const character={root,id:p.id,preset:p,pivots:{head,leftShoulder:shoulders.left,rightShoulder:shoulders.right,leftHip:hips.left,rightHip:hips.right},parts:{leftBrow,rightBrow,mouth}};
  applyPose(character,'neutral');applyExpression(character,'neutral');
  return character;
}
const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));
export function applyPose(character,poseName,t=0){
  if(!['neutral','walk_demo','look_down'].includes(poseName))throw new Error(`Unknown pose: ${poseName}`);
  const {head,leftShoulder:ls,rightShoulder:rs,leftHip:lh,rightHip:rh}=character.pivots;
  head.rotation.set(0,0,0);ls.rotation.set(0,0,-.09);rs.rotation.set(0,0,.09);lh.rotation.set(0,0,0);rh.rotation.set(0,0,0);
  if(poseName==='walk_demo'){
    const a=Math.sin(Number(t)*Math.PI*2)*.42;
    lh.rotation.x=clamp(a,-.50,.50);rh.rotation.x=clamp(-a,-.50,.50);
    ls.rotation.x=clamp(-a*.78,-.45,.45);rs.rotation.x=clamp(a*.78,-.45,.45);
    head.rotation.z=Math.sin(Number(t)*Math.PI*2)*.025;
  } else if(poseName==='look_down'){
    head.rotation.x=.25;ls.rotation.x=-.12;rs.rotation.x=-.12;
  }
  character.root.userData.poseName=poseName;
  return character;
}
export function applyExpression(character,expressionName){
  if(!['neutral','worried'].includes(expressionName))throw new Error(`Unknown expression: ${expressionName}`);
  const {leftBrow,rightBrow,mouth}=character.parts;
  leftBrow.rotation.z=0;rightBrow.rotation.z=0;mouth.rotation.z=0;
  leftBrow.position.y=.498;rightBrow.position.y=.498;
  mouth.position.y=.135;mouth.scale.set(1,1,1);
  if(expressionName==='worried'){
    leftBrow.rotation.z=.22;rightBrow.rotation.z=-.22;
    leftBrow.position.y=.53;rightBrow.position.y=.53;
    mouth.scale.set(.62,1.9,1);mouth.position.y=.12;
  }
  character.root.userData.expressionName=expressionName;
  return character;
}
