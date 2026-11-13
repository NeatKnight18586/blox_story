import * as T from 'three';
import {block} from '../../avatar/baseAvatar.js';
import {applyFace} from '../../appearance/faces.js';
import {sample,counts} from './motion.js';
import {makeFamilyPhoto} from '../dice-town-p4b1/photo.js';
// Photograph: the SAME mother/child rigs and room, rendered once at1024 square.
// Mother-left / child-right, cream-V/rust/paper motif derives from canonical photo.
await import('../dice-town-p3b2/scene.js');
const family=window.__recognition;family.render(95,720);
family.mother.root.position.set(-.65,0,-2.7);family.mother.root.rotation.set(0,.06,0);
family.pip.root.position.set(1.05,0,-1.5);family.pip.root.rotation.set(0,-.09,0);
for(const a of [family.mother,family.pip])for(const p of Object.values(a.pivots))p.rotation.set(0,0,0);
applyFace(family.pip,'relieved');applyFace(family.mother,'thoughtful');
family.mother.pivots.head.traverse(m=>{if(m.isMesh&&m.userData.tint){m.material=m.material.clone();m.material.color.setHex(0x4e392c);}});
family.renderer.setSize(1024,1024);family.camera.aspect=1;family.camera.position.set(1.6,4.8,7);family.camera.lookAt(.15,2.8,-2.2);family.camera.fov=41;family.camera.updateProjectionMatrix();family.scene.updateMatrixWorld(true);family.renderer.render(family.scene,family.camera);
const portrait=new T.CanvasTexture(family.renderer.domElement);portrait.colorSpace=T.SRGBColorSpace;family.renderer.domElement.style.display='none';
await import('../dice-town-p3b1/scene.js');
const c=window.__proof,{scene,camera,renderer,leo,pip,pin}=c;const step=scene.getObjectByName('work_step');
c.render('handoff',71);const received={position:pip.root.position.clone(),rotation:pip.root.rotation.clone(),arm:pip.pivots.leftShoulder.rotation.x,pinPosition:pin.position.clone(),pinQuaternion:pin.quaternion.clone()};
pip.parts.leftArm.attach(pin);const pinLocal={position:pin.position.clone(),quaternion:pin.quaternion.clone()};pin.visible=false;
const book=leo.root.getObjectByName('notebook');
const bookHold=new T.Group();bookHold.name='open_uncertain_notebook';leo.parts.leftArm.add(bookHold);bookHold.position.set(0,-.78,.59);bookHold.add(book);book.position.set(0,0,0);
function bookBox(parent,name,size,color,p){const b=block(name,size,color,.006);b.position.set(...p);parent.add(b);return b;}
bookBox(bookHold,'open_notebook_pages',[.48,.61,.01],0xe9d5ac,[0,0,.0975]);
const coverHinge=new T.Group();coverHinge.position.set(-.26,0,.125);bookHold.add(coverHinge);
const cover=bookBox(coverHinge,'open_notebook_cover',[.52,.67,.025],0x9b6748,[.26,0,0]);bookBox(cover,'inner_open_page',[.48,.61,.006],0xe9d5ac,[0,0,-.017]);bookBox(bookHold,'spine',[.045,.67,.23],0x765038,[-.26,0,.01]);

