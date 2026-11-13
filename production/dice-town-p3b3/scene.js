import * as T from 'three';
import {createBaseAvatar,block} from '../../avatar/baseAvatar.js';
import {applyAppearance} from '../../appearance/appearance.js';
import {applyFace} from '../../appearance/faces.js';
import {sample} from './motion.js';
const scene=new T.Scene();scene.background=new T.Color(0xb9c9c6);
const renderer=new T.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});renderer.setPixelRatio(1);renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=.95;document.body.append(renderer.domElement);
scene.add(new T.HemisphereLight(0xffebce,0x758782,2));const sun=new T.DirectionalLight(0xffdfb1,2.4);sun.position.set(-5,10,6);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-8,right:8,top:10,bottom:-5,near:.1,far:30});sun.shadow.normalBias=.025;scene.add(sun);
function box(parent,name,size,color,position,r=.03){const m=block(name,size,color,r);m.position.set(...position);parent.add(m);return m;}
box(scene,'continuous_market_floor',[28,.3,28],0xa49c87,[0,-.15,-3]);
// Camera-visible fragment of the existing terracotta bakery/striped awning language.
box(scene,'bakery_stucco',[28,14,.5],0xba795e,[0,7,-3.8]);box(scene,'stone_base',[28,.5,.65],0x999385,[0,.25,-3.7]);
for(const x of[-4.2,3.8]){box(scene,'window_stone',[2,2.9,.2],0xddd0ae,[x,3.1,-3.45]);box(scene,'window_glass',[1.65,2.55,.12],0x284d58,[x,3.1,-3.30]);box(scene,'window_mullion',[.10,2.55,.1],0xc0aa7a,[x,3.1,-3.20]);}
for(let i=0;i<12;i++){const x=-5.5+i;box(scene,'striped_awning',[1,.13,2.7],i%2?0xe6d8b9:0x39777a,[x,6,-2.5]);box(scene,'awning_valance',[1,.36,.12],i%2?0xe6d8b9:0x39777a,[x,5.85,-1.2]);}
const stall=new T.Group();stall.name='baker_stall';scene.add(stall);
const counter=box(stall,'counter_top',[4.6,.18,1.5],0x986e48,[0,2.31,1.8]);
for(const x of[-2.06,2.06])box(stall,'stall_support',[.2,2.22,1.35],0x76543d,[x,1.11,1.8]);
box(stall,'stall_front_rail',[4.6,.32,.14],0x805b3e,[0,1.9,2.47]);
// Open underside preserves the body-to-floor cue; no blocking opaque front panel.
for(const x of[-.4,.4]){const loaf=new T.Mesh(new T.CapsuleGeometry(.13,.45,4,8),new T.MeshStandardMaterial({color:0xd7aa61,roughness:1}));loaf.rotation.z=Math.PI/2;loaf.position.set(x,2.57,2.1);loaf.castShadow=true;stall.add(loaf);}
const baker=createBaseAvatar();baker.root.name='baker';baker.root.scale.setScalar(.93);scene.add(baker.root);applyAppearance(baker,{color:0xdab692,pieces:{torso:0xc49b54,leftLeg:0x354b52,rightLeg:0x354b52}});applyFace(baker,'startled');
// Existing baker yellow/rust identity; local apron edge follows torso, not a new rig.
box(baker.parts.torso,'rust_apron',[1.25,1.50,.055],0xa9634c,[0,-.16,.53],.015);
const shoes=[];for(const [side,x]of[['left',-.465],['right',.465]]){const g=new T.Group();g.name=side+'_removable_shoe';scene.add(g);const sole=box(g,'sole',[1.04,.16,1.35],0x423a36,[0,.08,.13]);box(g,'toe',[1.0,.14,.30],0x66503d,[0,.23,.64]);shoes.push(g);}
const camera=new T.PerspectiveCamera(43,9/16,.1,80),ids=Object.values(baker.parts).map(m=>m.uuid),faceId=baker.faceLayer.uuid;
// Contact is solved from actual transformed arm vertices. The shoulder pivots and
// rigid lengths remain untouched: the root follows the fixed counter support.
const v=new T.Vector3();function minimum(mesh){const p=mesh.geometry.attributes.position;let min=Infinity,contact=null;for(let i=0;i<p.count;i++){v.fromBufferAttribute(p,i).applyMatrix4(mesh.matrixWorld);if(v.y<min){min=v.y;contact=v.clone();}}return contact;}
function render(frame,width=720){const s=sample(frame);renderer.setSize(width,width*16/9);
 baker.root.position.set(0,0,0);baker.root.rotation.set(.16*s.rise,0,0);
 for(const p of Object.values(baker.pivots))p.rotation.set(0,0,0);
 baker.pivots.leftShoulder.rotation.x=baker.pivots.rightShoulder.rotation.x=-s.armAngle;
 baker.pivots.head.rotation.x=s.headPitch;
 baker.pivots.leftHip.rotation.x=baker.pivots.rightHip.rotation.x=-.16*s.rise;
 baker.root.updateMatrixWorld(true);const support=minimum(baker.parts.rightArm);
 const contactY=2.415-support.y,contactZ=1.10-support.z;
 baker.root.position.set(0,.18*(1-s.grip)+contactY*s.grip,-.35*(1-s.grip)+contactZ*s.grip);baker.root.updateMatrixWorld(true);
 for(let i=0;i<2;i++){const foot=minimum(baker.parts[i?'rightLeg':'leftLeg']);const drop=s.shoeDrop*(i? .65:1),forward=s.shoeForward*(i?.5:1);shoes[i].position.set(i?.465:-.465,Math.max(0,foot.y-.16-drop),baker.root.position.z+1.86*Math.sin(.16*s.rise)+forward);shoes[i].rotation.set(0,0,0);}
 if(s.shot==='D03'){camera.position.set(7.6,5.4,10.2);camera.lookAt(0,2.95,.5);camera.fov=44;}else{camera.position.set(-.65,1.15,5);camera.lookAt(-.465,.55,.65);camera.fov=38;}
 camera.updateProjectionMatrix();scene.updateMatrixWorld(true);renderer.render(scene,camera);
 return{...s,root:baker.root.position.toArray(),shoes:shoes.map(g=>g.position.toArray()),identity:ids.every((id,i)=>id===Object.values(baker.parts)[i].uuid)&&faceId===baker.faceLayer.uuid};
}
window.__baker={render,renderer,scene,camera,baker,counter,stall,shoes,minimum};render(0);
