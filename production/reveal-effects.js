import * as THREE from 'three';
import {applyFace} from '../appearance/faces.js';
import {makeNameTag,createCounterOverlay} from './assets/labels.js';
export function createRevealEffects(plan,avatars,world){
 const p=plan.reveal,v1=p.visuals==='v1',tag=makeNameTag(p.tag.text),ghost=avatars[p.ghost.actor],observer=avatars[p.counter.actor];
 ghost.pivots.leftShoulder.add(tag);tag.position.set(0,-1.92,.55);
 if(v1)for(const a of Object.values(avatars)){for(const face of ['nervous','startled','thoughtful','relieved'])applyFace(a,face);applyFace(a,'worried');}
 const overlay=createCounterOverlay(p.counter,v1?null:p.whisper.text),original=new WeakMap(),ghostColor=new THREE.Color(0xb3dde2),faceColor=new THREE.Color(0x1b3545);
 function faceMaterial(object){for(let o=object;o;o=o.parent)if(o===ghost.faceLayer)return true;return false;}
 function tagObject(object){for(let o=object;o;o=o.parent)if(o===tag)return true;return false;}
 return {tag,overlay,apply(state,actors){
  // The ordinary action application immediately before this resets all pivots.
  observer.pivots.head.position.z+=.10*state.lean;observer.pivots.head.rotation.x+=.14*state.lean;
  ghost.pivots.leftShoulder.rotation.z-=.85*state.tagLift;ghost.pivots.leftShoulder.rotation.x-=.12*state.tagLift;
  tag.quaternion.copy(ghost.pivots.leftShoulder.quaternion).invert();tag.visible=state.tagVisible;
  tag.traverse(o=>{if(o.isMesh)o.material.opacity=state.tagOpacity;});
  const mix=state.ghostToHuman;
  const faces=v1?{[p.ghost.actor]:mix>=.65?'relieved':'nervous',[p.counter.actor]:state.globalFrame<p.counter.at?'nervous':state.globalFrame<p.counter.emphasis[0]?'startled':mix===1?(p.restoredReaction??'relieved'):'thoughtful'}:{[p.ghost.actor]:mix>=.65?'classic_smile':actors[p.ghost.actor].face,[p.counter.actor]:mix===1?'classic_smile':actors[p.counter.actor].face};
  for(const [id,face] of Object.entries(faces)){applyFace(avatars[id],face);actors[id].face=face;}
  ghost.root.traverse(o=>{
   if(!o.isMesh||tagObject(o))return;const m=o.material,isFace=faceMaterial(o);
   if(!original.has(m))original.set(m,{color:m.color.clone(),emissive:m.emissive?.clone(),emissiveIntensity:m.emissiveIntensity,transparent:m.transparent,depthWrite:m.depthWrite,opacity:m.opacity,castShadow:o.castShadow});
   const base=original.get(m);m.color.copy(isFace?faceColor:ghostColor).lerp(base.color,mix);m.transparent=true;m.opacity=isFace?1:.58+.42*mix;m.depthWrite=mix===1;
   if(m.emissive){m.emissive.copy(ghostColor).multiplyScalar(.25*(1-mix));m.emissiveIntensity=1;}
   o.castShadow=mix===1&&base.castShadow;
  });
  world.warmth.intensity=(v1?8:12)*mix;overlay.apply(state);
 },draw(renderer){overlay.draw(renderer);}};
}
