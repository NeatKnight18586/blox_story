import * as THREE from 'three';

// Original lathed head: oval horizontal section, straight cheeks, softly rolled
// top/bottom rims and flat caps. Dimensions stay 1.25 × 1.16 × 1.10.
export function createHeadGeometry() {
 const radius=.625, halfHeight=.58, rim=.22;
 const profile=[new THREE.Vector2(0,-halfHeight),new THREE.Vector2(radius-rim,-halfHeight)];
 for(let i=1;i<=12;i++){
  const angle=-Math.PI/2+i*Math.PI/24;
  profile.push(new THREE.Vector2(radius-rim+rim*Math.cos(angle),-halfHeight+rim+rim*Math.sin(angle)));
 }
 profile.push(new THREE.Vector2(radius,halfHeight-rim));
 for(let i=1;i<=12;i++){
  const angle=i*Math.PI/24;
  profile.push(new THREE.Vector2(radius-rim+rim*Math.cos(angle),halfHeight-rim+rim*Math.sin(angle)));
 }
 profile.push(new THREE.Vector2(0,halfHeight));
 const geometry=new THREE.LatheGeometry(profile,96);
 geometry.scale(1,1,1.1/1.25);
 return geometry;
}
// Facial features follow the curved front, instead of floating on a flat plane.
export function headFrontZ(x){return .55*Math.sqrt(1-(x/.625)**2);}
