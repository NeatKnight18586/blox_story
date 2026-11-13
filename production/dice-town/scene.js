import * as T from 'three';
import {createBaseAvatar,block} from '../../avatar/baseAvatar.js';
import {applyAppearance} from '../../appearance/appearance.js';
import {applyFace} from '../../appearance/faces.js';
import {makeLeoFaces} from './leo-faces.js';
import {makeFinalHair} from './hair.js';
const scene=new T.Scene();scene.background=new T.Color(0xbacbd1);scene.fog=new T.Fog(0xbacbd1,28,65);
const renderer=new T.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});renderer.setPixelRatio(1);renderer.setSize(720,1280);renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1;document.body.append(renderer.domElement);
scene.add(new T.HemisphereLight(0xd9ebf2,0x685c4d,2));const sun=new T.DirectionalLight(0xffdfb2,3.3);sun.position.set(-9,18,10);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-22,right:22,top:22,bottom:-22,near:.1,far:60});sun.shadow.normalBias=.025;sun.shadow.radius=3;scene.add(sun);
const fill=new T.DirectionalLight(0x9ccbdd,.8);fill.position.set(8,8,-4);scene.add(fill);
function box(parent,name,size,color,p,r=.04){const m=block(name,size,color,r);m.position.set(...p);parent.add(m);return m;}
function cylinder(parent,r1,r2,h,color,p,n=32){const m=new T.Mesh(new T.CylinderGeometry(r1,r2,h,n),new T.MeshStandardMaterial({color,roughness:.8}));m.position.set(...p);m.castShadow=m.receiveShadow=true;parent.add(m);return m;}
function label(parent,text,p,w,h,color=0xf4dfb6){const c=document.createElement('canvas');c.width=768;c.height=256;const x=c.getContext('2d');x.fillStyle='#173c43';x.fillRect(0,0,768,256);x.strokeStyle='#bda171';x.lineWidth=10;x.strokeRect(8,8,752,240);x.fillStyle='#f6e6bd';x.font='bold 72px sans-serif';x.textAlign='center';x.textBaseline='middle';x.fillText(text,384,128);const m=new T.Mesh(new T.PlaneGeometry(w,h),new T.MeshBasicMaterial({map:new T.CanvasTexture(c)}));m.position.set(...p);parent.add(m);return m;}
box(scene,'plaza_foundation',[44,.4,40],0x867f70,[0,-.25,-5]);
// Broad radial paving and a shallow ceremonial dais give the square a center.
cylinder(scene,6,6.3,.2,0xb6ad96,[-1,.02,-1],64);cylinder(scene,3.3,3.5,.24,0x676f6c,[-1,.24,-1],48);
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
shop(-7,-10,6.3,8.2,0xd6a16f,'CLOCKWORK');shop(.3,-12,5.8,9.7,0xc9b792,'THE ARCHIVE');shop(7,-9.8,5.6,7.9,0xb87357,'MORROW BREAD');shop(-13,-16,5.4,10.5,0x8daba4,'');shop(13,-17,6,11,0xa9b3a2,'');
// Repeated slender arcades, not an unbounded town.
for(const x of[-12,12]){cylinder(scene,.16,.22,6.5,0x596f6c,[x,3.25,-2]);box(scene,'brass_finial',[.3,.3,.3],0xb59b60,[x,6.7,-2]);const flag=new T.Mesh(new T.PlaneGeometry(1.3,2),new T.MeshStandardMaterial({color:0xd3a25b,side:T.DoubleSide,roughness:1}));flag.position.set(x+.65,5.2,-2);scene.add(flag);}
const dieGroup=new T.Group();dieGroup.position.set(-1,2.35,-1);scene.add(dieGroup);box(dieGroup,'ivory_die',[3.5,3.5,3.5],0xf5e5c4,[0,0,0],.20);
const pipGeo=new T.CylinderGeometry(.19,.19,.028,24),pipMat=new T.MeshStandardMaterial({color:0x213b43,roughness:.8});
for(const v of[-.85,0,.85]){const top=new T.Mesh(pipGeo,pipMat);top.position.set(v,1.76,v);dieGroup.add(top);}
const front=new T.Mesh(pipGeo,pipMat);front.rotation.x=Math.PI/2;front.position.set(0,0,1.76);dieGroup.add(front);
for(const v of[-.65,.65]){const side=new T.Mesh(pipGeo,pipMat);side.rotation.z=Math.PI/2;side.position.set(1.76,v,v);dieGroup.add(side);}
label(scene,'3  /  PEOPLE RISE',[-1,1,2.5],5.2,.85);
// Small brass service cover plants the later latch idea without implementing it.
box(scene,'brass_access',[.65,.28,.06],0xa78a4b,[.8,.7,2.1]);
function actor(id,p,color,scale=1,levitate=0){const a=createBaseAvatar();a.root.name=id;applyAppearance(a,{color:0xdab692,pieces:{torso:color,leftLeg:0x354b52,rightLeg:0x354b52}});applyFace(a,'nervous');a.root.position.set(p[0],levitate,p[1]);a.root.scale.setScalar(scale);scene.add(a.root);return a;}
const leo=actor('leo',[3.7,6.1],0x197f83);leo.root.rotation.y=-.25;const hair=makeFinalHair('soft_textured_crop');leo.pivots.head.add(hair);
// Garment identity: long teal hem, ochre cross-body strap and one notebook.
box(leo.root,'jacket_hem',[2.13,.40,1.06],0x17666c,[0,2.14,0]);const strap=box(leo.root,'satchel_strap',[.15,1.9,.06],0xb6995f,[.06,3,.55],.01);strap.rotation.z=-.42;box(leo.root,'notebook',[.52,.67,.18],0x9b6748,[-.70,2.45,.66]);
const pip=actor('pip',[-4,3.4],0xa9634c,.65,.85);pip.root.rotation.y=.5;pip.pivots.leftShoulder.rotation.z=-.5;
const extras=[actor('baker',[4,-3],0xc49b54,.93,1.1),actor('archivist',[-5,-4],0x597789,1,1.35),actor('resident',[7.5,1],0x87956c,.84,.7)];
for(const[a,i]of extras.map((a,i)=>[a,i])){a.pivots.leftShoulder.rotation.z=-.3-i*.1;a.pivots.rightShoulder.rotation.z=.3+i*.1;a.root.rotation.y=-.4+i*.35;}
// Visible ground projections anchor deliberate levitation; no physics claims.
for(const a of[pip,...extras]){const s=new T.Mesh(new T.CircleGeometry(.65,32),new T.MeshBasicMaterial({color:0x35484a,transparent:true,opacity:.18,depthWrite:false}));s.rotation.x=-Math.PI/2;s.position.set(a.root.position.x,.011,a.root.position.z);scene.add(s);}
const leoFaces=makeLeoFaces();
const camera=new T.PerspectiveCamera(45,720/1280,.1,100);const ids=Object.values(leo.parts).map(m=>m.uuid);
function renderFrame(frame){const close=frame===30;const expression=frame===60?'focus':close?'annoyed':'surprise';if(leo.faceLayer)leo.faceLayer.removeFromParent();leo.faceLayer=leoFaces[expression];leo.pivots.head.add(leo.faceLayer);leo.pivots.head.rotation.set(close?-.03:.02,close?-.18:-.32,0);leo.pivots.rightShoulder.rotation.set(-.1,0,.12);leo.pivots.leftShoulder.rotation.set(0,0,-.08);
if(close){camera.position.set(7.4,5.9,12);camera.lookAt(3.6,3.9,5.8);camera.fov=35;}else{camera.position.set(14,11.8,24);camera.lookAt(.2,3.3,-1);camera.fov=48;}camera.updateProjectionMatrix();renderer.render(scene,camera);return{frame,expression,buffer:[renderer.domElement.width,renderer.domElement.height],webgl:renderer.getContext().getParameter(renderer.getContext().VERSION),identity:ids.every((id,i)=>id===Object.values(leo.parts)[i].uuid),parts:Object.keys(leo.parts).length,extras:4,dieResult:3};}
window.__dice={renderFrame,renderer,leo,scene,camera};renderFrame(0);
