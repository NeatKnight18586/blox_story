import {compilePipeline,samplePipeline} from './shots.js';
import {sampleAction} from '../avatar/actions.js';
const vector=v=>Array.isArray(v)&&v.length===3&&v.every(Number.isFinite);
const smooth=x=>{x=Math.max(0,Math.min(1,x));return x*x*(3-2*x);};
function actorSample(shot,frame,fps){return {action:sampleAction(shot.action.name,(frame-shot.start)/fps,shot.action.options),origin:shot.origin};}
export function compileShotList(input){
 if(input?.version===2)return compilePipeline(input);
 const data=structuredClone(input);
 if(data.version!==1||data.environment!=='light-workshop'||data.width!==720||data.height!==1280||data.fps!==30||!Array.isArray(data.shots)||data.shots.length!==3)throw new Error('This feasibility schema requires three 720x1280 / 30fps shots');
 let end=0;const prior=new Map();
 for(const shot of data.shots){
  if(!shot.id||prior.has(shot.id)||shot.start!==end||!Number.isInteger(shot.end)||shot.end<=shot.start)throw new Error('Shot IDs/contiguous frame intervals invalid');
  if(!vector(shot.camera?.position)||!vector(shot.camera?.target)||!Number.isFinite(shot.camera.fov)||shot.camera.fov<15||shot.camera.fov>70||shot.camera.position.every((v,i)=>v===shot.camera.target[i]))throw new Error('Invalid camera');
  sampleAction(shot.action?.name,0,shot.action?.options);
  if(!['blank','classic_smile','worried'].includes(shot.face))throw new Error('Invalid face');
  if(shot.originFromEndOf){
   const source=prior.get(shot.originFromEndOf);if(!source)throw new Error('Placement may reference only an earlier shot');
   const motion=sampleAction(source.action.name,(source.end-source.start)/data.fps,source.action.options).root.position;
   const [x,,z]=motion,c=Math.cos(source.origin.yaw),s=Math.sin(source.origin.yaw);
   // Preserve floor placement when cutting from a walking pose to neutral feet.
   shot.origin={position:[source.origin.position[0]+x*c+z*s,source.origin.position[1],source.origin.position[2]-x*s+z*c],yaw:source.origin.yaw};
  }
  if(!vector(shot.origin?.position)||!Number.isFinite(shot.origin.yaw)||shot.origin.position[1]!==0)throw new Error('Invalid grounded origin');
  end=shot.end;prior.set(shot.id,shot);
 }
 if(end/data.fps<6||end/data.fps>8)throw new Error('Feasibility duration must be 6–8 seconds');
 const p=data.prop;
 if(p?.kind!=='proximity-chest'||!vector(p.position)||!Number.isInteger(p.triggerFrame)||p.triggerFrame<0||p.triggerFrame>=end||!Number.isInteger(p.openFrames)||p.openFrames<1||p.triggerFrame+p.openFrames>=end||!Number.isFinite(p.radius)||p.radius<=0)throw new Error('Invalid prop interaction');
 data.frameCount=end;
 const shot=data.shots.find(s=>p.triggerFrame>=s.start&&p.triggerFrame<s.end),actor=actorSample(shot,p.triggerFrame,data.fps);
 const [x,,z]=actor.action.root.position,c=Math.cos(actor.origin.yaw),s=Math.sin(actor.origin.yaw);
 data.triggerDistance=Math.hypot(actor.origin.position[0]+x*c+z*s-p.position[0],actor.origin.position[2]-x*s+z*c-p.position[2]);
 if(data.triggerDistance>p.radius)throw new Error('Actor is outside prop proximity at trigger');
 return data;
}
export function sampleShotList(plan,frame){
 if(plan.version===2)return samplePipeline(plan,frame);
 if(!Number.isInteger(frame)||frame<0||frame>=plan.frameCount)throw new Error('Invalid frame index');
 const shot=plan.shots.find(s=>frame>=s.start&&frame<s.end);
 return {frame,time:frame/plan.fps,shot:shot.id,camera:shot.camera,actor:actorSample(shot,frame,plan.fps),face:shot.face,propOpen:smooth((frame-plan.prop.triggerFrame)/plan.prop.openFrames)};
}
