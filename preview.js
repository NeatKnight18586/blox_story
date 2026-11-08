import * as THREE from 'three';
import {createBaseAvatar} from './avatar/baseAvatar.js';
import {applyPose} from './avatar/poses.js';
import {applyFace} from './appearance/faces.js';
import {applyAppearance} from './appearance/appearance.js';
try {
const stage=document.querySelector('#stage'),controls=Object.fromEntries(['pose','face','view','cosmetic','play'].map(k=>[k,document.getElementById(k)]));
const scene=new THREE.Scene();scene.background=new THREE.Color(0xd5d6d7);
const camera=new THREE.OrthographicCamera(-4,4,3.2,-3.2,.1,60);
const renderer=new THREE.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.toneMapping=THREE.ACESFilmicToneMapping;stage.append(renderer.domElement);
scene.add(new THREE.HemisphereLight(0xffffff,0x777b80,2));
const key=new THREE.DirectionalLight(0xffffff,3);key.position.set(-3,8,5);key.castShadow=true;key.shadow.mapSize.set(2048,2048);Object.assign(key.shadow.camera,{left:-6,right:6,top:7,bottom:-7,near:.1,far:30});key.shadow.normalBias=.015;key.shadow.bias=-.0001;key.shadow.radius=4;scene.add(key);
const fill=new THREE.DirectionalLight(0xe2e8ef,.8);fill.position.set(4,4,-3);scene.add(fill);
const floor=new THREE.Mesh(new THREE.PlaneGeometry(200,200),new THREE.MeshStandardMaterial({color:0xd5d6d7,roughness:1}));floor.rotation.x=-Math.PI/2;floor.receiveShadow=true;scene.add(floor);
const avatar=createBaseAvatar();scene.add(avatar.root);let phase=0,playing=false,last=0;
function render(){renderer.render(scene,camera);}
function setView(name){controls.view.value=name;const target=new THREE.Vector3(0,name==='closeup'?4.61:2.6,0);const positions={front:[0,2.6,12],threequarter:[8,6,12],side:[12,2.6,0],closeup:[0,4.61,12]};camera.position.set(...positions[name]);camera.lookAt(target);const aspect=stage.clientWidth/stage.clientHeight;const h=name==='closeup'?Math.max(1.8,1.65/aspect):Math.max(6.4,4.7/aspect);camera.left=-h*aspect/2;camera.right=h*aspect/2;camera.top=h/2;camera.bottom=-h/2;camera.updateProjectionMatrix();render();}
function update(){applyPose(avatar,controls.pose.value,phase);applyFace(avatar,controls.face.value);applyAppearance(avatar,{cosmetic:controls.cosmetic.value||null});render();}
for(const key of ['pose','face','cosmetic'])controls[key].onchange=()=>{phase=0;update();};controls.view.onchange=()=>setView(controls.view.value);
controls.play.onclick=()=>{playing=!playing;controls.play.textContent=playing?'Pause walk':'Play walk';controls.pose.value='walk_demo';update();};
function resize(){renderer.setSize(stage.clientWidth,stage.clientHeight,false);setView(controls.view.value);}window.addEventListener('resize',resize);
update();resize();
function tick(ms){if(playing){phase+=(ms-last)/1000;update();}last=ms;requestAnimationFrame(tick);}requestAnimationFrame(tick);
window.__blockstory={avatar,scene,camera,renderer,setView,setPose:(name,t=0)=>{controls.pose.value=name;phase=t;update();},applyFace,applyAppearance};
}catch(error){document.getElementById('error').textContent=`Preview could not start: ${error.message}`;throw error;}
