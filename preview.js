import * as THREE from 'three';
import {createBaseAvatar} from './avatar/baseAvatar.js';
import {sampleAction,sampleTransition,applyActionSample} from './avatar/actions.js';
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
const motion=Object.fromEntries(['action','direction','time','timestamp','previous','next','motionPlay'].map(k=>[k,document.getElementById(k)]));
let displayedRequest=null;
let motionTime=0,motionPlaying=false,transition=null,clockStart=0,clockTime=0;
function motionSample(){
 const target={action:motion.action.value,time:motionTime,options:{direction:motion.direction.value}};
 if(!transition)return sampleAction(target.action,target.time,target.options);
 const elapsed=Math.max(0,motionTime-transition.targetStart);
 const from=transition.snapshot?{sample:transition.snapshot}:{...transition.from,time:transition.from.time+elapsed};
 return sampleTransition(from,target,elapsed,.25);
}
function setTime(t){if(!Number.isFinite(t)||t<0)throw new Error('Invalid preview time');motionTime=t;motion.time.value=Math.min(3,t);motion.timestamp.value=`${t.toFixed(3)} s`;update();}
function stopMotion(){motionPlaying=false;motion.motionPlay.textContent='Play action';}

function render(){renderer.render(scene,camera);}
function setView(name){controls.view.value=name;const target=new THREE.Vector3(0,name==='closeup'?4.61:2.6,0);const positions={front:[0,2.6,12],threequarter:[8,6,12],side:[12,2.6,0],closeup:[0,4.61,12]};camera.position.set(...positions[name]);camera.lookAt(target);const aspect=stage.clientWidth/stage.clientHeight;const h=name==='closeup'?Math.max(1.8,1.9/aspect):Math.max(6.4,4.7/aspect);camera.left=-h*aspect/2;camera.right=h*aspect/2;camera.top=h/2;camera.bottom=-h/2;camera.updateProjectionMatrix();render();}
function update(){if(motion.action.value==='legacy')applyPose(avatar,controls.pose.value,phase);else applyActionSample(avatar,motionSample());displayedRequest=motion.action.value==='legacy'?null:{action:motion.action.value,time:motionTime,options:{direction:motion.direction.value},blending:!!transition&&motionTime<.25};applyFace(avatar,controls.face.value);applyAppearance(avatar,{cosmetic:controls.cosmetic.value||null});render();}
for(const key of ['pose','face','cosmetic'])controls[key].onchange=()=>{if(key==='pose'){motion.action.value='legacy';stopMotion();transition=null;}phase=0;update();};controls.view.onchange=()=>setView(controls.view.value);
controls.play.onclick=()=>{motion.action.value='legacy';stopMotion();transition=null;playing=!playing;controls.play.textContent=playing?'Pause walk':'Play walk';controls.pose.value='walk_demo';update();};
function resize(){renderer.setSize(stage.clientWidth,stage.clientHeight,false);setView(controls.view.value);}window.addEventListener('resize',resize);
update();resize();
motion.action.onchange=()=>{
 const from=displayedRequest;
 const snapshot={root:{position:[0,0,0],yaw:0},pivots:Object.fromEntries(Object.entries(avatar.pivots).map(([k,p])=>[k,[p.rotation.x,p.rotation.y,p.rotation.z]]))};
 playing=false;stopMotion();
 transition=motion.action.value==='legacy'?null:from?{from,targetStart:0}:null;
 if(from&&from.blending)transition={snapshot,targetStart:0};
 setTime(0);
};
motion.direction.onchange=motion.action.onchange;
motion.time.oninput=()=>{stopMotion();setTime(Number(motion.time.value));};
for(const [key,step] of [['previous',-1],['next',1]])motion[key].onclick=()=>{stopMotion();setTime(Math.max(0,(Math.round(motionTime*30)+step)/30));};
motion.motionPlay.onclick=()=>{if(motion.action.value==='legacy'){motion.action.value='idle';transition=null;setTime(0);}playing=false;motionPlaying=!motionPlaying;clockStart=performance.now();clockTime=motionTime;motion.motionPlay.textContent=motionPlaying?'Pause action':'Play action';};
function tick(ms){if(motionPlaying)setTime(clockTime+(ms-clockStart)/1000);if(playing){phase+=(ms-last)/1000;update();}last=ms;requestAnimationFrame(tick);}requestAnimationFrame(tick);
window.__blockstory={setAction:(action,t=0,options={})=>{stopMotion();playing=false;transition=null;motion.action.value=action;motion.direction.value=options.direction||'right';setTime(t);},setTransition:(from,to,elapsed,duration=.25)=>{stopMotion();playing=false;applyActionSample(avatar,sampleTransition(from,to,elapsed,duration));render();},sampleAction,sampleTransition,applyActionSample,avatar,scene,camera,renderer,setView,setPose:(name,t=0)=>{motion.action.value='legacy';stopMotion();controls.pose.value=name;phase=t;update();},applyFace,applyAppearance};
}catch(error){document.getElementById('error').textContent=`Preview could not start: ${error.message}`;throw error;}
