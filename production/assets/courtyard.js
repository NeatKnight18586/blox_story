import * as THREE from 'three';
import {box} from './box.js';
import {createBaseAvatar} from '../../avatar/baseAvatar.js';
import {applyAppearance} from '../../appearance/appearance.js';
import {applyFace} from '../../appearance/faces.js';
// One small home threshold, not a town/crowd system. Two residents are preposed.
export function createCourtyard(scene){
 const group=new THREE.Group();group.name='home_courtyard';scene.add(group);
 const sky=new THREE.HemisphereLight(0xffe0bb,0x53616c,1.5);group.add(sky);
 const sun=new THREE.DirectionalLight(0xffd19c,2.5);sun.position.set(-3,9,5);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);Object.assign(sun.shadow.camera,{left:-12,right:12,top:12,bottom:-12,near:.1,far:35});sun.shadow.normalBias=.015;group.add(sun);
 const fill=new THREE.DirectionalLight(0xc2dce4,.65);fill.position.set(3,5,8);group.add(fill);
 box(group,'street',[28,.2,28],0x696e72,[0,-.1,0]);
 box(group,'home_wall',[17,9,.45],0x8b8b82,[0,4.5,-6]);
 for(const x of [-5.8,5.8]){box(group,'window_recess',[2,2.6,.18],0x263e4c,[x,4.6,-5.72]);box(group,'window_sill',[2.3,.16,.6],0xb7ae97,[x,3.25,-5.5]);}
 box(group,'home_door',[2.8,5,.18],0x304b56,[.5,2.5,-5.7]);
 box(group,'home_lintel',[3.2,.2,.4],0xbaad8e,[.5,5.1,-5.6]);
 // Flush paving leads the eye back home; nothing crosses the actors' floor.
 for(let i=0;i<5;i++)box(group,'path_stone',[3,.012,1.2],0x949185,[.5,-.006,-4.3+i*1.5],.005);
 const residents=[];
 for(const [id,scale,position,yaw,shirt] of [['parent',1,[2.4,0,-1.8],.05,0xad893d],['child',.58,[4.6,0,-1.0],-.35,0x4f9689]]){
  const a=createBaseAvatar();a.root.name=`resident_${id}`;a.root.scale.setScalar(scale);a.root.position.set(...position);a.root.rotation.y=yaw;group.add(a.root);
  applyAppearance(a,{color:0xdac1a0,pieces:{torso:shirt,leftLeg:0x344a58,rightLeg:0x344a58},...(id==='parent'?{hair:'bob',hairColor:0x66533c}:{})});applyFace(a,'relieved');
  residents.push(a);
 }
 const [parent,child]=residents;parent.pivots.head.rotation.set(.23,.3,0);parent.pivots.rightShoulder.rotation.set(-.12,0,.25);child.pivots.head.rotation.x=-.2;child.pivots.leftShoulder.rotation.set(-.05,0,-.35);child.pivots.rightShoulder.rotation.x=-.1;
 return {group,sky,sun,fill,residents};
}
