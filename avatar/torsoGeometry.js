import * as THREE from 'three';

// Opt-in planar block profile. Shoulder/hip envelopes, height and depth remain
// identical to classic; only the middle narrows. Never changed during animation.
export function createTaperedTorsoGeometry(){
 const shape=new THREE.Shape();
 shape.moveTo(-.98,-.98);shape.lineTo(.98,-.98);shape.lineTo(.73,0);
 shape.lineTo(.98,.98);shape.lineTo(-.98,.98);shape.lineTo(-.73,0);shape.closePath();
 const geometry=new THREE.ExtrudeGeometry(shape,{depth:.96,steps:1,bevelEnabled:true,bevelThickness:.02,bevelSize:.02,bevelSegments:3,curveSegments:1});
 geometry.translate(0,0,-.48);geometry.computeBoundingBox();const size=geometry.boundingBox.getSize(new THREE.Vector3());geometry.scale(2/size.x,2/size.y,1/size.z);return geometry;
}
