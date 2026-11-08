import * as THREE from 'three';
import {createBaseAvatar,block} from '../avatar/baseAvatar.js';
import {applyActionSample} from '../avatar/actions.js';
import {applyFace} from '../appearance/faces.js';
import {compileShotList,sampleShotList} from './timeline.js';

try {
 const response=await fetch('./feasibility.json');if(!response.ok)throw new Error('Shot list could not load');
 const plan=compileShotList(await response.json());
 const renderer=new THREE.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});renderer.setPixelRatio(1);renderer.setSize(plan.width,plan.height);renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.toneMapping=THREE.ACESFilmicToneMapping;document.body.append(renderer.domElement);
 const scene=new THREE.Scene();scene.background=new THREE.Color(0xcbd9df);
 scene.add(new THREE.HemisphereLight(0xffffff,0x6b7b87,2));
 const key=new THREE.DirectionalLight(0xfff1d8,3);key.position.set(-3,9,7);key.castShadow=true;key.shadow.mapSize.set(2048,2048);Object.assign(key.shadow.camera,{left:-7,right:7,top:8,bottom:-7,near:.1,far:30});key.shadow.normalBias=.015;key.shadow.bias=-.0001;scene.add(key);
 const fill=new THREE.DirectionalLight(0xb7dfff,1);fill.position.set(5,5,0);scene.add(fill);
 function box(name,size,color,position,parent=scene,radius=.03){const mesh=block(name,size,color,radius);mesh.position.set(...position);parent.add(mesh);return mesh;}
 // One original small workshop alcove: floor, two walls, plinth and wall marks.
 box('floor',[14,.2,14],0x81959e,[0,-.1,0]);
 box('back_wall',[14,7,.25],0xb7c9ce,[0,3.5,-4]);
 box('side_wall',[.25,7,10],0x66878c,[-5,3.5,1]);
 for(const x of [-2,0,2])box('wall_inlay',[.7,.08,.03],0xe3cba2,[x,3.6,-3.85]);
 box('plinth',[1.6,1.3,1.25],0x4e6876,[0,.65,3]);
 box('plinth_rim',[1.75,.12,1.4],0xadc4cc,[0,1.32,3]);
 const chest=new THREE.Group();chest.name='proximity_chest';chest.position.set(...plan.prop.position);scene.add(chest);
 // Five thin walls leave a real cavity, rather than an opaque solid box.
 box('chest_base',[1.3,.12,.95],0x294c62,[0,-.17,0],chest);
 for(const sign of [-1,1]){box('chest_side',[.1,.5,.95],0x355f75,[sign*.6,.1,0],chest);box('chest_end',[1.1,.5,.1],0x355f75,[0,.1,sign*.425],chest);}
 const hinge=new THREE.Group();hinge.position.set(0,.36,.475);chest.add(hinge);
 box('lid',[1.34,.12,1.02],0x3d7188,[0,.06,-.475],hinge);
 const glow=box('light_core',[.65,.15,.4],0x70efd7,[0,-.02,0],chest,.04);glow.material.emissive.set(0x52e8c7);glow.castShadow=false;
 const lamp=new THREE.PointLight(0x65ffe1,0,4,2);lamp.position.set(0,.5,0);chest.add(lamp);
 box('chest_latch',[.18,.22,.06],0xe8c77c,[0,.24,-.5],chest,.015);
 const avatar=createBaseAvatar();scene.add(avatar.root);applyFace(avatar,'classic_smile');
 const camera=new THREE.PerspectiveCamera(40,plan.width/plan.height,.1,60);
 const original=[avatar.root,...Object.values(avatar.parts),...Object.values(avatar.pivots)];
 function renderFrame(frame){
  const state=sampleShotList(plan,frame);applyActionSample(avatar,state.actor.action,state.actor.origin);applyFace(avatar,state.face);
  hinge.rotation.x=state.propOpen*1.3;glow.material.emissiveIntensity=.12+state.propOpen*2.5;lamp.intensity=state.propOpen*3;
  camera.fov=state.camera.fov;camera.position.set(...state.camera.position);camera.lookAt(...state.camera.target);camera.updateProjectionMatrix();renderer.render(scene,camera);
  return {frame,shot:state.shot,time:state.time,propOpen:state.propOpen,camera:state.camera,actorPosition:avatar.root.position.toArray(),identity:original.every((p,i)=>p===[avatar.root,...Object.values(avatar.parts),...Object.values(avatar.pivots)][i])};
 }
 // No clock/RAF: all frames, action time, cameras and prop state are explicit.
 window.__production={plan,renderFrame,renderer,scene,camera,avatar};renderFrame(0);
}catch(error){document.getElementById('error').textContent=error.message;throw error;}
