// S7 opt-in environment kit: authored camera-visible layers, no new animation engine.
// Keep production S6 default untouched; all changes are driven by absolute frame state.
import * as THREE from 'three';
import {box} from './assets/box.js';

const NIGHT=Object.freeze({
 street:0x4d4b48,path_stone:0x77766d,home_wall:0x636a69,
 s1_sidewalk_edge:0x74786e,s4_neighbor_step:0x686c66,building:0x40545b,
 occupied_house:0x4a5753,roof_edge:0x344851,roof_cap:0x394851,
 home_door:0x4f4a41,home_lintel:0x8a816f,window_sill:0x968c78,
 window_recess:0x263941,door_trim:0x898c80,door_trim_header:0x908c80,
 stoop:0x817d72,step:0x74746e,porch_post:0x77827d,
 canopy:0x3b4e54,s1_home_window:0x927456
});
const DAWN=Object.freeze({
 street:0x80766d,path_stone:0xb2a797,home_wall:0xaaa18c,
 s1_sidewalk_edge:0xa29b8e,s4_neighbor_step:0x8c9081,building:0x847d72,
 occupied_house:0x9b9082,roof_edge:0x72716d,roof_cap:0x73736e,
 home_door:0x625c4c,home_lintel:0xb2a58c,window_sill:0xc5b79e,
 window_recess:0x53616a,door_trim:0xb9af9d,door_trim_header:0xbdb1a1,
 stoop:0xb0a493,step:0xa59a8d,porch_post:0xaaa18d,
 canopy:0x827b70,s1_home_window:0xc49b74
});
const skyTopNight=new THREE.Color(0x14273b),skyHorizonNight=new THREE.Color(0x344354);
const skyTopDawn=new THREE.Color(0x88abbc),skyHorizonDawn=new THREE.Color(0xf0b79a);
const fogNight=new THREE.Color(0x293d48),fogDawn=new THREE.Color(0xd6ab94);
const cloudNight=new THREE.Color(0x506579),cloudDawn=new THREE.Color(0xf0c5ae);
const grassNight=new THREE.Color(0x435748),grassDawn=new THREE.Color(0x87916c);
function flat(parent,name,size,color,pos,opacity=1){
 const m=box(parent,name,size,color,pos,.015);
 m.castShadow=false;m.receiveShadow=false;
 m.material.roughness=.98;
 if(opacity<1){m.material.transparent=true;m.material.opacity=opacity;m.material.depthWrite=false;}
 return m;
}
function tree(group,id,x,z,r=.8){
 const t=new THREE.Group();t.name='s7_tree_'+id;t.position.set(x,0,z);group.add(t);
 flat(t,'trunk',[.29,2.75,.29],0x665444,[0,1.375,0]);
 // Three low-poly masses; an economical silhouette, not randomly generated geometry.
 for(const [dx,y,dz,size] of [[0,3.48,0,1.20],[-.57,3.04,.12,.82],[.48,3.21,-.16,.88]]){
  const mesh=new THREE.Mesh(new THREE.IcosahedronGeometry(size,1),
   new THREE.MeshStandardMaterial({color:0x587257,roughness:1,flatShading:true}));
  mesh.name='foliage';mesh.position.set(dx,y,dz);mesh.castShadow=false;mesh.receiveShadow=false;
  t.add(mesh);
 }
 return t;
}
function sceneDressing(group){
 const extra=new THREE.Group();extra.name='s7_environment_detail';group.add(extra);
 // Road edge, one muted olive roadside strip and occasional paving seams.
 flat(extra,'verge_left',[1.02,.019,18],0x435748,[-6.05,.015,.5]);
 flat(extra,'verge_right',[.74,.019,14],0x435748,[8.70,.015,-1.0]);
 for(const [x,z,w] of [[-2.15,2.6,4.65],[-.3,6.55,5.10],[1.5,9.1,5.30],[-1.8,-2,4.4]]){
  flat(extra,'paving_joint',[w,.009,.055],0x6f6e67,[x,.017,z]);
 }
 // A subdued house base, slight architectural depth; no random window clutter.
 flat(extra,'home_base_trim',[9.25,.23,.14],0x89887d,[3.35,.14,-5.62]);
 flat(extra,'home_top_edge',[9.72,.17,.56],0x6b6b64,[3.35,7.36,-5.81]);
 for(const [x,z] of [[-1.77,-5.50],[7.69,-5.50]]){
  flat(extra,'house_corner',[.19,5.9,.29],0x7b7c73,[x,3.1,z]);
 }
 // Street and foreground depth: tree silhouettes kept outside hero action lanes.
 const trees=new THREE.Group();trees.name='s7_trees';extra.add(trees);
 tree(trees,'a',-10.9,5.1,.9);
 tree(trees,'b',10.8,-10,.78);
 // One near-home low planter; avoids placing foliage directly in the reunion path.
 const planter=new THREE.Group();planter.name='home_planter';planter.position.set(7.9,0,-4.1);extra.add(planter);
 flat(planter,'pot',[.65,.50,.64],0x827363,[0,.25,0]);
 const leaves=new THREE.Mesh(new THREE.IcosahedronGeometry(.58,1),new THREE.MeshStandardMaterial({color:0x5f7555,roughness:1,flatShading:true}));
 leaves.name='shrub';leaves.position.set(0,.91,0);leaves.castShadow=false;planter.add(leaves);
 // Three sparse world-fixed clumps; one shared low-detail geometry/material.
 const clouds=new THREE.Group();clouds.name='s7_clouds';extra.add(clouds);
 const cloudGeometry=new THREE.SphereGeometry(1,12,8);
 const cloudMaterial=new THREE.MeshBasicMaterial({color:0x506579,transparent:true,opacity:.10,depthWrite:false,fog:false});
 for(const [x,y,z,w] of [[-12,11,-26,2.8],[8,15.5,-28,2.4],[24,14,-6,2.6]]){
  const clump=new THREE.Group();clump.name='horizon_cloud';clump.position.set(x,y,z);clump.scale.setScalar(w);clouds.add(clump);
  for(const [dx,dy,sx,sy,sz] of [[-.55,0,.8,.30,.48],[0,.12,1,.43,.6],[.65,-.04,.7,.28,.45]]){
   const mesh=new THREE.Mesh(cloudGeometry,cloudMaterial);mesh.position.set(dx,dy,0);mesh.scale.set(sx,sy,sz);clump.add(mesh);
  }
 }
 return {extra,trees,clouds,cloudMaterial};
}
function skyGradient(scene){
 const radius=46,geom=new THREE.SphereGeometry(radius,24,14);
 const a=geom.getAttribute('position'),colors=new Float32Array(a.count*3);
 geom.setAttribute('color',new THREE.BufferAttribute(colors,3));
 const mesh=new THREE.Mesh(geom,new THREE.MeshBasicMaterial({
  vertexColors:true,side:THREE.BackSide,depthTest:false,depthWrite:false,fog:false,toneMapped:false
 }));
 mesh.name='s7_sky_gradient';mesh.renderOrder=-1000;mesh.frustumCulled=false;scene.add(mesh);
 return {mesh,a,colors};
}
export function createS7Environment(scene,world){
 const courtyard=world?.courtyard;
 if(!courtyard)return {enabled:false,apply(){}};
 const group=courtyard.group;
 const visuals=sceneDressing(group);
 const sky=skyGradient(scene);
 const colored=new Map(),c1=new THREE.Color(),c2=new THREE.Color();
 group.traverse(o=>{
  if(!o.isMesh||!o.material?.isMeshStandardMaterial)return;
  if(Object.hasOwn(NIGHT,o.name))colored.set(o,[new THREE.Color(NIGHT[o.name]),new THREE.Color(DAWN[o.name])]);
 });
 const nightColors={verge_left:0x435748,verge_right:0x435748,paving_joint:0x68665f,
  home_base_trim:0x686860,home_top_edge:0x555951,house_corner:0x626960};
 const dayColors={verge_left:0x82916c,verge_right:0x82916c,paving_joint:0x938b7e,
  home_base_trim:0xb2a895,home_top_edge:0x928879,house_corner:0xaaa390};
 visuals.extra.traverse(o=>{
  if(o.isMesh&&Object.hasOwn(nightColors,o.name))colored.set(o,[new THREE.Color(nightColors[o.name]),new THREE.Color(dayColors[o.name])]);
 });
 const treeMeshes=[],treeDay=new THREE.Color(0x779369),treeNight=new THREE.Color(0x405e4a);
 visuals.trees.traverse(o=>{if(o.name==='foliage')treeMeshes.push(o)});
 let latest=NaN,applied=0;
 return {enabled:true,group:visuals.extra,apply(state,camera){
  // All values are assigned from sampled state; reverse/cold seeking is repeatable.
  const outdoor=group.visible;
  sky.mesh.visible=outdoor;
  if(!outdoor)return;
  const dawn=THREE.MathUtils.clamp(state.ending?.sunrise??0,0,1);
  for(const [m,[n,d]] of colored)m.material.color.copy(n).lerp(d,dawn);
  for(const m of treeMeshes)m.material.color.copy(treeNight).lerp(treeDay,dawn);
  visuals.cloudMaterial.color.copy(cloudNight).lerp(cloudDawn,dawn);
  visuals.cloudMaterial.opacity=.10+.14*dawn;
  if(scene.fog){
   scene.fog.color.copy(fogNight).lerp(fogDawn,dawn);
   scene.fog.density=.008-(.001*dawn);
  }
  courtyard.sky.groundColor.copy(grassNight).lerp(grassDawn,dawn);
  scene.background.copy(skyHorizonNight).lerp(skyHorizonDawn,dawn);
  sky.mesh.position.copy(camera.position);
  const g=sky.mesh.geometry,attr=g.getAttribute('color');
  // Color top and horizon independently, blending across a short sunset period.
  const top=c1.copy(skyTopNight).lerp(skyTopDawn,dawn);
  const lower=c2.copy(skyHorizonNight).lerp(skyHorizonDawn,dawn);
  for(let i=0;i<sky.a.count;i++){
   const t=THREE.MathUtils.smoothstep(sky.a.getY(i)/46,-.45,.52);
   const v=lower.clone().lerp(top,t);
   attr.setXYZ(i,v.r,v.g,v.b);
  }
  attr.needsUpdate=true;
  latest=dawn;applied++;
 },status(){return {changedMaterials:colored.size,draws:applied,lastDawn:latest}}};
}
