import * as T from 'three';
import {createBaseAvatar,block} from '../../avatar/baseAvatar.js';
import {applyAppearance} from '../../appearance/appearance.js';
import {applyFace} from '../../appearance/faces.js';
import {ease as easeM,sampleMotion,compileProof} from '../dice-town-p2a/motion.js';
import {headFrontZ} from '../../avatar/headGeometry.js';
import {addSkyAndDistance} from '../dice-town-p2a/sky.js';
import {makeLeoFaces} from '../dice-town-p1b/leo-faces.js';
import {makeFinalHair} from '../dice-town/hair.js';
const plan=compileProof(window.__shotListInput);
const scene=new T.Scene();scene.fog=new T.Fog(0xc6d4cd,42,105);
const renderer=new T.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});renderer.setPixelRatio(1);renderer.setSize(plan.width,plan.height);renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1;document.body.append(renderer.domElement);
scene.add(new T.HemisphereLight(0xc5e3f1,0x756a55,1.7));const sun=new T.DirectionalLight(0xffd6a0,3.6);sun.position.set(-24,28,-55);sun.castShadow=true;sun.shadow.mapSize.set(4096,4096);Object.assign(sun.shadow.camera,{left:-22,right:22,top:22,bottom:-22,near:.1,far:120});sun.shadow.normalBias=.04;sun.shadow.bias=-.0001;sun.shadow.radius=3;scene.add(sun);
const fill=new T.DirectionalLight(0xffe8c9,2.0);fill.position.set(-12,10,12);scene.add(fill);
addSkyAndDistance(scene);
function box(parent,name,size,color,p,r=.04){const m=block(name,size,color,r);m.position.set(...p);parent.add(m);return m;}
function cylinder(parent,r1,r2,h,color,p,n=32){const m=new T.Mesh(new T.CylinderGeometry(r1,r2,h,n),new T.MeshStandardMaterial({color,roughness:.8}));m.position.set(...p);m.castShadow=m.receiveShadow=true;parent.add(m);return m;}
function label(parent,text,p,w,h,color=0xf4dfb6){const c=document.createElement('canvas');c.width=768;c.height=256;const x=c.getContext('2d');x.fillStyle='#173c43';x.fillRect(0,0,768,256);x.strokeStyle='#bda171';x.lineWidth=10;x.strokeRect(8,8,752,240);x.fillStyle='#f6e6bd';x.font='bold 72px sans-serif';x.textAlign='center';x.textBaseline='middle';x.fillText(text,384,128);const m=new T.Mesh(new T.PlaneGeometry(w,h),new T.MeshBasicMaterial({map:new T.CanvasTexture(c)}));m.position.set(...p);parent.add(m);return m;}
box(scene,'plaza_foundation',[60,.4,70],0x867f70,[0,-.25,-5]);
// Broad radial paving and a shallow ceremonial dais give the square a center.
cylinder(scene,8,8.3,.2,0xb6ad96,[-1,.02,-1],64);cylinder(scene,6,6.3,.24,0x676f6c,[-1,.24,-1],48);
for(let i=0;i<16;i++){const a=i*Math.PI/8;const m=box(scene,'radial_joint',[.025,.012,5.4],0x8c887b,[-1+Math.sin(a)*8,.006,-1+Math.cos(a)*8],.003);m.rotation.y=a;}
function arch(parent,x,y,z,w,h,color){const sh=new T.Shape();sh.moveTo(-w/2,0);sh.lineTo(w/2,0);sh.lineTo(w/2,h-w/2);sh.absarc(0,h-w/2,w/2,0,Math.PI,false);sh.lineTo(-w/2,0);const m=new T.Mesh(new T.ExtrudeGeometry(sh,{depth:.22,bevelEnabled:true,bevelThickness:.04,bevelSize:.04,bevelSegments:2,steps:1,curveSegments:12}),new T.MeshStandardMaterial({color,roughness:.9}));m.position.set(x,y,z);m.castShadow=true;parent.add(m);return m;}
function shop(x,z,w,h,color,title){const g=new T.Group();g.position.set(x,0,z);scene.add(g);box(g,'stucco',[w,h,3.8],color,[0,h/2,0]);box(g,'stone_base',[w+.15,.45,4],0x999385,[0,.225,0]);box(g,'cornice',[w+.4,.26,4.15],0xead5ae,[0,h,0]);
// Pitched terracotta roof: extruded triangular profile, coherent shared language.
const sh=new T.Shape();sh.moveTo(-w/2-.3,0);sh.lineTo(0,1.6);sh.lineTo(w/2+.3,0);sh.closePath();const roof=new T.Mesh(new T.ExtrudeGeometry(sh,{depth:4.3,bevelEnabled:false}),new T.MeshStandardMaterial({color:0x8f4f39,roughness:.95}));roof.position.set(0,h+.14,-2.15);g.add(roof);
arch(g,0,.35,2.01,1.8,3.7,0xddd0ae);arch(g,0,.38,2.25,1.38,3.35,0x25494d);
if(h>7)for(const xx of[-w*.29,w*.29]){arch(g,xx,4.5,2.02,1.35,2.1,0xe1cfac);arch(g,xx,4.62,2.26,1.05,1.8,0x284d58);box(g,'window_mullion',[.07,1.6,.08],0xb7a47d,[xx,5.4,2.52]);}
label(g,title,[0,3.9,2.55],w*.78,.7);
for(let i=0;i<8;i++){const m=box(g,'awning_stripe',[w/8,.12,1.5],i%2?0xe6d8b9:0x39777a,[-w/2+w*(i+.5)/8,3.1,2.7]);m.rotation.x=.12;}
return g;}
const clock=shop(-12,-11,5.5,12,0xb8c2b0,'CLOCKMAKER');
const archive=shop(.5,-14,8,9.5,0xc7ac83,'HALL OF RECORDS');
const bakery=shop(8.5,-10,7,5.4,0xba795e,'MORROW BREAD');
// Camera-visible authored accents give the three buildings different jobs.
box(bakery,'chimney',[.9,3.3,.9],0x8c6654,[2,7,0]);
box(bakery,'chimney_cap',[1.2,.25,1.2],0xdbc6a2,[2,8.7,0]);
for(const x of[-3.1,3.1]){cylinder(archive,.22,.3,4.5,0xdcc7a0,[x,2.5,2.8]);box(archive,'column_cap',[.8,.22,.8],0xe7d3ae,[x,4.7,2.8]);}
const dial=cylinder(clock,1.15,1.15,.1,0xe8d4ab,[0,9.5,2.1],48);dial.rotation.x=Math.PI/2;
for(let i=0;i<12;i++){const a=i*Math.PI/6;const tick=box(clock,'clock_tick',[.06,.16,.04],0x384b50,[Math.sin(a)*.9,9.5+Math.cos(a)*.9,2.18],.005);tick.rotation.z=-a;}
const hand=box(clock,'clock_hand',[.075,.8,.05],0x384b50,[0,9.83,2.2],.01);hand.rotation.z=-.5;
box(clock,'hour_hand',[.6,.08,.05],0x384b50,[.23,9.5,2.21],.01);
for(const x of[-2.3,2.3])box(clock,'tower_pilaster',[.28,11.7,.3],0xd8c8a7,[x,6,2.1]);
// Bakery display and a few barrels remain inside the visible set footprint.
box(scene,'market_counter',[3,.8,1.4],0x805e42,[8,.5,-5]);
for(let i=0;i<5;i++){const loaf=new T.Mesh(new T.CapsuleGeometry(.16,.45,4,8),new T.MeshStandardMaterial({color:0xd7aa61,roughness:1}));loaf.rotation.z=Math.PI/2;loaf.position.set(7+i*.45,1,-4.9);scene.add(loaf);}
for(const x of[11,12.1]){cylinder(scene,.43,.4,1.1,0x886b4c,[x,.55,-5]);for(const y of[.18,.85])cylinder(scene,.44,.44,.08,0x3e5357,[x,y,-5]);}
// One framing tree and low stone edging, not an explorable town.
const tree=new T.Group();tree.position.set(-23,0,-1);scene.add(tree);cylinder(tree,.23,.5,7,0x665649,[0,3.5,0]);
for(const [x,y,z,r]of[[-1,7,0,2.4],[1,8,0,2.8],[0,7,1.5,2.2]]){const m=new T.Mesh(new T.IcosahedronGeometry(r,1),new T.MeshStandardMaterial({color:0x7c925d,roughness:1}));m.position.set(x,y,z);m.castShadow=false;tree.add(m);}
box(scene,'tree_planter',[4,.65,4],0x9c947e,[-23,.3,-1],.12);
// Repeated slender arcades, not an unbounded town.
for(const x of[-18,18]){cylinder(scene,.16,.22,6.5,0x596f6c,[x,3.25,-2]);box(scene,'brass_finial',[.3,.3,.3],0xb59b60,[x,6.7,-2]);const flag=new T.Mesh(new T.PlaneGeometry(1.3,2),new T.MeshStandardMaterial({color:0xd3a25b,side:T.DoubleSide,roughness:1}));flag.position.set(x+.65,5.2,-2);scene.add(flag);}
// One visible rest spot and two planted shop entrances imply daily use.
const bench=new T.Group();bench.position.set(8,0,1);bench.rotation.y=-.25;scene.add(bench);
for(const z of[-.32,0,.32])box(bench,'bench_slat',[3,.12,.26],0x886548,[0,.95,z]);
for(const x of[-1.1,1.1]){box(bench,'bench_leg',[.14,.95,.68],0x3c5657,[x,.47,0]);box(bench,'back_support',[.12,.9,.12],0x3c5657,[x,1.18,-.40]);}
box(bench,'back_rest',[3,.48,.12],0x94734e,[0,1.5,-.4]);
for(const[x,z]of[[5.8,-5.8],[-8.5,-6]]){
 cylinder(scene,.48,.35,.65,0xa56f54,[x,.325,z]);
 for(const[dx,dy,dz]of[[0,.95,0],[-.22,.78,.05],[.2,.85,-.1]]){const leaf=new T.Mesh(new T.IcosahedronGeometry(.4,1),new T.MeshStandardMaterial({color:0x667b4c,roughness:1}));leaf.position.set(x+dx,dy,z+dz);leaf.castShadow=true;scene.add(leaf);}
}
const dieGroup=new T.Group();dieGroup.position.set(-1,3.65,-1);dieGroup.scale.setScalar(.7);scene.add(dieGroup);box(dieGroup,'ivory_die',[9,9,9],0xf5e5c4,[0,0,0],.34);
const pipGeo=new T.CylinderGeometry(.45,.45,.035,24),pipMat=new T.MeshBasicMaterial({color:0x213b43});
for(const v of[-2.2,0,2.2]){const top=new T.Mesh(pipGeo,pipMat);top.position.set(v,4.51,v);dieGroup.add(top);}
const front=new T.Mesh(pipGeo,pipMat);front.rotation.x=Math.PI/2;front.position.set(0,0,4.51);dieGroup.add(front);
for(const v of[-1.65,1.65]){const side=new T.Mesh(pipGeo,pipMat);side.rotation.z=Math.PI/2;side.position.set(4.51,v,v);dieGroup.add(side);}
const lawBoard=label(scene,'3  /  PEOPLE RISE',[-1,1.12,3],5.5,.95);lawBoard.rotation.y=.23;
// Small brass service cover plants the later latch idea without implementing it.
box(scene,'brass_access',[.65,.28,.06],0xa78a4b,[2,.7,3]);
function actor(id,p,color,scale=1,levitate=0){const a=createBaseAvatar({torsoVariant:id==='leo'?'tapered':'classic'});a.root.name=id;applyAppearance(a,{color:0xdab692,pieces:{torso:color,leftLeg:0x354b52,rightLeg:0x354b52}});applyFace(a,'nervous');a.root.position.set(p[0],levitate,p[1]);a.root.scale.setScalar(scale);scene.add(a.root);return a;}
const leo=actor('leo',[-6,7],0x197f83);leo.root.rotation.y=.35;const hair=makeFinalHair('neat_side_part');leo.pivots.head.add(hair);hair.scale.y=.92;hair.position.y=.08;hair.traverse(m=>{if(m.isMesh){m.material.color.setHex(0x634832);m.material.roughness=.76;}});
leo.pivots.head.scale.setScalar(1.14);
for(const side of ['left','right'])leo.parts[side+'Arm'].scale.x=.88;
// Garment identity: long teal hem, ochre cross-body strap and one notebook.
box(leo.root,'jacket_hem',[2.13,.40,1.06],0x17666c,[0,2.14,0]);const strap=box(leo.root,'satchel_strap',[.15,1.9,.06],0xb6995f,[.06,3,.66],.01);strap.rotation.z=-.42;box(leo.root,'notebook',[.52,.67,.18],0x9b6748,[-.70,2.45,.66]);
const pip=actor('pip',[-4.8,5.5],0xa9634c,.65,2.5);pip.root.rotation.y=.5;pip.pivots.leftShoulder.rotation.z=-.5;
const extras=[actor('baker',[5.5,-3.5],0xc49b54,.93,3.6),actor('archivist',[-8.5,-2],0x597789,1,4.2),actor('resident',[5.2,8],0x87956c,.84,2.3)];
for(const[a,i]of extras.map((a,i)=>[a,i])){a.pivots.leftShoulder.rotation.z=-.85-i*.15;a.pivots.rightShoulder.rotation.z=.7+i*.12;a.root.rotation.y=-.4+i*.35;}
// Visible ground projections anchor deliberate levitation; no physics claims.
for(const a of[pip,...extras]){const s=new T.Mesh(new T.CircleGeometry(.65,32),new T.MeshBasicMaterial({color:0x35484a,transparent:true,opacity:.18,depthWrite:false}));s.rotation.x=-Math.PI/2;s.position.set(a.root.position.x,.011,a.root.position.z);scene.add(s);}
// Collar, lapels and cuffs follow existing meshes, never an independent animation rig.
for(const sign of[-1,1]){
 const shape=new T.Shape();shape.moveTo(sign*.08,.96);shape.lineTo(sign*.50,.88);shape.lineTo(sign*.20,.34);shape.closePath();
 const lapel=new T.Mesh(new T.ExtrudeGeometry(shape,{depth:.045,bevelEnabled:true,bevelSize:.018,bevelThickness:.012,bevelSegments:2,steps:1}),new T.MeshStandardMaterial({color:0x2a6065,roughness:.85}));lapel.name='tailored_lapel';lapel.position.z=.55;lapel.castShadow=true;leo.parts.torso.add(lapel);
 box(leo.parts[sign<0?'leftArm':'rightArm'],'cuff',[.99,.21,1.035],0x214853,[0,-.76,0]);
}
for(const y of[2.7,3.12])box(leo.root,'brass_fastener',[.08,.08,.07],0xc8a264,[.37,y,.56],.02);
for(const a of[pip,...extras]){a.pivots.leftHip.rotation.x=.22;a.pivots.rightHip.rotation.x=-.18;a.pivots.head.rotation.x=.12;}
const leoFaces=makeLeoFaces();
const camera=new T.PerspectiveCamera(45,720/1280,.1,250);const ids=Object.values(leo.parts).map(m=>m.uuid);
// One persistent face: geometry buffers interpolate between cached authored poses.
const face=leoFaces.annoyed.clone();face.traverse(m=>{if(m.isMesh)m.geometry=m.geometry.clone();});
leo.faceLayer.removeFromParent();leo.faceLayer=face;leo.pivots.head.add(face);
const faceMeshes=face.children.map(m=>({m,targets:['focus','surprise','annoyed'].map(k=>leoFaces[k].getObjectByName(m.name))}));
for(const child of [...scene.children])if(child.geometry?.type==='CircleGeometry')child.removeFromParent();
pip.root.visible=false;
const dieMesh=dieGroup.getObjectByName('ivory_die'),v=new T.Vector3();
const actorIds=[leo,...extras].flatMap(a=>Object.values(a.parts).map(m=>m.uuid));
function renderFrame(frame){
 const state=sampleMotion(frame),close=frame>=75;
 dieGroup.position.y=0;dieGroup.rotation.set(state.die[0],0,state.die[1]);dieGroup.updateMatrixWorld(true);
 let dieMin=Infinity;const points=dieMesh.geometry.attributes.position;
 for(let i=0;i<points.count;i++){v.fromBufferAttribute(points,i).applyMatrix4(dieMesh.matrixWorld);dieMin=Math.min(dieMin,v.y);}
 dieGroup.position.y=.36-dieMin;
 const contacts=[];
 for(const[a,i]of extras.map((a,i)=>[a,i])){
  const pose=state.people[i];a.root.visible=!close;a.root.position.set(...[[-7,0,-1],[3.4,0,-4],[3.1,0,6]][i]);
  a.root.rotation.set(pose.lean,[-.2,.1,.2][i],pose.tilt);
  for(const[k,r]of Object.entries(pose.pivots))a.pivots[k].rotation.set(...r);
  a.root.updateMatrixWorld(true);let min=Infinity;
  for(const name of ['leftLeg','rightLeg']){const mesh=a.parts[name],p=mesh.geometry.attributes.position;for(let j=0;j<p.count;j++){v.fromBufferAttribute(p,j).applyMatrix4(mesh.matrixWorld);min=Math.min(min,v.y);}}
  a.root.position.y=pose.height-min;a.root.updateMatrixWorld(true);contacts.push(pose.height);
 }
 leo.root.position.set(-9,0,-4);leo.root.visible=close;leo.root.rotation.set(0,.15,0);
 leo.pivots.head.rotation.set(state.hero.head[0],state.hero.head[1],state.hero.head[2]);
 leo.pivots.leftShoulder.rotation.set(-.03,0,-.06-state.hero.shoulder);leo.pivots.rightShoulder.rotation.set(-.08,0,.08+state.hero.shoulder);
 for(const{m,targets}of faceMeshes){
  const attr=m.geometry.attributes.position,arrays=targets.map(t=>t.geometry.attributes.position.array);
  for(let i=0;i<attr.array.length;i++)attr.array[i]=arrays.reduce((sum,a,k)=>sum+a[i]*state.hero.weights[k],0);attr.needsUpdate=true;m.geometry.computeVertexNormals();
  m.scale.set(...[0,1,2].map(axis=>targets.reduce((sum,t,k)=>sum+t.scale.getComponent(axis)*state.hero.weights[k],0)));
  m.position.copy(targets[0].position);
  if(m.name==='mouth'){const u=Math.max(0,frame/30-2.5);const open=easeM(u/.16)*(1-easeM((u-.4)/.2));const a=(u<.65?targets[1]:targets[2]).geometry.attributes.position.array;for(let j=0;j<attr.array.length;j++){const axis=j%3;attr.array[j]=axis===1?(u<.65?.335+(a[j]-.335)*Math.max(.05,open):.35+(a[j]-.35)*easeM((u-.65)/.3)):a[j];}attr.needsUpdate=true;m.geometry.computeVertexNormals();}
  if(m.name.startsWith('eye_')){m.position.x+=.018;m.position.z=headFrontZ(m.position.x)+.01;}
 }
 const shot=plan.shots[close?1:0];camera.position.set(...shot.camera.position);camera.lookAt(...shot.camera.target);camera.fov=shot.camera.fov;camera.aspect=plan.width/plan.height;camera.updateProjectionMatrix();renderer.render(scene,camera);
 return {frame,time:frame/30,shot:shot.id,identity:actorIds.every((id,i)=>id===[leo,...extras].flatMap(a=>Object.values(a.parts).map(m=>m.uuid))[i]),dieSize:6.3,footClearance:contacts,hero:state.hero,die:state.die};
}
window.__production={renderFrame,renderer};window.__dice={renderFrame,scene,camera,leo,extras};renderFrame(0);
// Isolated storyboard adapter. Schematic props deliberately remain placeholders.
const stages=new Map();
function card(parent,text,x,y,z,w=3,h=2){return label(parent,text,[x,y,z],w,h);}
function line(parent,a,b,color=0xb9a173,r=.055){const points=[new T.Vector3(...a),new T.Vector3(...b)];const m=new T.Mesh(new T.TubeGeometry(new T.LineCurve3(...points),1,r,8,false),new T.MeshStandardMaterial({color}));parent.add(m);return m;}
function buildStage(id,k){
 const g=new T.Group();g.name='storyboard_'+id;const n=+id.slice(1),pose=k;
 // Separate single-angle cutaway space uses the same rig and material language.
 const origin=n>=14&&n<=24||n===27||n===30?35:n>=33?65:0;
 if(origin){box(g,'vignette_floor',[22,.3,18],0x827b6b,[origin,-.2,0]);box(g,'vignette_wall',[20,9,.3],0xb7a187,[origin,4,-4]);}
 const actorAt=(who,x,z,face='worried')=>{const a=who==='leo'?leo:who==='pip'?pip:mother;a.root.visible=true;a.root.position.set(x,0,z);a.root.rotation.set(0,.1,0);for(const p of Object.values(a.pivots))p.rotation.set(0,0,0);applyFace(a,face);return a;};
 let cam={position:[8,11.5,27],target:[-1,5.5,0],fov:53};
 if(n<=2||n===10){cam=n===2?{position:[8,8,17],target:[1,4,0],fov:56}:cam;}
 if(n===3||n===4){const a=extras[0];a.root.position.set(-7,k?1.4:.2,-1);a.pivots.leftShoulder.rotation.x=-1.2;a.pivots.rightShoulder.rotation.x=-1;box(g,'stall',[4,1,1.7],0x986e48,[-7,1.2,1]);for(const x of[-7.5,-6.5])box(g,'shoe proxy',[.5,.25,.8],0x423a36,[x,k?1.6:.25,2]);cam={position:[-3,n===4?2.5:5,6],target:[-7,n===4?1.2:3,1],fov:48};}
 if(n>=5&&n<=7||n===12){actorAt('leo',-7,1,n===5?'startled':'thoughtful');const anchor=[-10,2,-5];line(g,anchor,[-7,3,1]);box(g,'anchor',[.5,3,.5],0x676654,[-10,1.5,-5]);card(g,n===12?'6?  /  SAME WOBBLE':'IF GRAVITY FAILS',-7,3.3,1.7,2.6,1.5);cam={position:[-3,5,8],target:[-7,3.6,1],fov:n===7||n===12?28:48};if(n===6)cam={position:[-4,5,8],target:[-9,2.5,-2],fov:55};}
 if(n===8){for(const x of[-1,1])cylinder(g,.35,.3,.6,0xc6d7d7,[x,k?3:1.5,5]);cam={position:[4,4,10],target:[0,2.5,5],fov:40};}
 if(n===9){for(const[a,i]of extras.slice(0,2).map((a,i)=>[a,i])){a.root.position.set(-4+i*4,0,k?-1:1);a.pivots.leftHip.rotation.x=k?-.3:.3;a.pivots.rightHip.rotation.x=k?.3:-.3;}cam={position:[8,4,10],target:[-2,2.5,0],fov:48};card(g,'BACKWARDS',-2,1,2,4,.6);}
 if([11,13,28,29,31,32,25,26].includes(n)){cam={position:[8,10,13],target:[-1,3.5,-1],fov:43};}
 if(origin===35){
  const paddle=box(g,'brass paddle',[4,.3,1.3],0xb99a45,[35,2.2,-1]);paddle.rotation.z=k?.22:0;line(g,[35,.3,-1],[35,2.2,-1],0xa79257,.15);line(g,[35,1.4,-1],[38,1.4,-1],0xb99a45,.1);line(g,[38,1.4,-1],[38,2.4,-1],0xb99a45,.1);box(g,'pin proxy',[.16,.16,.85],0xe8c469,[37,1.5,0]);card(g,'PADDLE / CRANK / PIN',35,4,-3,6,1);
  cam={position:[41,5,9],target:[35,2.5,0],fov:48};
  if(n===14){actorAt('leo',33,1);box(g,'hatch',[2.5,.2,2.5],0x465550,[33,4,0]);line(g,[33,5,0],[33,2,1]);card(g,'RECLIP TO HATCH ANCHOR',35,5,-3,7,.8);}
  if(n>=17){actorAt('pip',36,0,n===24?'thoughtful':'worried');pip.pivots.rightShoulder.rotation.x=-1;}
  if([18,19,20,27].includes(n)){card(g,'FAMILY BEFORE',35,3.4,1,2.5,1.8);card(g,'OUTSIDE: YEARS LATER',38,3.4,1,2.5,1.8);}
  if([17,18,20,27,30].includes(n))cam={position:[39,4,6],target:[36,2.7,0],fov:38};
  if(n===19)cam={position:[36.5,3.8,7],target:[36.5,3.4,1],fov:43};
  if(n===22||n===23||n===24){actorAt('leo',33,0,n===22?'worried':'thoughtful');actorAt('pip',37,0,'worried');cam={position:[36,5,10],target:[35,3,0],fov:n===22?30:45};if(n===23){leo.pivots.rightShoulder.rotation.x=-1.1;pip.pivots.leftShoulder.rotation.x=-1.1;box(g,'handed pin',[.15,.15,.8],0xffd56e,[k?36.4:34.5,3,1]);}if(n===22)cam.target=[33,4.5,0];}
 }
 if(n===21||n>=33){const x=origin||35;box(g,'gate post',[.8,7,.8],0xa3957b,[x-3,3.5,-2]);box(g,'gate post',[.8,7,.8],0xa3957b,[x+3,3.5,-2]);for(const sign of[-1,1]){const gate=new T.Group();gate.position.set(x+sign*2.7,0,-2);g.add(gate);box(gate,'gate leaf',[2.7,5,.3],0x385a5b,[-sign*1.35,2.5,0]);gate.rotation.y=n>=33&&k?sign*1.0:0;}
 if(n===21){actorAt('pip',35,1);cam={position:[39,4.2,7],target:[35,2.8,0],fov:38};}
 else{actorAt('pip',65,k?-3:2,'thoughtful');cam={position:[73,7,12],target:[65,3,-1],fov:48};}
 if(n>=35){box(g,'doorway',[5,7,.4],0x6b7771,[65,3.5,-3.6]);actorAt('mother',65,-2,'relieved');actorAt('pip',64,1,'relieved');cam={position:[68,4.5,6],target:[65,3.3,-1],fov:43};}
 if(n===36||n===37){box(g,'table',[4,.3,2],0x967249,[67,2,-1]);box(g,'child chair seat',[1.2,.2,1.2],0xd2a04f,[64,1,0]);box(g,'child chair back',[1.2,1.5,.15],0xd2a04f,[64,1.7,-.5]);for(const dx of[-.45,.45])for(const dz of[-.4,.4])box(g,'chair leg',[.12,1,.12],0x9c733e,[64+dx,.5,dz]);if(n===36)cam={position:[67,3.3,5],target:[64.5,1.6,0],fov:36};}
 if(n===38){actorAt('leo',65,1,'relieved');pip.root.visible=false;mother.root.visible=false;cam={position:[69,5,8],target:[65,3.4,1],fov:35};card(g,k?'TOMORROW: UNPLANNED':'NOTEBOOK',65,3,1.7,2,1);}
 }
 if(n>=35&&n<=37)g.traverse(m=>{if(['gate leaf','gate post'].includes(m.name))m.visible=false;});
 if(n===36){pip.root.visible=false;mother.root.visible=false;}
 return {g,cam};
}
const mother=actor('mother',[65,-2],0x7b8198,1);mother.pivots.head.add(makeFinalHair('low_bun'));mother.root.visible=false;
const topPips=new T.Group();scene.add(topPips);
function setDie(value){topPips.clear();dieGroup.children.slice(1).forEach(m=>m.visible=false);const layouts={1:[[0,0]],2:[[-1,-1],[1,1]],3:[[-1.5,-1.5],[0,0],[1.5,1.5]],4:[[-1,-1],[-1,1],[1,-1],[1,1]],5:[[-1,-1],[-1,1],[1,-1],[1,1],[0,0]],6:[[-1.5,-1.5],[-1.5,0],[-1.5,1.5],[1.5,-1.5],[1.5,0],[1.5,1.5]]};for(const[x,z]of layouts[value]){const m=new T.Mesh(pipGeo,pipMat);m.position.set(-1+x,6.81,-1+z);topPips.add(m);}}
window.__board={render(id,k){
 for(const{g}of stages.values())g.visible=false;renderFrame([8,9].includes(+id.slice(1))?0:+id.slice(1)<=2?(k?65:24):55);leo.root.visible=false;pip.root.visible=false;mother.root.visible=false;const n=+id.slice(1);for(const a of extras)a.root.visible=n<=10;
 const key=id+'-'+k;let data=stages.get(key);if(!data){data=buildStage(id,k);stages.set(key,data);scene.add(data.g);}else{const old=data.g;old.removeFromParent();data=buildStage(id,k);stages.set(key,data);scene.add(data.g);}data.g.visible=true;
 const value=n===8?1:n===9?2:n>=31?6:n===25?(k?2:1):n===26?(k?4:3):n===28?5:n===29?(k?6:5):[11,13].includes(n)?(k?3:6):3;setDie(value);lawBoard.visible=![8,9,25,26,28,29,31,32].includes(n);if(!lawBoard.visible)card(data.g,value===6?'6 / GATE OPENS':value===1?'1 / OBJECTS FLOAT':value===2?'2 / BACKWARDS':'RULE '+value,-1,1.12,3,5.5,.95);
 camera.position.set(...data.cam.position);camera.lookAt(...data.cam.target);camera.fov=data.cam.fov;camera.updateProjectionMatrix();renderer.render(scene,camera);return{id,k,value,webgl:renderer.getContext().getParameter(renderer.getContext().VERSION)};
}};
