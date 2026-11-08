import * as THREE from 'three';
import {createHeadGeometry} from './headGeometry.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
export function block(name, size, color, radius=.02) {
 const mesh=new THREE.Mesh(new RoundedBoxGeometry(...size,4,radius),new THREE.MeshStandardMaterial({color,roughness:.86}));
 mesh.name=name;mesh.castShadow=true;mesh.receiveShadow=true;return mesh;
}
export function createBaseAvatar({color=0xbfc1c3}={}) {
 const root=new THREE.Group();root.name='canonical_avatar';const parts={},pivots={};
 function part(name,size,parent,position,radius){const m=block(name,size,color,radius);m.position.set(...position);parent.add(m);parts[name]=m;}
 function pivot(name,position){const p=new THREE.Group();p.name=name;p.position.set(...position);root.add(p);pivots[name]=p;return p;}
 part('torso',[2,2,1],root,[0,3.02,0]);
 part('head',[1.25,1.16,1.1],pivot('head',[0,4.03,0]),[0,.58,0],.115);
 parts.head.geometry.dispose();
 parts.head.geometry=createHeadGeometry();
 for(const [side,sign] of [['left',-1],['right',1]]){
 part(`${side}Arm`,[.98,1.99,1],pivot(`${side}Shoulder`,[sign*1.51,4.02,0]),[0,-.995,0]);
 part(`${side}Leg`,[.98,2,1],pivot(`${side}Hip`,[sign*.5,2,0]),[0,-1,0]);
 }
 return {root,parts,pivots,faceCache:new Map(),cosmeticCache:new Map(),faceLayer:null,cosmetic:null};
}
