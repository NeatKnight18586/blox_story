import * as THREE from 'three';
import {box} from './box.js';
import {createHeadGeometry} from '../../avatar/headGeometry.js';
export function createBedroom(scene){
 scene.background=new THREE.Color(0x071521);scene.fog=new THREE.FogExp2(0x102939,.033);
 scene.add(new THREE.HemisphereLight(0x81b9db,0x0b1723,1.1));
 const moon=new THREE.DirectionalLight(0xa2d8ff,1.8);moon.position.set(-3,9,5);moon.castShadow=true;moon.shadow.mapSize.set(2048,2048);Object.assign(moon.shadow.camera,{left:-9,right:9,top:10,bottom:-9,near:.1,far:35});moon.shadow.normalBias=.015;scene.add(moon);
 const lamp=new THREE.PointLight(0xffc486,3,14,2);lamp.position.set(-4,5,4);scene.add(lamp);
 const portraitFill=new THREE.DirectionalLight(0xc9ddeb,1.6);portraitFill.position.set(-2,4,-5);portraitFill.target.position.set(-2.8,3.8,2);scene.add(portraitFill,portraitFill.target);
 const warmth=new THREE.PointLight(0xffc99b,0,13,1.5);warmth.position.set(1.8,5,2);scene.add(warmth);
 box(scene,'room_floor',[14,.2,12],0x263e49,[0,-.1,6]);
 box(scene,'courtyard',[26,.2,20],0x0d222c,[0,-.1,-10]);
 for(const x of [-5,5])box(scene,'window_wall',[2,7,.3],0x294650,[x,3.5,0]);
 box(scene,'sill_wall',[8,1.3,.3],0x294650,[0,.65,0]);box(scene,'lintel_wall',[8,1,.3],0x294650,[0,6.5,0]);
 for(const x of [-4,4])box(scene,'window_jamb',[.16,4.9,.45],0x657b80,[x,3.7,0]);
 for(const y of [1.3,6.1])box(scene,'window_rail',[8.3,.16,.45],0x657b80,[0,y,0]);
 box(scene,'window_mullion',[.10,4.7,.18],0x566c75,[0,3.7,0]);
 box(scene,'side_wall',[.25,7,9],0x1b303d,[-6.1,3.5,4.5]);
 // Closed hinged door is a reusable set piece, not the later S15 door event.
 const hinge=new THREE.Group();hinge.position.set(-5.95,0,3.1);scene.add(hinge);
 box(hinge,'door',[.15,4.7,2.1],0x3e3b3c,[0,2.35,1.05]);box(hinge,'door_handle',[.16,.12,.12],0xd6ae75,[.14,2.3,1.8],.02);
 const door={apply(open){if(!Number.isFinite(open)||open<0||open>1)throw new Error('Invalid door open');hinge.rotation.y=-open*Math.PI/2;},hinge};door.apply(0);
 box(scene,'bed_base',[2.8,.55,4],0x1a2a36,[4,.275,5]);box(scene,'mattress',[2.7,.35,3.8],0x6c8186,[4,.725,5]);box(scene,'blanket',[2.75,.12,2.7],0x285667,[4,.96,5.5]);box(scene,'pillow',[1.8,.24,.7],0xa6b6b8,[4,1.02,3.6]);
 const disk=new THREE.Mesh(new THREE.CircleGeometry(1,32),new THREE.MeshBasicMaterial({color:0xbbd5dc,fog:false}));disk.position.set(4,8,-17);scene.add(disk);
 // One inexpensive unrigged distant proxy + live Mara = two pale figures.
 const proxy=new THREE.Group();proxy.position.set(-2.2,0,-6.2);proxy.scale.setScalar(.85);scene.add(proxy);
 const pale=new THREE.MeshStandardMaterial({color:0x9bc4cc,emissive:0x173745,emissiveIntensity:.4,transparent:true,opacity:.35,depthWrite:false});
 const head=new THREE.Mesh(createHeadGeometry(),pale);head.position.set(0,4.61,0);proxy.add(head);
 for(const [name,size,pos] of [['proxy_torso',[2,2,1],[0,3.02,0]],['proxy_la',[.98,1.99,1],[-1.51,3.025,0]],['proxy_ra',[.98,1.99,1],[1.51,3.025,0]],['proxy_ll',[.98,2,1],[-.5,1,0]],['proxy_rl',[.98,2,1],[.5,1,0]]]){const m=box(proxy,name,size,0x9bc4cc,pos);m.material.dispose();m.material=pale;m.castShadow=false;}
 return {door,proxy,warmth};
}
