// Four restrained original hairstyles for blocky cinematic characters.
// All coordinates are relative to the existing head pivot; no new character rig.
import * as THREE from 'three';

export const FINAL_HAIR_STYLES=Object.freeze([
 'neat_side_part','soft_textured_crop','low_bun','shoulder_length'
]);

function mesh(name,geometry,tone=1){
 const m=new THREE.Mesh(geometry,new THREE.MeshStandardMaterial({color:0x563b2c,roughness:.88,metalness:0}));
 m.name=name;m.castShadow=true;m.receiveShadow=true;
 m.userData.tint=true;m.userData.toneMultiplier=tone;
 return m;
}
function ellipsoid(name,at,scale,tone=1){
 const m=mesh(name,new THREE.SphereGeometry(1,22,12),tone);
 m.position.set(...at);m.scale.set(...scale);
 return m;
}
// A flattened, softly squared 3D clump that follows the scalp without long tube-like strands.
// Closed surfaces, limited subdivisions; strand silhouette, not fine-strand simulation.
function clump(name,points,{width=.23,depth=.11,face=[0,0,1],tip=.18,tone=1}={}){
 const curve=new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p)),false,'centripetal',.3);
 const normal=new THREE.Vector3(...face).normalize(),N=14,R=8,positions=[],indices=[];
 for(let i=0;i<=N;i++){
  const t=i/N,center=curve.getPoint(t),tangent=curve.getTangent(t).normalize();
  let across=new THREE.Vector3().crossVectors(tangent,normal);
  if(across.lengthSq()<.05)across.set(1,0,0);
  across.normalize();
  const thick=new THREE.Vector3().crossVectors(tangent,across).normalize();
  const envelope=(.78+.22*Math.sin(Math.PI*t))*(1-(1-tip)*Math.pow(t,2.5));
  const w=width*envelope,d=depth*(.85+.15*Math.sin(Math.PI*t));
  for(let j=0;j<R;j++){
   const a=2*Math.PI*j/R;
   // Slightly flattened cross-section, tapering the width more than thickness.
   const x=Math.cos(a)*w, y=Math.sin(a)*d;
   const p=center.clone().addScaledVector(across,x).addScaledVector(thick,y);
   positions.push(p.x,p.y,p.z);
  }
 }
 for(let i=0;i<N;i++)for(let j=0;j<R;j++){
  const a=i*R+j,b=i*R+(j+1)%R,c=a+R,d=b+R;
  indices.push(a,b,c,b,d,c);
 }
 for(const end of [0,N]){
  const center=curve.getPoint(end/N),idx=positions.length/3;
  positions.push(center.x,center.y,center.z);
  for(let j=0;j<R;j++){
   const a=end*R+j,b=end*R+(j+1)%R;
   if(end===0)indices.push(idx,b,a);else indices.push(idx,a,b);
  }
 }
 const g=new THREE.BufferGeometry();
 g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
 g.setIndex(indices);g.computeVertexNormals();g.computeBoundingSphere();
 return mesh(name,g,tone);
}
function addCap(group,{height=.28,back=.01,scaleX=.707,scaleZ=.604}={}){
 group.add(ellipsoid('fitted_crown',[0,1.151,back],[scaleX,height,scaleZ],.94));
}
// Small side panels are a controlled silhouette, not random hair tufts.
function shortSides(g,length=.29){
 for(const s of [-1,1])g.add(
  clump(s<0?'left_temple':'right_temple',
   [[s*.53,1.23,-.07],[s*.674,1.06,-.03],[s*.68,.91,-.045],[s*.645,.88-length*.30,-.08]],
   {width:.13,depth:.14,face:[s,0,.15],tip:.65,tone:.87})
 );
 g.add(clump('short_nape',[[0,1.19,-.46],[.04,1.02,-.64],[.01,.90,-.64]],{width:.45,depth:.105,face:[0,0,-1],tip:.78,tone:.84}));
}
function neatSidePart(g){
 addCap(g,{height:.258});shortSides(g,.20);
 // Clean side-part diagonal; the brow and eyes remain fully visible.
 g.add(clump('main_sweep',[[-.39,1.355,.26],[-.12,1.337,.43],[.25,1.185,.55],[.49,1.069,.545]],{width:.252,depth:.113,tip:.34,tone:1.03}));
 g.add(clump('short_fringe',[[-.51,1.33,.07],[-.58,1.195,.31],[-.37,1.080,.52],[-.24,1.035,.535]],{width:.165,depth:.112,tip:.43,tone:.95}));
 g.add(clump('part_edge',[[.29,1.36,.05],[.47,1.273,.34],[.60,1.131,.47]],{width:.193,depth:.108,tip:.42,tone:.91}));
}
function softTexturedCrop(g){
 addCap(g,{height:.265});shortSides(g,.15);
 // Three low-height, non-spiky overlapping tufts, with slightly uneven ends.
 g.add(clump('left_crop',[[-.49,1.318,.12],[-.42,1.258,.43],[-.29,1.081,.542]],{width:.208,depth:.107,tip:.55,tone:1.03}));
 g.add(clump('center_crop',[[-.20,1.39,.13],[-.02,1.284,.43],[.09,1.101,.567]],{width:.224,depth:.102,tip:.49,tone:.98}));
 g.add(clump('right_crop',[[.28,1.369,.12],[.43,1.244,.39],[.49,1.113,.516]],{width:.220,depth:.106,tip:.51,tone:.89}));
 g.add(clump('crown_texture',[[.10,1.431,-.24],[.22,1.410,.06],[.43,1.322,.29]],{width:.215,depth:.090,tip:.55,tone:1.08}));
}
function lowBun(g){
 addCap(g,{height:.267,back:-.023});
 // Swept-back surface arcs join the bun rather than floating beside the head.
 for(const s of [-1,1]){
  g.add(clump(s<0?'left_swept_root':'right_swept_root',
   [[s*.16,1.378,.30],[s*.47,1.263,.36],[s*.683,1.043,.015],[s*.515,.868,-.44]],
   {width:.210,depth:.108,face:[s*.5,0,.85],tip:.63,tone:s<0?.98:.91}));
  g.add(clump(s<0?'left_clean_temples':'right_clean_temples',
   [[s*.58,1.22,.05],[s*.704,1.00,.02],[s*.635,.836,-.30]],
   {width:.134,depth:.109,face:[s,0,.1],tip:.71,tone:.90}));
 }
 // Small low bun with a merged visual connection and one deliberately subtle overlap.
 g.add(ellipsoid('bun_nape_connector',[0,.822,-.578],[.30,.205,.20],.88));
 g.add(ellipsoid('low_bun_main',[0,.754,-.755],[.385,.305,.285],.98));
 g.add(clump('bun_soft_fold',[[.05,1.055,-.80],[.31,.875,-.96],[.28,.686,-.984]],
  {width:.157,depth:.065,face:[0,0,-1],tip:.67,tone:1.04}));
}
function shoulderLength(g){
 addCap(g,{height:.263,back:-.02});
 // Lob: weighted side curtains, slightly inward-curved ends; avoids paper-thin hair.
 for(const s of [-1,1]){
  g.add(clump(s<0?'left_parting':'right_parting',
   [[s*.12,1.386,.25],[s*.44,1.302,.42],[s*.630,1.122,.37]],
   {width:.241,depth:.121,tip:.71,tone:s<0?1.05:.96}));
  g.add(clump(s<0?'left_face_frame':'right_face_frame',
   [[s*.536,1.266,.10],[s*.690,1.034,.22],[s*.714,.590,.22],[s*.729,.171,.18],[s*.684,-.184,.125]],
   {width:.259,depth:.178,face:[s*.5,0,.85],tip:.63,tone:s<0?.95:1.02}));
  g.add(clump(s<0?'left_back_lobe':'right_back_lobe',
   [[s*.48,1.247,-.31],[s*.633,.954,-.50],[s*.647,.388,-.58],[s*.594,-.165,-.60]],
   {width:.292,depth:.161,face:[s*.35,0,-1],tip:.76,tone:.88}));
 }
 g.add(clump('center_back_layer',[[0,1.261,-.42],[0,1.004,-.642],[.03,.470,-.690],[0,-.162,-.642]],
  {width:.422,depth:.134,face:[0,0,-1],tip:.82,tone:.92}));
}
export function makeFinalHair(id){
 if(!FINAL_HAIR_STYLES.includes(id))throw new Error('Unknown final hairstyle: '+id);
 const g=new THREE.Group();g.name='hair_'+id;g.userData.attachment='HairAttachment';
 if(id==='neat_side_part')neatSidePart(g);
 else if(id==='soft_textured_crop')softTexturedCrop(g);
 else if(id==='low_bun')lowBun(g);
 else shoulderLength(g);
 return g;
}
