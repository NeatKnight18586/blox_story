import * as T from 'three';
import {block} from '../../avatar/baseAvatar.js';
import {applyFace} from '../../appearance/faces.js';
import {sampleAction,applyActionSample} from '../../avatar/actions.js';
import {sample,counts} from './motion.js';
await import('../dice-town-p3b4/scene.js');
const w=window.__grounding,{scene,camera,renderer,leo,pip,leaves,gate}=w;
// Reuse the child's exact six meshes / five pivots; no second animation engine.
const names=['head','leftShoulder','rightShoulder','leftHip','rightHip'];
const child={root:pip,parts:{},pivots:Object.fromEntries(names.map(n=>[n,pip.children.find(o=>o.name===n)]))};
for(const name of ['head','torso','leftArm','rightArm','leftLeg','rightLeg'])pip.traverse(o=>{if(o.isMesh&&o.name===name)child.parts[name]=o;});
child.restPositions=Object.fromEntries(names.map(n=>[n,child.pivots[n].position.toArray()]));
// Opt-in installation correction: original full-width leaf penetrates its post.
// Same leaf and pivot identities, 5% narrower leaves; front straps reach posts.
function box(parent,name,size,color,p,r=.006){const m=block(name,size,color,r);m.position.set(...p);parent.add(m);return m;}
for(const {hinge,sign} of leaves){hinge.position.x=sign*2.85;hinge.scale.x=.95;for(const y of [.75,4.3])box(gate,'ending_hinge_mount',[.32,.14,.16],0x59655a,[sign*3,y,.24]);}
gate.getObjectByName('gate_threshold').position.y=-.015; // Flush with road top .025.
const book=leo.root.getObjectByName('notebook'),bookId=book.uuid;
const hold=new T.Group();hold.name='ending_book_hold';leo.parts.leftArm.add(hold);hold.position.set(0,-.78,.59);hold.add(book);book.position.set(0,0,0);book.rotation.set(0,0,0);
box(hold,'notebook_page_face',[.48,.61,.01],0xe9d5ac,[0,0,.0975]);
const coverHinge=new T.Group();coverHinge.name='notebook_cover_hinge';coverHinge.position.set(-.26,0,.125);hold.add(coverHinge);
const cover=box(coverHinge,'notebook_front_cover',[.52,.67,.025],0x9b6748,[.26,0,0]);
box(cover,'notebook_inner_page',[.48,.61,.006],0xe9d5ac,[0,0,-.017]);
box(hold,'notebook_spine',[.045,.67,.23],0x765038,[-.26,0,.01]);
const refs=[leo.root,pip,book,...Object.values(leo.parts),...Object.values(child.parts),...leaves.map(x=>x.hinge)];
const ids=refs.map(o=>o.uuid);
const cameras={D33:{position:[3,7.5,23],target:[0,3.2,-6],fov:52},D34:{position:[3.5,4.3,8],target:[0,1.8,-.4],fov:48},D38:{position:[1,5.7,13],target:[-1.2,3.9,5],fov:44},home:{position:[2.2,3.6,-12],target:[0,3.2,-23.5],fov:46}};
let lastSample;
function render(shot,frame=0,width=720){
 const s=shot==='home'?sample('D34',29):sample(shot,frame),draw=renderer.render;
 // Base sets inherited lighting/sky; ALL ending state is authored afterwards.
 renderer.render=()=>{};try{w.render('open',true,width);}finally{renderer.render=draw;}
 for(const {hinge,sign} of leaves)hinge.rotation.y=-sign*s.gate;
 leo.root.visible=shot==='D38';pip.visible=shot==='D33'||shot==='D34';hold.visible=shot==='D38';
 const walk=sampleAction('walk',s.walkTime,{gait:'readable'});walk.root.position=walk.root.position.map(v=>v*.65);
 applyActionSample(child,walk,{position:[0,.025,.70],yaw:Math.PI});
 if(shot==='D38'){
  applyFace(leo,'thoughtful');leo.root.position.set(-.7,.025,4.5);leo.root.rotation.set(0,.25,0);
  for(const [n,p] of Object.entries(leo.pivots)){p.position.fromArray(leo.restPositions[n]);p.rotation.set(0,0,0);}
  leo.pivots.leftShoulder.rotation.x=s.shoulder;leo.pivots.rightShoulder.rotation.x=.03;leo.pivots.head.rotation.set(...s.head);coverHinge.rotation.y=s.cover;
 }else coverHinge.rotation.y=0;
 const c=cameras[shot];camera.position.set(...c.position);camera.lookAt(...c.target);camera.fov=c.fov;camera.updateProjectionMatrix();scene.updateMatrixWorld(true);camera.updateMatrixWorld(true);renderer.render(scene,camera);lastSample={...s,walk};
 return {shot,frame,gate:leaves.map(x=>x.hinge.rotation.y),pipPosition:pip.position.toArray(),pipScale:pip.scale.toArray(),cover:coverHinge.rotation.y,bookId,identity:refs.every((o,i)=>o.uuid===ids[i]),camera:c,walkTime:s.walkTime};
}
window.__ending={render,scene,camera,renderer,leo,child,leaves,gate,book,hold,cover,coverHinge,counts,cameras,get sample(){return lastSample;}};
render('D33');
