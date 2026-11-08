import * as THREE from 'three';
import {headFrontZ} from '../avatar/headGeometry.js';
export const EXPRESSION_NAMES=['nervous','startled','thoughtful','relieved'];
// Sparse, cached block-avatar expressions; all strokes follow the oval cheek.
export function makeExpression(name){
 const group=new THREE.Group();group.name=`face_${name}`;
 const material=new THREE.MeshBasicMaterial({color:0x202124});
 const eyeY=name==='startled'?.74:name==='nervous'?.71:.72;
 const eyeHeight=name==='startled'?.09:name==='relieved'?.065:.072;
 for(const [side,x] of [['left',-.13],['right',.13]]){
  const eye=new THREE.Mesh(new THREE.SphereGeometry(1,16,12),material);eye.name=`eye_${side}`;eye.scale.set(name==='startled'?.04:.033,eyeHeight,.012);eye.position.set(x,eyeY,headFrontZ(x)+.007);eye.rotation.y=Math.atan2(x/.625**2,headFrontZ(x)/.55**2);group.add(eye);
 }
 function stroke(name,points,radius=.012){const curve=new THREE.CatmullRomCurve3(points.map(([x,y])=>new THREE.Vector3(x,y,headFrontZ(x)+.012)));const mesh=new THREE.Mesh(new THREE.TubeGeometry(curve,24,radius,8,false),material);mesh.name=name;group.add(mesh);}
 for(const sign of [-1,1]){
  const inner=name==='nervous'?.885:name==='startled'?.895:name==='thoughtful'?(sign<0?.89:.85):.855;
  const outer=name==='nervous'?.846:name==='startled'?.875:name==='thoughtful'?(sign<0?.86:.855):.85;
  stroke(`brow_${sign<0?'left':'right'}`,[[sign*.07,inner],[sign*.14,(inner+outer)/2+.006],[sign*.22,outer]],.011);
 }
 const points=[];
 for(let i=0;i<=32;i++){
  if(name==='startled'){const angle=i/32*Math.PI*2;points.push([.069*Math.cos(angle),.335+.085*Math.sin(angle)]);}
  else{const width=name==='relieved'?.21:.18,x=-width+2*width*i/32;const y=name==='nervous'?.375-.055*(x/width)**2:name==='thoughtful'?.345+.018*(x/width)**2:.30+.125*(x/width)**2;points.push([x,y]);}
 }
 stroke('mouth',points,.014);return group;
}
