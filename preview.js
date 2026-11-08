import * as THREE from 'three';
import { createCharacter,applyPose,applyExpression } from './character.js';

const stage=document.getElementById('stage'), pose=document.getElementById('pose'), expression=document.getElementById('expression'), view=document.getElementById('view'), play=document.getElementById('play');
const scene=new THREE.Scene();scene.background=new THREE.Color(0xc5d6e8);scene.fog=new THREE.Fog(0xc5d6e8,14,28);
const camera=new THREE.PerspectiveCamera(35,1,.1,80);
const renderer=new THREE.WebGLRenderer({antialias:true,alpha:false,preserveDrawingBuffer:true});
renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.6));renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFShadowMap;renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.35;
stage.prepend(renderer.domElement);
scene.add(new THREE.HemisphereLight(0xe8f3ff,0x5a6579,2.25));
const key=new THREE.DirectionalLight(0xfff0d9,3.1);key.position.set(-3,8,6);key.castShadow=true;key.shadow.mapSize.set(1024,1024);key.shadow.camera.left=-7;key.shadow.camera.right=7;key.shadow.camera.top=7;key.shadow.camera.bottom=-7;key.shadow.camera.near=.5;key.shadow.camera.far=25;key.shadow.bias=-.0002;key.shadow.normalBias=.015;scene.add(key);
const fill=new THREE.DirectionalLight(0xd8e8ff,1.2);fill.position.set(5,4,-3);scene.add(fill);
const floor=new THREE.Mesh(new THREE.PlaneGeometry(150,150),new THREE.MeshStandardMaterial({color:0xafc5d8,roughness:.94}));floor.rotation.x=-Math.PI/2;floor.receiveShadow=true;scene.add(floor);
const kai=createCharacter('kai'),mira=createCharacter('mira');kai.root.position.x=-1.12;mira.root.position.x=1.12;scene.add(kai.root,mira.root);
const chars=[kai,mira];let phase=0,prev=0,playing=true;
function resize(){const w=stage.clientWidth,h=Math.min(650,Math.max(310,Math.round(w*.62)));renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();}
function cameraView(){const v=view.value;if(v==='front'){camera.position.set(0,2.15,11.2);camera.lookAt(0,1.62,0);}else if(v==='closeup'){camera.position.set(0,3.06,6.4);camera.lookAt(0,2.65,0);}else{camera.position.set(5.5,3.6,11.8);camera.lookAt(0,1.65,0);}}
function update(){for(const ch of chars){applyPose(ch,pose.value,phase);applyExpression(ch,expression.value);}}
function tick(ms){const s=ms/1000;if(playing&&pose.value==='walk_demo')phase+=(s-prev)*.8;prev=s;update();renderer.render(scene,camera);requestAnimationFrame(tick);}
pose.addEventListener('change',()=>{phase=0;playing=pose.value==='walk_demo';play.textContent=playing?'Pause walk':'Play walk';update();});expression.addEventListener('change',update);view.addEventListener('change',cameraView);
play.addEventListener('click',()=>{if(pose.value!=='walk_demo')pose.value='walk_demo';playing=!playing;play.textContent=playing?'Pause walk':'Play walk';});
window.addEventListener('resize',resize);resize();cameraView();update();requestAnimationFrame(tick);
// Only used for inspection/tests. All capture controls remain outside the character API.
window.__blockstory={scene,camera,renderer,chars,applyPose,applyExpression,setView:(name)=>{view.value=name;cameraView();renderer.render(scene,camera);},setPose:(name,t=0)=>{pose.value=name;phase=t;update();renderer.render(scene,camera);},setExpression:(name)=>{expression.value=name;update();renderer.render(scene,camera);}};
