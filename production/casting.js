import {compileOpening,sampleOpening} from './opening.js';
import {compileEnding,sampleEnding} from './ending-cues.js';
import {FACE_NAMES} from '../appearance/faces.js';
import {compileReveal,sampleReveal,revealCamera} from './reveal-cues.js';
import {compilePipeline,samplePipeline,worldPosition,normalizeAppearance} from './shots.js';
import {normalizeWardrobe} from '../appearance/wardrobe.js';
import {resolveComposition} from './cameras.js';
import {compileEvents,samplePropEvents} from './events.js';
const validId=v=>typeof v==='string'&&/^[a-z][a-z0-9_-]{0,63}$/.test(v);
function keys(value,allowed){if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).some(k=>!allowed.includes(k)))throw new Error('Unknown casting field');}
const baseRecipe=value=>Object.fromEntries(Object.entries(value).filter(([k])=>['color','pieces','cosmetic'].includes(k)));
function recipe(value={}){keys(value,['color','pieces','cosmetic','hair','hairColor','clothing','clothingColor']);return {...normalizeAppearance(baseRecipe(value)),...normalizeWardrobe(value)};}
export function compileCasting(input){
 keys(input,['version','title','output','environment','props','events','cast','shots','reveal','ending','look','opening','counterMode']);const data=structuredClone(input);
 if(data.counterMode!==undefined&&!['legacy','clean'].includes(data.counterMode))throw new Error('Unknown counter capture mode');
 if(data.look!==undefined&&data.look!=='s1')throw new Error('Unknown visual look');
 if(data.environment?.kind==='home-courtyard'&&data.look!=='s1')throw new Error('Opening courtyard requires S1 look');
 if(data.version!==3||!Array.isArray(data.cast)||!data.cast.length||data.cast.length>2||!Array.isArray(data.shots)||!data.shots.length||data.shots.length>32)throw new Error('Casting requires 1–2 actors and 1–32 shots');
 const ids=new Set();for(const actor of data.cast){keys(actor,['id','torsoVariant','appearance','face']);if(!validId(actor.id)||ids.has(actor.id)||!['classic','tapered'].includes(actor.torsoVariant??'classic'))throw new Error('Invalid cast identity/body');ids.add(actor.id);actor.torsoVariant??='classic';actor.appearance=recipe(actor.appearance);actor.face??='classic_smile';if(!FACE_NAMES.includes(actor.face))throw new Error('Unknown cast face');}
 for(const shot of data.shots){keys(shot,['id','start','end','camera','actors']);if(!Array.isArray(shot.actors)||shot.actors.length!==ids.size||new Set(shot.actors.map(a=>a?.id)).size!==ids.size||shot.actors.some(a=>!ids.has(a?.id)))throw new Error('Every shot must specify every cast ID exactly once');for(const actor of shot.actors)keys(actor,['id','action','origin','originFromEndOf','face','appearance']);}
 const placeholder={position:[0,4,10],target:[0,3,0],fov:40};
 // Delegate time, action, continuity, environment, prop and legacy appearance
 // validation/sampling to P1. This is casting, not another animation engine.
 const actorPlans=Object.fromEntries(data.cast.map(def=>{
  const appearances=[];const shots=data.shots.map(shot=>{
   const actor=shot.actors.find(a=>a.id===def.id);const full=recipe(actor.appearance??def.appearance);appearances.push(full);
   const {id,...request}=actor;return {...request,id:shot.id,start:shot.start,end:shot.end,camera:shot.camera?.preset?placeholder:shot.camera,face:actor.face??def.face,appearance:baseRecipe(full)};
  });
  const plan=compilePipeline({version:2,title:data.title,output:data.output,environment:data.environment,props:data.props,events:[],shots});plan.shots.forEach((s,i)=>s.appearance=appearances[i]);return [def.id,plan];
 }));
 const first=actorPlans[data.cast[0].id];
 const shots=first.shots.map((shot,i)=>{
  const spec=data.shots[i].camera,actors=Object.fromEntries(data.cast.map(def=>{const state=samplePipeline(actorPlans[def.id],shot.start).actor;return [def.id,{position:worldPosition(state.action.root.position,state.origin),yaw:state.origin.yaw}];}));
  const camera=spec?.preset?resolveComposition(spec,actors,first.width/first.height):shot.camera;
  if(!camera.position.every(Number.isFinite)||!camera.target.every(Number.isFinite))throw new Error('Invalid resolved composition');
  return {id:shot.id,start:shot.start,end:shot.end,camera,composition:spec.preset?spec:null};
 });
 const reveal=data.reveal?compileReveal(data.reveal,{fps:first.fps,frameCount:first.frameCount,cast:data.cast,environment:first.environment}):null;
 const events=compileEvents(data.events??[],first.props,first.frameCount,(frame,id)=>{const state=samplePipeline(actorPlans[id??data.cast[0].id],frame).actor;return worldPosition(state.action.root.position,state.origin);},ids);
 const opening=data.opening?compileOpening(data.opening,{...first,cast:data.cast,reveal,ending:data.ending}):null;
 const ending=data.ending?compileEnding(data.ending,{...first,cast:data.cast,reveal}):null;
 return {version:3,title:data.title,width:first.width,height:first.height,fps:first.fps,frameCount:first.frameCount,environment:first.environment,props:first.props,cast:data.cast,shots,actorPlans,events,...(reveal?{reveal}: {}),...(ending?{ending}:{}),...(data.look?{look:data.look}:{}),...(opening?{opening}:{}),...(data.counterMode?{counterMode:data.counterMode}:{})};
}
export function sampleCasting(plan,frame){
 if(!Number.isInteger(frame)||frame<0||frame>=plan.frameCount)throw new Error('Invalid frame index');const shot=plan.shots.find(s=>frame>=s.start&&frame<s.end);
 const actors=Object.fromEntries(plan.cast.map(def=>{const s=samplePipeline(plan.actorPlans[def.id],frame);return [def.id,{...s.actor,face:s.face,appearance:s.appearance}];}));
 const reveal=plan.reveal?sampleReveal(plan.reveal,frame):null;
 return {frame,time:frame/plan.fps,shot:shot.id,camera:reveal?revealCamera(plan.reveal,reveal,shot.camera):shot.camera,actors,...(reveal?{reveal}:{}),...(plan.ending?{ending:sampleEnding(plan.ending,frame)}:{}),...(plan.opening?{opening:sampleOpening(plan.opening,frame)}:{}),propStates:samplePropEvents(plan.props,plan.events,frame)};
}
