import * as THREE from 'three';
import {headFrontZ} from '../avatar/headGeometry.js';
// Small authored mouth cues, independent of narrator audio and body animation.
export function compileSpeaking(input,ids){
 if(!input||Object.keys(input).some(k=>!['actor','cues'].includes(k))||!ids.has(input.actor)||!Array.isArray(input.cues)||input.cues.length>8)throw new Error('Invalid speaking actor/cues');
 let end=-1;const seen=new Set();
 for(const c of input.cues){
  if(Object.keys(c).some(k=>!['id','shape','keys'].includes(k))||typeof c.id!=='string'||seen.has(c.id)||!['narrow','open'].includes(c.shape)||!Array.isArray(c.keys)||c.keys.length<3||c.keys.length>12)throw new Error('Invalid mouth cue');
  seen.add(c.id);let previous=-1;
  for(const k of c.keys){if(!Array.isArray(k)||k.length!==2||!Number.isSafeInteger(k[0])||k[0]<0||k[0]<=previous||!Number.isFinite(k[1])||k[1]<0||k[1]>1)throw new Error('Invalid mouth key');previous=k[0];}
  if(c.keys[0][0]<=end||c.keys[0][1]!==0||c.keys.at(-1)[1]!==0)throw new Error('Overlapping/unsealed mouth cue');end=c.keys.at(-1)[0];
 }
 return structuredClone(input);
}
export function sampleSpeaking(cues,g){
 if(!Number.isSafeInteger(g)||g<0)throw new Error('Invalid speech frame');
 const cue=cues.find(c=>g>=c.keys[0][0]&&g<=c.keys.at(-1)[0]);
 if(!cue)return {cue:null,shape:'closed',amount:0};
 const i=cue.keys.findIndex(k=>k[0]>=g);let amount=cue.keys[i][1];
 if(i>0){const [a,x]=cue.keys[i-1],[b,y]=cue.keys[i],t=(g-a)/(b-a);amount=x+(y-x)*t*t*(3-2*t);}
 return {cue:cue.id,shape:cue.shape,amount};
}
const baseMouth=face=>face?.children.find(o=>o.isMesh&&(o.name==='mouth'||!o.name&&o.geometry.type==='TubeGeometry'));
export function createSpeakingLayer(avatar){
 const group=new THREE.Group();group.name='speaking';group.userData.speaking=true;
 const material=new THREE.MeshBasicMaterial({color:0x202124});
 function oval(width,height){
  const vertices=[0,0,headFrontZ(0)+.014],indices=[];
  for(let i=0;i<=32;i++){const t=i/32*Math.PI*2,x=width*Math.cos(t);vertices.push(x,height*Math.sin(t),headFrontZ(x)+.014);if(i<32)indices.push(0,i+1,i+2);}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));g.setIndex(indices);return g;
 }
 const points=Array.from({length:17},(_,i)=>{const x=-.15+.3*i/16;return new THREE.Vector3(x,0,headFrontZ(x)+.014);});
 const geometries={closed:new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points),24,.012,8,false),narrow:oval(.13,.028),open:oval(.16,.078)};
 const meshes=Object.fromEntries(Object.entries(geometries).map(([name,g])=>{const m=new THREE.Mesh(g,material);m.name=`mouth_${name}`;m.position.y=.35;group.add(m);return [name,m];}));
 function clear(){group.removeFromParent();group.visible=false;for(const f of avatar.faceCache.values()){const m=baseMouth(f);if(m)m.visible=true;}for(const m of Object.values(meshes)){m.visible=false;m.scale.set(1,1,1);}}
 return {group,meshes,material,clear,apply(sample){
  // Restore cached expressions first, including faces detached on earlier seeks.
  clear();const face=avatar.faceLayer,mouth=baseMouth(face);
  if(!mouth){group.visible=false;return;}face.add(group);
  // User requires a sealed mouth during narration/silent surprise, too. Retain
  // the startled eyes/brows and its cached original O, hidden reversibly in S5.
  const speaking=sample.cue!==null&&sample.amount>=.08,sealedSurprise=face.name==='face_startled';group.visible=speaking||sealedSurprise;
  if(!group.visible)return;mouth.visible=false;
  material.color.copy(mouth.material.color);material.opacity=mouth.material.opacity;material.depthWrite=mouth.material.depthWrite;
  if(material.transparent!==mouth.material.transparent){material.transparent=mouth.material.transparent;material.needsUpdate=true;}
  if(!speaking){meshes.closed.visible=true;return;}
  const mesh=meshes[sample.shape];mesh.visible=true;mesh.scale.y=sample.amount;
 }};
}
