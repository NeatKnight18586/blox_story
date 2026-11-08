import * as THREE from 'three';
import {createBaseAvatar} from '../avatar/baseAvatar.js';
import {applyActionSample} from '../avatar/actions.js';
import {applyAppearance} from '../appearance/appearance.js';
import {createWorkshop} from './assets/workshop.js';
import {createChest} from './assets/chest.js';
import {applyFace} from '../appearance/faces.js';
import {compileShotList,sampleShotList} from './timeline.js';

try {
 let input=window.__shotListInput;
 if(!input){const response=await fetch('./feasibility.json');if(!response.ok)throw new Error('Shot list could not load');input=await response.json();}
 const plan=compileShotList(input);
 const renderer=new THREE.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});renderer.setPixelRatio(1);renderer.setSize(plan.width,plan.height);renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.toneMapping=THREE.ACESFilmicToneMapping;document.body.append(renderer.domElement);
 const scene=new THREE.Scene();createWorkshop(scene,plan.version===2?plan.environment:{});
 const specs=plan.version===2?plan.props:[{...plan.prop,id:'proximity_chest'}];
 const props=Object.fromEntries(specs.map(spec=>[spec.id,createChest(scene,spec)]));
 const avatar=createBaseAvatar();scene.add(avatar.root);applyFace(avatar,'classic_smile');
 const camera=new THREE.PerspectiveCamera(40,plan.width/plan.height,.1,60);
 const original=[avatar.root,...Object.values(avatar.parts),...Object.values(avatar.pivots)];
 function renderFrame(frame){
  const state=sampleShotList(plan,frame);applyActionSample(avatar,state.actor.action,state.actor.origin);applyFace(avatar,state.face);
  if(state.appearance)applyAppearance(avatar,state.appearance);
  const propStates=state.propStates??{proximity_chest:{open:state.propOpen}};
  for(const [id,prop] of Object.entries(props))prop.apply(propStates[id]);
  camera.fov=state.camera.fov;camera.position.set(...state.camera.position);camera.lookAt(...state.camera.target);camera.updateProjectionMatrix();renderer.render(scene,camera);
  return {frame,shot:state.shot,time:state.time,propOpen:state.propOpen??null,camera:state.camera,actorPosition:avatar.root.position.toArray(),propStates,identity:original.every((p,i)=>p===[avatar.root,...Object.values(avatar.parts),...Object.values(avatar.pivots)][i])};
 }
 // No clock/RAF: all frames, action time, cameras and prop state are explicit.
 window.__production={plan,renderFrame,renderer,scene,camera,avatar};renderFrame(0);
}catch(error){window.__productionError=error.message;document.getElementById('error').textContent=error.message;throw error;}
