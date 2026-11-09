import * as T from 'three';
import {createBaseAvatar,block} from '../../avatar/baseAvatar.js';
import {applyAppearance} from '../../appearance/appearance.js';
import {applyFace} from '../../appearance/faces.js';
import {makeLeoFaces} from './leo-faces.js';
import {makeFinalHair} from '../dice-town/hair.js';
const scene=new T.Scene();scene.background=new T.Color(0x9cbcc9);scene.fog=new T.Fog(0x9cbcc9,36,85);
const renderer=new T.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});renderer.setPixelRatio(1);renderer.setSize(720,1280);renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1;document.body.append(renderer.domElement);
scene.add(new T.HemisphereLight(0xb9d9eb,0x62544b,1.35));const sun=new T.DirectionalLight(0xffd6a0,3.6);sun.position.set(-13,22,9);sun.castShadow=true;sun.shadow.mapSize.set(4096,4096);Object.assign(sun.shadow.camera,{left:-22,right:22,top:22,bottom:-22,near:.1,far:60});sun.shadow.normalBias=.025;sun.shadow.radius=3;scene.add(sun);
const fill=new T.DirectionalLight(0x9ccbdd,.65);fill.position.set(8,8,-4);scene.add(fill);
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
for(const xx of[-w*.29,w*.29]){arch(g,xx,4.5,2.02,1.35,2.1,0xe1cfac);arch(g,xx,4.62,2.26,1.05,1.8,0x284d58);box(g,'window_mullion',[.07,1.6,.08],0xb7a47d,[xx,5.4,2.52]);}
label(g,title,[0,3.9,2.55],w*.78,.7);
for(let i=0;i<8;i++){const m=box(g,'awning_stripe',[w/8,.12,1.5],i%2?0xe6d8b9:0x39777a,[-w/2+w*(i+.5)/8,3.1,2.7]);m.rotation.x=.12;}
return g;}
const clock=shop(-10,-9,5.5,12,0xb8c2b0,'CLOCKMAKER');
const archive=shop(.5,-14,8,9.5,0xc7ac83,'HALL OF RECORDS');
const bakery=shop(10,-10,7,5.4,0xba795e,'MORROW BREAD');
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
const tree=new T.Group();tree.position.set(-14,0,1);scene.add(tree);cylinder(tree,.23,.5,7,0x665649,[0,3.5,0]);
for(const [x,y,z,r]of[[-1,7,0,2.4],[1,8,0,2.8],[0,7,1.5,2.2]]){const m=new T.Mesh(new T.IcosahedronGeometry(r,1),new T.MeshStandardMaterial({color:0x667b50,roughness:1}));m.position.set(x,y,z);m.castShadow=false;tree.add(m);}
box(scene,'tree_planter',[4,.65,4],0x9c947e,[-14,.3,1],.12);
// Repeated slender arcades, not an unbounded town.
for(const x of[-12,12]){cylinder(scene,.16,.22,6.5,0x596f6c,[x,3.25,-2]);box(scene,'brass_finial',[.3,.3,.3],0xb59b60,[x,6.7,-2]);const flag=new T.Mesh(new T.PlaneGeometry(1.3,2),new T.MeshStandardMaterial({color:0xd3a25b,side:T.DoubleSide,roughness:1}));flag.position.set(x+.65,5.2,-2);scene.add(flag);}
const dieGroup=new T.Group();dieGroup.position.set(-1,5,-1);scene.add(dieGroup);box(dieGroup,'ivory_die',[9,9,9],0xf5e5c4,[0,0,0],.34);
const pipGeo=new T.CylinderGeometry(.45,.45,.035,24),pipMat=new T.MeshStandardMaterial({color:0x213b43,roughness:.8});
for(const v of[-2.2,0,2.2]){const top=new T.Mesh(pipGeo,pipMat);top.position.set(v,4.51,v);dieGroup.add(top);}
const front=new T.Mesh(pipGeo,pipMat);front.rotation.x=Math.PI/2;front.position.set(0,0,4.51);dieGroup.add(front);
for(const v of[-1.65,1.65]){const side=new T.Mesh(pipGeo,pipMat);side.rotation.z=Math.PI/2;side.position.set(4.51,v,v);dieGroup.add(side);}
label(scene,'3  /  PEOPLE RISE',[-1,1,4.3],6,.85);
// Small brass service cover plants the later latch idea without implementing it.
box(scene,'brass_access',[.65,.28,.06],0xa78a4b,[2,.7,4.3]);
function actor(id,p,color,scale=1,levitate=0){const a=createBaseAvatar({torsoVariant:id==='leo'?'tapered':'classic'});a.root.name=id;applyAppearance(a,{color:0xdab692,pieces:{torso:color,leftLeg:0x354b52,rightLeg:0x354b52}});applyFace(a,'nervous');a.root.position.set(p[0],levitate,p[1]);a.root.scale.setScalar(scale);scene.add(a.root);return a;}
const leo=actor('leo',[-6,7],0x197f83);leo.root.rotation.y=.35;const hair=makeFinalHair('neat_side_part');leo.pivots.head.add(hair);
leo.pivots.head.scale.setScalar(1.14);
for(const side of ['left','right'])leo.parts[side+'Arm'].scale.x=.88;
// Garment identity: long teal hem, ochre cross-body strap and one notebook.
box(leo.root,'jacket_hem',[2.13,.40,1.06],0x17666c,[0,2.14,0]);const strap=box(leo.root,'satchel_strap',[.15,1.9,.06],0xb6995f,[.06,3,.55],.01);strap.rotation.z=-.42;box(leo.root,'notebook',[.52,.67,.18],0x9b6748,[-.70,2.45,.66]);
const pip=actor('pip',[-4.8,5.5],0xa9634c,.65,2.5);pip.root.rotation.y=.5;pip.pivots.leftShoulder.rotation.z=-.5;
const extras=[actor('baker',[6.2,-2.5],0xc49b54,.93,3.6),actor('archivist',[-10,-2],0x597789,1,4.2),actor('resident',[5.2,8],0x87956c,.84,2.3)];
for(const[a,i]of extras.map((a,i)=>[a,i])){a.pivots.leftShoulder.rotation.z=-.85-i*.15;a.pivots.rightShoulder.rotation.z=.7+i*.12;a.root.rotation.y=-.4+i*.35;}
// Visible ground projections anchor deliberate levitation; no physics claims.
for(const a of[pip,...extras]){const s=new T.Mesh(new T.CircleGeometry(.65,32),new T.MeshBasicMaterial({color:0x35484a,transparent:true,opacity:.18,depthWrite:false}));s.rotation.x=-Math.PI/2;s.position.set(a.root.position.x,.011,a.root.position.z);scene.add(s);}
// Collar, lapels and cuffs follow existing meshes, never an independent animation rig.
for(const sign of[-1,1]){
 const lapel=box(leo.parts.torso,'lapel',[.27,.52,.07],0x24525b,[sign*.25,.65,.57]);lapel.rotation.z=sign*.23;
 box(leo.parts[sign<0?'leftArm':'rightArm'],'cuff',[.99,.21,1.035],0x214853,[0,-.76,0]);
}
for(const y of[2.7,3.12])box(leo.root,'brass_fastener',[.08,.08,.07],0xc8a264,[.37,y,.56],.02);
for(const a of[pip,...extras]){a.pivots.leftHip.rotation.x=.22;a.pivots.rightHip.rotation.x=-.18;a.pivots.head.rotation.x=.12;}
const leoFaces=makeLeoFaces();
const camera=new T.PerspectiveCamera(45,720/1280,.1,100);const ids=Object.values(leo.parts).map(m=>m.uuid);
function renderFrame(frame){const close=frame===30;leo.root.position.set(close?-6:-3.5,0,close?7:9);for(const a of[pip,...extras])a.root.visible=!close;const expression=frame===60?'focus':close?'annoyed':'surprise';if(leo.faceLayer)leo.faceLayer.removeFromParent();leo.faceLayer=leoFaces[expression];leo.pivots.head.add(leo.faceLayer);leo.pivots.head.rotation.set(close?-.03:.02,close?-.25:.4,0);leo.pivots.rightShoulder.rotation.set(-.1,0,.12);leo.pivots.leftShoulder.rotation.set(0,0,-.08);
if(close){camera.position.set(-2.1,5.8,14.2);camera.lookAt(-6,4.05,7);camera.fov=32;}else{camera.position.set(14,16,30);camera.lookAt(-2,4,0);camera.fov=54;}camera.updateProjectionMatrix();renderer.render(scene,camera);return{frame,expression,buffer:[renderer.domElement.width,renderer.domElement.height],webgl:renderer.getContext().getParameter(renderer.getContext().VERSION),identity:ids.every((id,i)=>id===Object.values(leo.parts)[i].uuid),parts:Object.keys(leo.parts).length,extras:4,dieResult:3};}
window.__dice={renderFrame,renderer,leo,scene,camera};renderFrame(0);
