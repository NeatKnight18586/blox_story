export function applyPose(avatar,name,t=0){
 if(!['neutral','walk_demo','look_down'].includes(name)||!Number.isFinite(t))throw new Error('Invalid pose or phase');
 for(const p of Object.values(avatar.pivots))p.rotation.set(0,0,0);
 const p=avatar.pivots;
 if(name==='walk_demo'){const a=Math.sin(t*Math.PI*2)*.4;p.leftHip.rotation.x=a;p.rightHip.rotation.x=-a;p.leftShoulder.rotation.x=-a;p.rightShoulder.rotation.x=a;}
 if(name==='look_down')p.head.rotation.x=.25;
 avatar.root.userData.pose=name;return avatar;
}
