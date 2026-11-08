// Resolve once, from explicit shot-start actor samples. No tracking or clock.
export function resolveComposition(spec,actors,aspect){
 if(!spec||Object.keys(spec).some(k=>!['preset','subjects','subject','foreground','side'].includes(k))||![1,-1].includes(spec.side??1))throw new Error('Invalid composition');
 const side=spec.side??1,at=id=>{const actor=actors[id];if(!actor)throw new Error('Unknown composition actor');return actor;};
 const fixed=(position,target,fov)=>({position,target,fov});
 if(spec.preset==='two-shot'){
  if(!Array.isArray(spec.subjects)||spec.subjects.length!==2||spec.subjects[0]===spec.subjects[1]||spec.subject!==undefined||spec.foreground!==undefined)throw new Error('Two-shot needs two distinct subjects');
  const a=at(spec.subjects[0]).position,b=at(spec.subjects[1]).position,dx=b[0]-a[0],dz=b[2]-a[2],length=Math.hypot(dx,dz);if(length<.1)throw new Error('Coincident composition actors');
  const center=[(a[0]+b[0])/2,2.7,(a[2]+b[2])/2],fov=40;
  const halfWidth=actor=>2*Math.abs(Math.cos(actor.yaw)*dx/length-Math.sin(actor.yaw)*dz/length)+.65*Math.abs(Math.sin(actor.yaw)*dx/length+Math.cos(actor.yaw)*dz/length);
  const distance=(length+halfWidth(at(spec.subjects[0]))+halfWidth(at(spec.subjects[1])))/2/(Math.tan(fov*Math.PI/360)*aspect)*1.14;
  return fixed([center[0]-dz/length*distance*side,5.7,center[2]+dx/length*distance*side],center,fov);
 }
 if(spec.subjects!==undefined)throw new Error('Unexpected composition subjects');const subject=at(spec.subject);
 if(spec.preset==='close-up'){
  if(spec.foreground!==undefined||spec.side!==undefined)throw new Error('Close-up only takes subject');
  const yaw=subject.yaw,p=subject.position;return fixed([p[0]+Math.sin(yaw)*4.6,p[1]+4.55,p[2]+Math.cos(yaw)*4.6],[p[0],p[1]+4.15,p[2]],40);
 }
 if(spec.preset==='over-the-shoulder'){
  if(spec.foreground===spec.subject)throw new Error('OTS needs distinct actors');const a=at(spec.foreground).position,b=subject.position,dx=b[0]-a[0],dz=b[2]-a[2],length=Math.hypot(dx,dz);if(length<.1)throw new Error('Coincident composition actors');
  const x=dx/length,z=dz/length;return fixed([a[0]-x*3.2-z*2.5*side,4.7,a[2]-z*3.2+x*2.5*side],[b[0],b[1]+4,b[2]],42);
 }
 throw new Error('Unknown composition preset');
}
