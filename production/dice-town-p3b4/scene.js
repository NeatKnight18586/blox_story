import * as T from 'three';
import {block} from '../../avatar/baseAvatar.js';
import {applyFace} from '../../appearance/faces.js';
window.__shotListInput=await(await fetch('../dice-town-p2a/sequence.json')).json();
window.__shotListInput.width=720;window.__shotListInput.height=1280;
await import('../dice-town-animatic/scene.js');
const {scene,camera,leo,extras,renderFrame}=window.__dice,renderer=window.__production.renderer;
const original=[...scene.children],originalVisibility=new Map(original.map(o=>[o,o.visible]));
const die=scene.getObjectByName('ivory_die').parent,pip=scene.getObjectByName('pip');
const floor=scene.getObjectByName('plaza_foundation');
const plaza=new T.Group();plaza.name='grounded_plaza_extension';scene.add(plaza);
const gate=new T.Group();gate.name='grounded_gate_setup';scene.add(gate);
function box(parent,name,size,color,p,r=.04){const m=block(name,size,color,r);m.position.set(...p);parent.add(m);return m;}
function road(parent,x,z,width,length){box(parent,'continuous_road',[width,.04,length],0xb6ad96,[x,.005,z],.01);for(const sign of[-1,1])box(parent,'road_stone_edge',[.20,.08,length],0x999385,[x+sign*(width/2+.15),.025,z],.01);}
// Shallow existing roof/stucco vocabulary, no interior or hidden street grid.
function facade(parent,id,x,z,w,h,color){const g=new T.Group();g.name=id;g.position.set(x,0,z);parent.add(g);box(g,'stucco_return',[w,h,2.4],color,[0,h/2,0]);box(g,'stone_base',[w+.12,.4,2.5],0x999385,[0,.2,0]);box(g,'cornice',[w+.2,.22,2.6],0xead5ae,[0,h,0]);const sh=new T.Shape();sh.moveTo(-w/2-.2,0);sh.lineTo(0,1.3);sh.lineTo(w/2+.2,0);sh.closePath();const roof=new T.Mesh(new T.ExtrudeGeometry(sh,{depth:2.7,bevelEnabled:false}),new T.MeshStandardMaterial({color:0x8f4f39,roughness:1}));roof.name='shallow_roof';roof.position.set(0,h+.1,-1.35);roof.castShadow=true;g.add(roof);for(const dx of[-w*.25,w*.25]){box(g,'window_frame',[.92,1.5,.12],0xe1cfac,[dx,h*.62,1.28]);box(g,'window_glass',[.70,1.25,.08],0x284d58,[dx,h*.62,1.37]);}return g;}
box(plaza,'continuous_town_ground',[140,.25,160],0x999281,[0,-.125,-30]);
road(plaza,-6,-32,4.6,65);
facade(plaza,'street_left_return',-11,-26,5.4,7.2,0xb8c2b0);
facade(plaza,'street_right_return',-1.7,-31,4.5,6.6,0xc7ac83);
// Sparse perspective seams tie the dais to surrounding town paving.
for(const z of[5,10,16])box(plaza,'paving_joint',[38,.009,.045],0x898575,[0,-.023,z],.002);
const paving=original.filter(o=>o.geometry?.type==='CylinderGeometry'&&Math.abs(o.position.x+1)<.01&&Math.abs(o.position.z+1)<.01);
const flatPaving=new T.Mesh(new T.CylinderGeometry(8.3,8.3,.045,64),new T.MeshStandardMaterial({color:0xb6ad96,roughness:1}));flatPaving.name='inset_radial_paving';flatPaving.position.set(-1,-.0025,-1);flatPaving.receiveShadow=true;plaza.add(flatPaving);
const diePips=die.children.filter(m=>m.isMesh&&m!==die.children[0]),five=new T.Group();five.name='fifth_result';die.add(five);
const template=diePips[0];for(const [x,z]of[[-2.2,-2.2],[-2.2,2.2],[2.2,-2.2],[2.2,2.2],[0,0]]){const m=new T.Mesh(template.geometry,template.material);m.position.set(x,4.51,z);five.add(m);}
// Setup G is a second camera-bounded footprint. The same road colors and cream
// doorway/green home identity provide continuity; no connected explorable city.
box(gate,'continuous_gate_land',[140,.25,160],0x999281,[0,-.125,-30]);road(gate,0,-30,5.4,95);
for(const sign of[-1,1]){box(gate,'gate_wall_return',[16,6.3,.6],0xb7a187,[sign*11.6,3.15,0]);box(gate,'gate_wall_cap',[16.2,.22,.8],0xddd0ae,[sign*11.6,6.35,0]);box(gate,'gate_post',[.65,7,.8],0xa3957b,[sign*3.3,3.5,0]);box(gate,'post_cap',[.95,.25,1],0xddd0ae,[sign*3.3,7.1,0]);}
box(gate,'gate_threshold',[6,.08,1.2],0xb7ab90,[0,.04,0]);
const leaves=[];for(const sign of[-1,1]){const hinge=new T.Group();hinge.name=sign<0?'left_gate_hinge':'right_gate_hinge';hinge.position.set(sign*3,0,0);gate.add(hinge);box(hinge,'gate_leaf',[3,4.9,.22],0x385a5b,[-sign*1.5,2.55,0]);for(const y of[.65,4.3])box(hinge,'leaf_brass_band',[3,.14,.06],0xb59b60,[-sign*1.5,y,.15],.01);box(hinge,'hinge_plate',[.15,4,.15],0x59655a,[0,2.5,.05],.01);leaves.push({hinge,sign});}
facade(gate,'outside_left',-7.5,-12,5.5,7.3,0xba795e);facade(gate,'outside_right',7,-16,5.8,8.3,0xc7ac83);
const home=facade(gate,'destination_home',0,-25,8,7,0x85958d);
// Match D35 entrance proportions/materials; just a destination facade, no kitchen.
for(const x of[-2.45,2.45])box(home,'home_cream_jamb',[.28,6.5,.28],0xd6c19a,[x,3.25,1.42]);
box(home,'home_lintel',[5.18,.35,.28],0xd6c19a,[0,6.6,1.42]);box(home,'home_door',[4.6,6.35,.12],0x355956,[0,3.175,1.42]);box(home,'home_threshold',[4.9,.08,.6],0xb7ab90,[0,.04,1.5]);
// A shallow pair behind the route supports the existing sky horizon, no back wall.
facade(gate,'far_left',-12,-43,7,9,0x9eada4);facade(gate,'far_right',12,-48,8,10,0x9eada4);
const cases={D01:{source:'D01',k:0,family:'A',camera:{position:[10,11,27],target:[-2,4.5,-2],fov:57}},D28:{source:'D28',k:0,family:'A',camera:{position:[8,10,21],target:[-1,4.6,-3],fov:54}},closed:{source:'D33',k:0,family:'G'},open:{source:'D33',k:1,family:'G'},D38:{source:'D38',k:1,family:'G'}};
const gateCamera={position:[4,7.5,23],target:[0,3.2,-6],fov:52};
function render(id,improved=true,width=720){const c=cases[id];if(!c)throw Error('Unknown grounding still');renderer.setSize(width,width*16/9);camera.aspect=9/16;plaza.visible=gate.visible=false;
 if(!improved){for(const o of original)if(o.name==='radial_joint')o.position.y=.006;for(const o of original)o.visible=originalVisibility.get(o);floor.visible=true;for(const p of paving)p.visible=true;five.visible=false;const state=window.__board.render(c.source,c.k);return{id,improved,source:state,camera:{position:camera.position.toArray(),target:null,fov:camera.fov}};}
 // Reset all inherited pose/visibility state; this extension creates no motion.
 renderFrame(c.family==='A'?55:104);applyFace(leo,'relieved');for(const o of scene.children)if(o.name.startsWith('storyboard_'))o.visible=false;
 for(const o of original)if(o.isLight||['visible_sun','sun_glow','cloud_clump','distant_roofline'].includes(o.name))o.visible=true;
 // Hide the animatic's dynamic top-pip group and any explanatory proxy cards.
 for(const o of original)if(o.type==='Group'&&!o.name&&o!==die&&o.children.some(m=>m.geometry===template.geometry))o.visible=false;
 if(c.family==='A'){
  plaza.visible=true;gate.visible=false;
  for(const o of original)if(!o.isLight&&!['visible_sun','sun_glow','cloud_clump','distant_roofline'].includes(o.name))o.visible=originalVisibility.get(o);
  for(const o of original)if(o.type==='Group'&&!o.name&&o!==die&&o.children.some(m=>m.geometry===template.geometry))o.visible=false;
  floor.visible=false;for(const p of paving)p.visible=false;
  for(const o of original)if(o.name==='radial_joint')o.position.y=.024;
  die.visible=true;die.position.y-=.34;die.rotation.set(0,0,0);diePips.forEach((m,i)=>m.visible=id==='D01'||i>=3);five.visible=id==='D28';
  leo.root.visible=true;leo.root.position.set(id==='D28'?4:4.8,0,4);leo.root.rotation.y=.35;
  extras.forEach((a,i)=>{a.root.visible=id==='D01'&&i===0;a.root.position.x=[-8.8,5.5,6][i];a.root.position.z=[-1,-4,6][i];});pip.visible=false;
  // Board belongs to the three rule demonstration, not the sixth sunrise.
  original.filter(o=>o.geometry?.type==='PlaneGeometry').forEach(o=>{if(o.position.y===1.12)o.visible=id==='D01';});
  camera.position.set(...c.camera.position);camera.lookAt(...c.camera.target);camera.fov=c.camera.fov;
 }else{
  for(const o of original)if(!o.isLight&&!['visible_sun','sun_glow','cloud_clump','distant_roofline'].includes(o.name))o.visible=false;
  gate.visible=true;leaves.forEach(({hinge,sign})=>hinge.rotation.y=id==='closed'?0:-sign*1.24);
  leo.root.visible=id==='D38';leo.root.position.set(-.7,0,4.5);leo.root.rotation.y=.25;
  pip.visible=false;
  camera.position.set(...gateCamera.position);camera.lookAt(...gateCamera.target);camera.fov=gateCamera.fov;
 }
 camera.updateProjectionMatrix();scene.updateMatrixWorld(true);renderer.render(scene,camera);return{id,improved,family:c.family,result:c.family==='A'?(id==='D01'?3:5):null,dieSize:6.3,camera:{position:camera.position.toArray(),target:(c.camera??gateCamera).target,fov:camera.fov},open:c.family==='G'&&id!=='closed'};
}
window.__grounding={render,scene,camera,renderer,cases,gateCamera,plaza,gate,die,leo,extras,pip,leaves,home};render('D01',false);
