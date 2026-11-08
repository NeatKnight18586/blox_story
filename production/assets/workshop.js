import * as THREE from 'three';
import {box} from './box.js';
export function createWorkshop(scene,{colors={},plinthPosition=[0,.65,3]}={}){
 scene.background=new THREE.Color(colors.background??0xcbd9df);
 scene.add(new THREE.HemisphereLight(0xffffff,0x6b7b87,2));
 const key=new THREE.DirectionalLight(0xfff1d8,3);key.position.set(-3,9,7);key.castShadow=true;key.shadow.mapSize.set(2048,2048);Object.assign(key.shadow.camera,{left:-7,right:7,top:8,bottom:-7,near:.1,far:30});key.shadow.normalBias=.015;key.shadow.bias=-.0001;scene.add(key);
 const fill=new THREE.DirectionalLight(0xb7dfff,1);fill.position.set(5,5,0);scene.add(fill);
 // One original small workshop alcove: floor, two walls, plinth and wall marks.
 box(scene,'floor',[14,.2,14],colors.floor??0x81959e,[0,-.1,0]);
 box(scene,'back_wall',[14,7,.25],colors.backWall??0xb7c9ce,[0,3.5,-4]);
 box(scene,'side_wall',[.25,7,10],colors.sideWall??0x66878c,[-5,3.5,1]);
 for(const x of [-2,0,2])box(scene,'wall_inlay',[.7,.08,.03],0xe3cba2,[x,3.6,-3.85]);
 box(scene,'plinth',[1.6,1.3,1.25],0x4e6876,plinthPosition);
 box(scene,'plinth_rim',[1.75,.12,1.4],0xadc4cc,[plinthPosition[0],1.32,plinthPosition[2]]);
}
