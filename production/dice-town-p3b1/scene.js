import * as T from 'three';import{block,createBaseAvatar}from'../../avatar/baseAvatar.js';import{applyAppearance}from'../../appearance/appearance.js';import{applyFace}from'../../appearance/faces.js';import{makeFinalHair}from'../dice-town/hair.js';import{sample,dieCenter,PIVOT,tip}from'./motion.js';
const scene=new T.Scene();scene.background=new T.Color(0x26383d);const renderer=new T.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});renderer.setPixelRatio(1);renderer.setSize(720,1280);renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.1;document.body.append(renderer.domElement);
scene.add(new T.HemisphereLight(0xb5d9e4,0x665345,1.8));const key=new T.DirectionalLight(0xffdeab,3);key.position.set(-6,12,9);key.castShadow=true;key.shadow.mapSize.set(2048,2048);Object.assign(key.shadow.camera,{left:-9,right:9,top:12,bottom:-8,near:.1,far:40});key.shadow.bias=-.0001;key.shadow.normalBias=.03;scene.add(key);const fill=new T.DirectionalLight(0x94c7d5,1.3);fill.position.set(7,10,-5);scene.add(fill);
const brass=new T.MeshStandardMaterial({color:0xc5a052,metalness:.25,roughness:.48}),iron=new T.MeshStandardMaterial({color:0x344b51,metalness:.25,roughness:.65});
function box(parent,name,size,color,p,r=.04){const m=block(name,size,color,r);m.position.set(...p);parent.add(m);return m;}
function mesh(parent,name,geometry,mat,p){const m=new T.Mesh(geometry,mat);m.name=name;m.position.set(...p);m.castShadow=m.receiveShadow=true;parent.add(m);return m;}
function rod(parent,name,a,b,r,mat){const v=new T.Vector3(...b).sub(new T.Vector3(...a));const m=mesh(parent,name,new T.CylinderGeometry(r,r,v.length(),24),mat,new T.Vector3(...a).add(new T.Vector3(...b)).multiplyScalar(.5).toArray());m.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),v.normalize());return m;}
box(scene,'floor',[18,.3,17],0x7b776a,[0,-.15,1]);box(scene,'rear_wall',[16,9,.4],0x8b8c7a,[0,4.5,-3.6]);box(scene,'left_wall',[.4,9,12],0x6b7775,[-8.5,4.5,1]);box(scene,'skirting',[16,.32,.24],0xaaa28c,[0,.16,-3.3]);
for(const x of[-4,4]){box(scene,'plinth_column',[.8,6.2,1.4],0x9b9784,[x,3.1,-.4]);box(scene,'stone_cap',[1.1,.35,1.8],0xb8ad92,[x,6.05,-.4]);}
for(const x of[-3.9,3.9])box(scene,'support_rail',[.6,.35,7.2],0x455854,[x,6.05,0]);
box(scene,'hatch_rim',[3,.25,.5],0xaca58e,[-2,6.5,-2.6]);rod(scene,'anchor_ring_post',[-3,5.8,-2.6],[-3,6.7,-2.6],.1,iron);
box(scene,'machine_plinth',[3.8,3.6,2],0x696e65,[-1,1.8,-.2]);box(scene,'bearing_mount',[1.5,1.8,.5],0x3e5558,[-1,4.5,-.5]);
const output=new T.Group();output.position.set(...PIVOT);scene.add(output);box(output,'paddle',[3,.24,.9],0xc5a052,[1.5,0,0],.005);rod(output,'output_axle',[0,0,-.6],[0,0,1.29],.19,iron);
const input=new T.Group();input.position.set(...PIVOT);scene.add(input);
function plate(parent,z){const shape=new T.Shape();shape.absarc(0,0,.76,0,Math.PI*2,false);const hole=new T.Path();hole.absarc(.55,0,.12,0,Math.PI*2,true);shape.holes.push(hole);if(parent===input){const bearing=new T.Path();bearing.absarc(0,0,.22,0,Math.PI*2,true);shape.holes.push(bearing);}mesh(parent,'bored_coupling_plate',new T.ExtrudeGeometry(shape,{depth:.16,bevelEnabled:true,bevelSize:.025,bevelThickness:.02,bevelSegments:2,steps:1,curveSegments:32}),brass,[0,0,z]);}
plate(output,.65);plate(input,1.12);rod(input,'crank_arm',[0,0,1.35],[-1.15,0,1.35],.10,brass);rod(input,'crank_grip',[-1.15,0,1.35],[-1.15,0,2.05],.16,iron);
// One durable pin group for both clips and all stills. Shaft passes through real bored plates.
const pin=new T.Group();pin.name='shared_locking_pin';scene.add(pin);rod(pin,'shaft',[0,0,-.45],[0,0,.65],.08,brass);rod(pin,'handle_stem',[0,0,.65],[0,.17,.8],.07,brass);rod(pin,'T_handle',[-.3,.17,.8],[.3,.17,.8],.09,brass);
for(const z of[-2.4,2.4]){box(scene,'cross_header',[8.8,.35,.45],0x455854,[0,6.025,z]);for(const x of[-2.6,2.6])box(scene,'die_support_ledge',[1.5,.35,1.3],0x59665f,[x,6.025,z]);}
const die=new T.Group();scene.add(die);box(die,'canonical_scale_die',[6.3,6.3,6.3],0xf5e5c4,[0,0,0],.23);const pipMat=new T.MeshBasicMaterial({color:0x213b43});for(const y of[-1.4,0,1.4])for(const z of[-1.4,1.4]){const p=mesh(die,'six_pip',new T.CylinderGeometry(.24,.24,.04,20),pipMat,[3.155,y,z]);p.rotation.z=Math.PI/2;}
for(const [x,z]of[[-1.2,-1.2],[1.2,1.2]]){const p=mesh(die,'two_pip',new T.CylinderGeometry(.24,.24,.04,20),pipMat,[x,0,3.155]);p.position.y=z;p.rotation.x=Math.PI/2;}
function character(name,color,scale){const a=createBaseAvatar({torsoVariant:name==='leo'?'tapered':'classic'});a.root.name=name;a.root.scale.setScalar(scale);applyAppearance(a,{color:0xdab692,pieces:{torso:color,leftLeg:0x354b52,rightLeg:0x354b52}});applyFace(a,'worried');scene.add(a.root);return a;}
const leo=character('leo',0x197f83,1),pip=character('pip',0xa9634c,.65);leo.pivots.head.add(makeFinalHair('neat_side_part'));leo.pivots.head.scale.setScalar(1.14);box(leo.root,'jacket_hem',[2.13,.4,1.06],0x17666c,[0,2.14,0]);const strap=box(leo.root,'strap',[.15,1.9,.06],0xb6995f,[.06,3,.66]);strap.rotation.z=-.42;box(leo.root,'notebook',[.52,.67,.18],0x9b6748,[-.7,2.45,.66]);
const step=box(scene,'work_step',[2,1.582,2],0x7e7059,[2,.791,3.63]);
const camera=new T.PerspectiveCamera(40,720/1280,.1,80),v=new T.Vector3();const pinId=pin.uuid,bodyIds=[leo,pip].flatMap(a=>Object.values(a.parts).map(m=>m.uuid));
function render(mode,frame,width=720){renderer.setSize(width,width*16/9);const s=sample(mode,frame);input.rotation.z=s.input;output.rotation.z=s.output;pin.position.set(...s.pin);pin.rotation.z=mode==='mechanism'?s.input:0;die.position.set(...dieCenter(s.phi));die.rotation.z=s.phi;
 const hand=mode==='handoff'||mode==='disabled';leo.root.visible=pip.root.visible=step.visible=hand;
 // Leo supports the front of the shaft; Pip receives the rear. Orthogonal arms keep silhouettes separate.
 leo.root.rotation.y=Math.PI;leo.pivots.leftShoulder.rotation.x=-Math.PI/2;
 const carry=mode==='handoff'?Math.max(0,Math.min(1,(s.time-1.85)/.3)):1;
 const support=new T.Vector3(s.pin[0],4.52,s.pin[2]+.43);leo.root.position.set(support.x-1.51,0,support.z+1.845);leo.root.position.x-=.85*carry;
 pip.root.rotation.y=-Math.PI/2;pip.pivots.leftShoulder.rotation.x=-Math.PI/2;pip.root.position.set(1.99925,1.582,3.6315);
 if(mode==='handoff'&&frame<24){camera.position.set(-.2,6.3,6);camera.lookAt(-.45,4.65,1.5);camera.fov=30;}else if(mode==='handoff'){camera.position.set(.1,6.5,7);camera.lookAt(.2,4.65,2.7);camera.fov=54;}else{camera.position.set(16,12,22);camera.lookAt(0,7,0);camera.fov=38;}
 if(mode==='disabled'){camera.position.set(-12,7.8,18);camera.lookAt(-.4,6.7,0);camera.fov=36;}
 camera.updateProjectionMatrix();scene.updateMatrixWorld(true);renderer.render(scene,camera);
 const leftPalm=new T.Vector3(0,-.85,.5).applyMatrix4(leo.parts.leftArm.matrixWorld); // top support of canonical block arm
 // Top face before root yaw pi is +Z; pi affects only horizontal direction.
 const receiver=new T.Vector3(0,-.85,.5).applyMatrix4(pip.parts.leftArm.matrixWorld);
 const point=new T.Vector3(...tip(s.output));
 return{...s,pinIdentity:pin.uuid===pinId,bodyIdentity:bodyIds.every((id,i)=>id===[leo,pip].flatMap(a=>Object.values(a.parts).map(m=>m.uuid))[i]),pinCount:scene.children.filter(x=>x.name==='shared_locking_pin').length,palm:receiver.toArray(),support:leftPalm.toArray(),paddlePoint:point.toArray()};
}
window.__proof={render,renderer,scene,camera,pin,leo,pip,die};render('mechanism',0);
