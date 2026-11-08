import {FACE_NAMES} from '../appearance/faces.js';
import {sampleAction} from '../avatar/actions.js';
import {compileEvents,samplePropEvents} from './events.js';
const id=value=>typeof value==='string'&&/^[a-z][a-z0-9_-]{0,63}$/.test(value);
const vector=v=>Array.isArray(v)&&v.length===3&&v.every(n=>Number.isFinite(n)&&Math.abs(n)<=1e6);
function keys(object,allowed){if(!object||typeof object!=='object'||Array.isArray(object)||Object.keys(object).some(k=>!allowed.includes(k)))throw new Error('Unknown or malformed configuration field');}
function color(v){return Number.isInteger(v)&&v>=0&&v<=0xffffff||typeof v==='string'&&/^#[0-9a-f]{6}$/i.test(v);}
export function normalizeAppearance(value={}){
 keys(value,['color','pieces','cosmetic']);const result={color:value.color??0xbfc1c3,pieces:value.pieces??{},cosmetic:value.cosmetic??null};
 if(!color(result.color)||!['cap',null].includes(result.cosmetic))throw new Error('Invalid appearance');
 keys(result.pieces,['head','torso','leftArm','rightArm','leftLeg','rightLeg']);if(!Object.values(result.pieces).every(color))throw new Error('Invalid piece color');return result;
}
export function worldPosition(root,origin){const [x,y,z]=root,c=Math.cos(origin.yaw),s=Math.sin(origin.yaw);return [origin.position[0]+x*c+z*s,origin.position[1]+y,origin.position[2]-x*s+z*c];}
function actorAt(shot,frame,fps){return {action:sampleAction(shot.action.name,(frame-shot.start)/fps+shot.action.timeOffset,shot.action.options),origin:shot.origin};}
export function compilePipeline(input){
 keys(input,['version','title','output','environment','props','events','shots']);const data=structuredClone(input);
 keys(data.output,['width','height','fps']);Object.assign(data,data.output);
 if(data.version!==2||!Number.isInteger(data.width)||!Number.isInteger(data.height)||data.width<180||data.width>720||data.height>1280||data.width%2||data.height%2||data.width*16!==data.height*9||!Number.isInteger(data.fps)||data.fps<1||data.fps>30)throw new Error('Output requires even 9:16 pixels, up to 720x1280 and 1–30fps');
 if(data.title!==undefined&&(typeof data.title!=='string'||data.title.length>200))throw new Error('Invalid title');
 keys(data.environment,['kind','colors','plinthPosition']);if(!['light-workshop','bedroom-window'].includes(data.environment.kind))throw new Error('Unknown environment');
 if(data.environment.kind==='light-workshop'){data.environment.colors??={};keys(data.environment.colors,['background','floor','backWall','sideWall']);if(!Object.values(data.environment.colors).every(color))throw new Error('Invalid environment color');
 data.environment.plinthPosition??=[0,.65,3];if(!vector(data.environment.plinthPosition)||data.environment.plinthPosition[1]!==.65)throw new Error('Plinth must remain grounded');}else keys(data.environment,['kind']);
 if(!Array.isArray(data.shots)||!data.shots.length||data.shots.length>32)throw new Error('Expected 1–32 shots');
 let end=0;const prior=new Map();
 for(const shot of data.shots){
  keys(shot,['id','start','end','camera','action','origin','originFromEndOf','face','appearance']);
  if(!id(shot.id)||prior.has(shot.id)||shot.start!==end||!Number.isInteger(shot.end)||shot.end<=shot.start||shot.end>18000)throw new Error('Shots require unique IDs and contiguous integer intervals (max 18000 frames)');
  keys(shot.camera,['position','target','fov']);if(!vector(shot.camera.position)||!vector(shot.camera.target)||!Number.isFinite(shot.camera.fov)||shot.camera.fov<15||shot.camera.fov>70||shot.camera.position.every((v,i)=>v===shot.camera.target[i]))throw new Error('Invalid camera');
  keys(shot.action,['name','options','timeOffset']);shot.action.timeOffset??=0;if(!Number.isFinite(shot.action.timeOffset)||shot.action.timeOffset<0)throw new Error('Invalid action offset');for(const t of [shot.action.timeOffset,shot.action.timeOffset+(shot.end-shot.start)/data.fps]){const probe=sampleAction(shot.action.name,t,shot.action.options);if(!probe.root.position.every(Number.isFinite)||!Object.values(probe.pivots).flat().every(Number.isFinite))throw new Error('Action time exceeds finite sampling range');}
  if(shot.originFromEndOf){
   if(shot.origin)throw new Error('Choose origin or originFromEndOf');const source=prior.get(shot.originFromEndOf);if(!source)throw new Error('Origin reference must name an earlier shot');
   const motion=actorAt(source,source.end,data.fps).action.root.position,position=worldPosition(motion,source.origin);position[1]=source.origin.position[1];shot.origin={position,yaw:source.origin.yaw};
  }
  keys(shot.origin,['position','yaw']);if(!vector(shot.origin.position)||shot.origin.position[1]!==0||!Number.isFinite(shot.origin.yaw))throw new Error('Invalid grounded origin');
  shot.face??='classic_smile';if(!FACE_NAMES.includes(shot.face))throw new Error('Unknown face');shot.appearance=normalizeAppearance(shot.appearance);
  prior.set(shot.id,shot);end=shot.end;
 }
 data.frameCount=end;
 data.props??=[];if(!Array.isArray(data.props)||data.props.length>8)throw new Error('Expected at most eight props');const ids=new Set();
 for(const prop of data.props){keys(prop,['id','kind','position','initial']);if(!id(prop.id)||ids.has(prop.id)||prop.kind!=='light-chest'||!vector(prop.position))throw new Error('Invalid prop');ids.add(prop.id);prop.initial??={open:0};keys(prop.initial,['open']);if(!Number.isFinite(prop.initial.open)||prop.initial.open<0||prop.initial.open>1)throw new Error('Invalid initial prop state');}
 data.events=compileEvents(data.events??[],data.props,end,frame=>{const shot=data.shots.find(s=>frame>=s.start&&frame<s.end);const actor=actorAt(shot,frame,data.fps);return worldPosition(actor.action.root.position,actor.origin);});
 return data;
}
export function samplePipeline(plan,frame){
 if(!Number.isInteger(frame)||frame<0||frame>=plan.frameCount)throw new Error('Invalid frame index');
 const shot=plan.shots.find(s=>frame>=s.start&&frame<s.end);
 return {frame,time:frame/plan.fps,shot:shot.id,camera:shot.camera,actor:actorAt(shot,frame,plan.fps),face:shot.face,appearance:shot.appearance,propStates:samplePropEvents(plan.props,plan.events,frame)};
}
