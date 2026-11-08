import * as THREE from 'three';
import {box} from './box.js';
export function createChest(scene,{position,id='proximity_chest'}){
 const chest=new THREE.Group();chest.name='proximity_chest';chest.position.set(...position);scene.add(chest);
 // Five thin walls leave a real cavity, rather than an opaque solid box.
 box(chest,'chest_base',[1.3,.12,.95],0x294c62,[0,-.17,0]);
 for(const sign of [-1,1]){box(chest,'chest_side',[.1,.5,.95],0x355f75,[sign*.6,.1,0]);box(chest,'chest_end',[1.1,.5,.1],0x355f75,[0,.1,sign*.425]);}
 const hinge=new THREE.Group();hinge.position.set(0,.36,.475);chest.add(hinge);
 box(hinge,'lid',[1.34,.12,1.02],0x3d7188,[0,.06,-.475]);
 const glow=box(chest,'light_core',[.65,.15,.4],0x70efd7,[0,-.02,0],.04);glow.material.emissive.set(0x52e8c7);glow.castShadow=false;
 const lamp=new THREE.PointLight(0x65ffe1,0,4,2);lamp.position.set(0,.5,0);chest.add(lamp);
 box(chest,'chest_latch',[.18,.22,.06],0xe8c77c,[0,.24,-.5],.015);
 chest.name=id;
 return {root:chest,apply({open=0}){if(!Number.isFinite(open)||open<0||open>1)throw new Error('Invalid chest state');hinge.rotation.x=open*1.3;glow.material.emissiveIntensity=.12+open*2.5;lamp.intensity=open*3;}};
}
