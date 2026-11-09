import {createS7Environment} from './s7-environment.js';
import {createSpeakingLayer,sampleSpeaking} from '../appearance/speaking.js';
import {createStoryBackground} from './story-background.js';
import {createFinish} from './finish.js';
import {createOpeningEffects} from './opening.js';
import {createLook} from './look-style.js';
import {createCourtyard} from './assets/courtyard.js';
import {createEndingStage,createEndingEffects} from './ending-effects.js';
import {createBedroom} from './assets/bedroom.js';
import {createRevealEffects} from './reveal-effects.js';
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
 if(!input){const file=new URLSearchParams(location.search).get('shots')??'feasibility.json';if(!/^(?:[a-z0-9][a-z0-9_-]*\/)*[a-z0-9][a-z0-9_.-]*\.json$/i.test(file))throw new Error('Invalid shot-list filename');const response=await fetch((file.includes('/')?'../':'./')+file);if(!response.ok)throw new Error('Shot list could not load');input=await response.json();}
 const plan=compileShotList(input);
 const renderer=new THREE.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});renderer.setPixelRatio(1);renderer.setSize(plan.width,plan.height);renderer.shadowMap.enabled=true;renderer.shadowMap.type=plan.finish==='p5'?THREE.PCFShadowMap:THREE.PCFSoftShadowMap;renderer.toneMapping=THREE.ACESFilmicToneMapping;document.body.append(renderer.domElement);
 const scene=new THREE.Scene(),world=plan.ending?createEndingStage(scene):plan.environment?.kind==='home-courtyard'?{courtyard:createCourtyard(scene)}:plan.environment?.kind==='bedroom-window'?createBedroom(scene,{visuals:plan.reveal?.visuals}):createWorkshop(scene,plan.version>=2?plan.environment:{});
 const specs=plan.version>=2?plan.props:[{...plan.prop,id:'proximity_chest'}];
 const props=Object.fromEntries(specs.map(spec=>[spec.id,createChest(scene,spec)]));
 const cast=plan.cast??[{id:'actor',torsoVariant:'classic'}];
 const avatars=Object.fromEntries(cast.map(def=>{const a=createBaseAvatar({torsoVariant:def.torsoVariant});a.root.name=def.id;scene.add(a.root);applyFace(a,'classic_smile');return [def.id,a];})),avatar=avatars[cast[0].id];
 const camera=new THREE.PerspectiveCamera(40,plan.width/plan.height,.1,60);
 const references=a=>[a.root,...Object.values(a.parts),...Object.values(a.pivots),...Object.values(a.parts).flatMap(m=>[m.geometry,m.material])];
 const original=Object.values(avatars).flatMap(references);
 const reveal=plan.reveal?createRevealEffects(plan,avatars,world):null;
 const ending=plan.ending?createEndingEffects(plan,avatars,world):null;
 const opening=plan.opening?createOpeningEffects(plan,avatars):null;
 const look=plan.look==='s1'?createLook(plan,scene,world,avatars):null;
 // Capture the original scene without its counter; cue state remains available
 // for later FFmpeg compositing. Leave physical tags/other story effects intact.
 if(plan.counterMode==='clean')for(const fx of [reveal,ending,opening,look])if(fx?.overlay?.panel)fx.overlay.panel.visible=false;
 const background=plan.dressing==='s4'?createStoryBackground(world):null;
 const speaking=plan.speaking?createSpeakingLayer(avatars[plan.speaking.actor]):null;
 const finish=plan.finish==='p5'?createFinish(scene,avatars):null;
 const environmentStyle=plan.environmentStyle==='s7'?createS7Environment(scene,world):null;
 function renderFrame(frame){
  const state=sampleShotList(plan,frame),actors=state.actors??{[cast[0].id]:{...state.actor,face:state.face,appearance:state.appearance}};
  for(const [id,s] of Object.entries(actors)){const a=avatars[id];applyActionSample(a,s.action,s.origin);applyFace(a,s.face);if(s.appearance)applyAppearance(a,s.appearance);}
  if(background)background.resetResidents();
  if(reveal)reveal.apply(state.reveal,actors);if(ending)ending.apply(state.ending,actors,scene);if(opening)opening.apply(state.opening,actors);if(look)look.apply(state);if(speaking)speaking.apply(sampleSpeaking(plan.speaking.cues,(state.opening??state.reveal??state.ending)?.globalFrame??frame));if(finish)finish.apply(state);
  const propStates=state.propStates??{proximity_chest:{open:state.propOpen}};
  for(const [id,prop] of Object.entries(props))prop.apply(propStates[id]);
  camera.fov=state.camera.fov;camera.position.set(...state.camera.position);camera.lookAt(...state.camera.target);camera.updateProjectionMatrix();if(environmentStyle)environmentStyle.apply(state,camera);renderer.render(scene,camera);if(reveal)reveal.draw(renderer);if(ending)ending.draw(renderer);if(look)look.draw(renderer);if(opening)opening.draw(renderer);
  return {frame,shot:state.shot,time:state.time,propOpen:state.propOpen??null,camera:state.camera,actorPosition:avatar.root.position.toArray(),propStates,...(state.reveal?{reveal:state.reveal}:{}),...(state.ending?{ending:state.ending}:{}),...(state.opening?{opening:state.opening}:{}),...(plan.version===3?{actors:Object.fromEntries(Object.entries(actors).map(([id,s])=>[id,{position:avatars[id].root.position.toArray(),face:s.face,appearance:s.appearance,torsoVariant:avatars[id].torsoVariant}]))}:{}),identity:original.every((p,i)=>p===Object.values(avatars).flatMap(references)[i])};
 }
 // No clock/RAF: all frames, action time, cameras and prop state are explicit.
 window.__production={plan,renderFrame,renderer,scene,camera,avatar,avatars,world,reveal,ending,look,opening,finish,background,speaking,environmentStyle};renderFrame(0);
}catch(error){window.__productionError=error.message;document.getElementById('error').textContent=error.message;throw error;}
