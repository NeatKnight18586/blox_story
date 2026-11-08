import * as THREE from 'three';
function makeFace(name){
 const group=new THREE.Group();group.name=`face_${name}`;
 if(name==='blank')return group;
 const material=new THREE.MeshBasicMaterial({color:0x202124});
 for(const x of [-.13,.13]){const eye=new THREE.Mesh(new THREE.SphereGeometry(1,16,12),material);eye.scale.set(.034,.075,.012);eye.position.set(x,.75,.557);group.add(eye);}
 const points=[];
 for(let i=0;i<=32;i++){const x=-.23+.46*i/32;const y=name==='classic_smile'?.29+.19*(x/.23)**2:.42-.13*(x/.23)**2;points.push(new THREE.Vector3(x,y,.558));}
 const curve=new THREE.CatmullRomCurve3(points);
 group.add(new THREE.Mesh(new THREE.TubeGeometry(curve,40,.018,8,false),material));return group;
}
export function applyFace(avatar,name){
 if(!['blank','classic_smile','worried'].includes(name))throw new Error('Unknown face');
 if(!avatar.faceCache.has(name))avatar.faceCache.set(name,makeFace(name));
 if(avatar.faceLayer)avatar.faceLayer.removeFromParent();
 avatar.faceLayer=avatar.faceCache.get(name);avatar.pivots.head.add(avatar.faceLayer);return avatar;
}
