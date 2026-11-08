import * as THREE from 'three';
import {createCounterOverlay} from './assets/labels.js';
import {applyFace} from '../appearance/faces.js';
import {ghostFrontDepth} from './look-style.js';
import {ease} from './ending-cues.js';
export function compileOpening(input,plan){
 const rule=input?.kind==='rule',start=rule?0:259,end=rule?259:482;
 if(!input||Object.keys(input).some(k=>!['kind','globalStart','globalEnd'].includes(k))||!['rule','shy'].includes(input.kind)||input.globalStart!==start||input.globalEnd!==end||plan.frameCount!==end-start||plan.fps!==30||plan.environment.kind!=='home-courtyard'||!plan.cast.some(a=>a.id===(rule?'resident':'eli'))||!plan.cast.some(a=>a.id==='neighbor')||plan.reveal||plan.ending)throw new Error('Invalid bounded opening block');return {...input};
}
export function sampleOpening(plan,frame){
 const globalFrame=plan.globalStart+frame,rule=plan.kind==='rule';
 return {globalFrame,globalTime:globalFrame/30,actor:rule?'resident':'eli',counter:rule?(globalFrame<140?100:globalFrame<192?99:0):100,counterEmphasis:rule&&globalFrame>=94&&globalFrame<169,whisper:false,forgotten:rule?ease((globalFrame-192)/30):0,shy:rule?0:ease((globalFrame-320)/35),reach:!rule&&globalFrame>=398?Math.sin(Math.PI*ease((globalFrame-405)/65)):0};
}
export function createOpeningEffects(plan,avatars){
 const rule=plan.opening.kind==='rule',actor=avatars[rule?'resident':'eli'],neighbor=avatars.neighbor,overlay=createCounterOverlay({actor:rule?'resident':'eli',before:100,after:0,values:[100,99,0]},null),depth=rule?ghostFrontDepth(actor,'s2_rule_depth'):null,original=new WeakMap(),pale=new THREE.Color(0xb3dde2);
 for(const a of Object.values(avatars))for(const face of ['thoughtful','nervous','worried','relieved'])applyFace(a,face);
 return {overlay,apply(s,actors){
  const face=rule?(s.forgotten?'worried':'thoughtful'):s.globalFrame<320?'thoughtful':'nervous';applyFace(actor,face);actors[s.actor].face=face;applyFace(neighbor,'relieved');actors.neighbor.face='relieved';
  if(rule){neighbor.root.rotation.y+=1.25*s.forgotten;actor.root.traverse(o=>{if(!o.isMesh||o.userData.lookDepth)return;const m=o.material;if(!original.has(m))original.set(m,m.color.clone());let face=false;for(let n=o;n;n=n.parent)if(n===actor.faceLayer)face=true;m.color.copy(original.get(m)).lerp(pale,face?0:.9*s.forgotten);m.opacity=face?1:1-.22*s.forgotten;const transparent=!face&&s.forgotten>0;if(m.transparent!==transparent){m.transparent=transparent;m.needsUpdate=true;}m.depthWrite=face||s.forgotten===0;});for(const d of depth.meshes)d.visible=s.forgotten>0;}
  else{actor.pivots.head.rotation.y-=.18*s.shy;actor.pivots.head.rotation.x+=.10*s.shy;actor.pivots.leftShoulder.rotation.x-=.22*s.reach;neighbor.pivots.rightShoulder.rotation.z+=.18;}
  overlay.apply(s);
 },draw(renderer){overlay.draw(renderer);}};
}