const photo=makeFamilyPhoto();photo.material=photo.material.clone();photo.material.map=portrait;photo.material.color.setHex(0xf1e3c5);photo.material.roughness=1;photo.castShadow=true;
const photoHold=new T.Group();photoHold.name='original_family_photo_derivation';pip.root.add(photoHold);photoHold.add(photo);
const paper=block('weathered_photo_back',[1.04,1.04,.025],0xc7b68e,.005);paper.position.z=-.020;photoHold.add(paper);
for(const sign of[-1,1]){const edge=block('photo_paper_edge',[.035,1.02,.015],0xc7b68e,.003);edge.position.set(sign*.50,0,-.002);photoHold.add(edge);const e=block('photo_paper_edge',[1.02,.035,.015],0xc7b68e,.003);e.position.set(0,sign*.50,-.002);photoHold.add(e);}
const grip=scene.getObjectByName('crank_grip');grip.geometry.computeBoundingBox();const gripBottom=new T.Box3().setFromObject(grip).min.y;
// Solve raised rigid palm height against actual handle bottom, keeping child on step.
let lo=-Math.PI/2,hi=-1.3;for(let i=0;i<55;i++){const a=(lo+hi)/2,y=1.582+.65*(4.02-1.845*Math.cos(a)-.5*Math.sin(a));if(y>gripBottom-.008)lo=a;else hi=a;}const crankArm=(lo+hi)/2;
const refs=[pin,photo,book,...Object.values(pip.parts),...Object.values(leo.parts)],ids=refs.map(o=>o.uuid);
function reset(a){for(const[n,p]of Object.entries(a.pivots)){p.rotation.set(0,0,0);p.position.fromArray(a.restPositions[n]);}}
function childAtCrank(){pip.root.position.set(-.9,1.582,2.6815);pip.root.rotation.set(0,-Math.PI/2,0);pip.pivots.leftShoulder.rotation.x=crankArm;scene.updateMatrixWorld(true);const p=new T.Vector3(0,-.85,.5).applyMatrix4(pip.parts.leftArm.matrixWorld);pip.root.position.x+=-2.15-p.x;step.position.set(pip.root.position.x,.791,pip.root.position.z);}
function holdPhoto(angle=-.60,tilt=-.15){pip.pivots.leftShoulder.rotation.x=angle;scene.updateMatrixWorld(true);const p=new T.Vector3(0,-.85,.5).applyMatrix4(pip.parts.leftArm.matrixWorld);pip.root.worldToLocal(p);photoHold.position.copy(p).add(new T.Vector3(0,.535,.03));photoHold.rotation.set(tilt,0,0);}
const cameras={D17:{position:[-6.5,6.4,8.7],target:[-1.5,3.5,2.1],fov:48},D18:{position:[-5.3,5.3,8],target:[-1.25,3.85,2.9],fov:40},D24:{position:[-3.8,6.4,8.2],target:[1,4.0,3.5],fov:36},D22:{position:[-3.6,5.6,10.4],target:[-.1,3.7,4],fov:44},D20:{position:[-4.8,4.9,7.7],target:[-1.45,3.95,3],fov:34}};
function render(shot,frame=0,width=720){
 const state=sample(shot==='photo'?'D18':shot,frame);
 renderer.setSize(width,width*16/9);camera.aspect=9/16;const draw=renderer.render;renderer.render=()=>{};try{c.render('handoff',71,width);}finally{renderer.render=draw;}
 reset(pip);reset(leo);applyFace(pip,'nervous');c.die.visible=false;pin.visible=false;photoHold.visible=false;bookHold.visible=shot==='D22';leo.root.visible=false;pip.root.visible=step.visible=true;
 // P3B1 reset writes the received pin's world pose; restore local support after reset.
 pin.position.copy(pinLocal.position);pin.quaternion.copy(pinLocal.quaternion);
 let cam=cameras[shot]??cameras.D18;
 if(shot==='D17'){
  childAtCrank();pip.pivots.head.rotation.set(...state.head);
  // Pin still installed in its sleeve before D23; same asset, not a duplicate.
  pin.visible=true;scene.updateMatrixWorld(true);const worldPosition=new T.Vector3(-.45,4.6,1.05);pin.position.copy(pip.parts.leftArm.worldToLocal(worldPosition));pin.quaternion.copy(pip.parts.leftArm.getWorldQuaternion(new T.Quaternion()).invert());
 }else if(['D18','D20','D21','photo'].includes(shot)){
  childAtCrank();pip.root.rotation.set(0,-.38,0);pip.pivots.head.rotation.set(...state.head);applyFace(pip,'nervous');holdPhoto(state.photoArm,state.photoTilt);photoHold.visible=true;
  if(shot==='photo'){scene.updateMatrixWorld(true);const at=photoHold.getWorldPosition(new T.Vector3());const normal=new T.Vector3(0,0,1).applyQuaternion(photoHold.getWorldQuaternion(new T.Quaternion()));cam={position:at.clone().addScaledVector(normal,2.3).add(new T.Vector3(.15,.06,0)).toArray(),target:at.toArray(),fov:32};}
 }else if(shot==='D22'){
  pip.root.visible=step.visible=false;leo.root.visible=true;applyFace(leo,'nervous');leo.root.position.set(1,0,3.5);leo.root.rotation.set(0,-.5,0);leo.pivots.head.rotation.set(...state.head);leo.pivots.leftShoulder.rotation.x=state.bookArm;leo.pivots.rightShoulder.rotation.x=-.02+.02*state.s;coverHinge.rotation.y=state.bookCover;
 }else{
  pip.root.position.copy(received.position);pip.root.rotation.copy(received.rotation);pip.pivots.leftShoulder.rotation.x=state.pinArm;pip.pivots.head.rotation.set(...state.head);pin.visible=true;step.position.set(1.99925,.791,3.6315);applyFace(pip,'nervous');
 }
 camera.position.set(...cam.position);camera.lookAt(...cam.target);camera.fov=cam.fov;camera.updateProjectionMatrix();scene.updateMatrixWorld(true);camera.updateMatrixWorld(true);renderer.render(scene,camera);
 return{shot,frame,bookCover:shot==='D22'?coverHinge.rotation.y:null,identity:refs.every((o,i)=>o.uuid===ids[i]),pipScale:pip.root.scale.toArray(),pipPosition:pip.root.position.toArray(),pinWorld:pin.getWorldPosition(new T.Vector3()).toArray(),photoVisible:photoHold.visible,camera:cam};
}
window.__backstory={render,scene,camera,renderer,leo,pip,pin,photo,photoHold,book,step,grip,crankArm,family,received,pinLocal,bookHold,cover,coverHinge,counts};render('D17');
