// Reference-directed bacon-style hair, authorable once and reusable by ID.
// Our own lofted mesh geometry, not a copied Roblox marketplace model.
// Coordinates are local to blox_story's existing head pivot.
import * as THREE from 'three';

const BASE=0x39251e, DEEP=0x281e1c, COPPER=0xa66a36, AMBER=0xc38a4d;
const MAT=(color)=>new THREE.MeshStandardMaterial({color,roughness:.8,metalness:0,side:THREE.DoubleSide});

function makeLock({name,path,width=.23,depth=.075,color=BASE,tip=.008,highlight=false}){
 const curve=new THREE.CatmullRomCurve3(path.map(p=>new THREE.Vector3(...p)),false,'centripetal',.3);
 const steps=22,segments=8,verts=[],uvs=[],indices=[];
 // Sculpted ribbons: broad, flat profile facing the camera, not cylindrical noodles.
 for(let i=0;i<=steps;i++){
  const t=i/steps,center=curve.getPoint(t),tangent=curve.getTangent(t).normalize();
  const tangentRight=new THREE.Vector3(tangent.y,-tangent.x,0).normalize();
  if(tangentRight.lengthSq()<.05)tangentRight.set(1,0,0);
  const taper=Math.max(tip,Math.pow(Math.sin(Math.PI*(.035+.93*t)),.53)*Math.pow(1-t,.23));
  const w=width*taper;
  for(let j=0;j<=segments;j++){
   const u=2*j/segments-1;
   // Rectangular-ish lens with softly rounded sides and a flatter, wide face.
   const z=depth*Math.sqrt(Math.max(0,1-u*u));
   const p=center.clone().addScaledVector(tangentRight,u*w);
   p.z+=z;
   verts.push(p.x,p.y,p.z);
   uvs.push(j/segments,t);
  }
 }
 for(let i=0;i<steps;i++)for(let j=0;j<segments;j++){
  const a=i*(segments+1)+j,b=a+segments+1;
  indices.push(a,a+1,b,a+1,b+1,b);
 }
 const geo=new THREE.BufferGeometry();
 geo.setAttribute('position',new THREE.Float32BufferAttribute(verts,3));
 geo.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));
 geo.setIndex(indices);geo.computeVertexNormals();
 const mesh=new THREE.Mesh(geo,MAT(color));
 mesh.name=name;mesh.castShadow=true;mesh.receiveShadow=true;
 mesh.userData.baconSurface=true;
 return mesh;
}
function stripe({name,path,width=.12,color=COPPER,lift=.075}){
 // Caramel must be a broad shallow 3D hair mass, not a painted line.
 const raised=path.map(([x,y,z])=>[x,y,z+lift]);
 return makeLock({name,path:raised,width,depth:.038,color,tip:.045});
}
const main=[
 {name:'front_sweep_upper',color:BASE,width:.25,depth:.087,path:[[-.66,1.32,.05],[-.43,1.40,.34],[-.09,1.36,.51],[.35,1.19,.55],[.66,.98,.53]]},
 {name:'front_sweep_middle',color:DEEP,width:.22,depth:.084,path:[[-.65,1.20,.20],[-.36,1.26,.43],[.04,1.17,.59],[.45,.94,.62],[.63,.83,.58]]},
 {name:'fringe_left',color:BASE,width:.245,depth:.105,path:[[-.42,1.36,.24],[-.52,1.23,.51],[-.35,.94,.66],[-.09,.83,.61]]},
 {name:'fringe_right',color:BASE,width:.22,depth:.09,path:[[.22,1.39,.17],[.41,1.25,.44],[.58,1.01,.62],[.71,.80,.54]]},
 {name:'side_left_wave',color:DEEP,width:.23,depth:.11,path:[[-.56,1.28,-.21],[-.74,1.12,-.12],[-.78,.87,.17],[-.73,.66,.26],[-.59,.52,.22]]},
 {name:'side_right_wave',color:BASE,width:.245,depth:.11,path:[[.50,1.30,-.19],[.75,1.17,-.04],[.82,.90,.18],[.77,.72,.21],[.65,.55,.11]]},
 {name:'backleft_wave',color:BASE,width:.33,depth:.09,path:[[-.50,1.32,-.29],[-.66,1.12,-.53],[-.72,.89,-.58],[-.58,.61,-.58]]},
 {name:'backright_wave',color:DEEP,width:.30,depth:.09,path:[[.50,1.31,-.28],[.70,1.09,-.51],[.67,.78,-.59],[.53,.57,-.56]]},
 {name:'back_middle',color:BASE,width:.35,depth:.07,path:[[0,1.39,-.45],[.05,1.13,-.64],[0,.88,-.68],[-.11,.61,-.63]]}
];
const bands=[
 {name:'signature_caramel_top',path:[[-.56,1.38,.18],[-.30,1.44,.39],[.04,1.39,.55],[.39,1.23,.59],[.58,1.05,.56]],width:.145,color:AMBER,lift:.095},
 {name:'signature_copper_middle',path:[[-.56,1.24,.28],[-.27,1.29,.49],[.10,1.18,.65],[.42,.98,.69],[.55,.87,.64]],width:.120,color:COPPER,lift:.082},
 {name:'left_caramel_flick',path:[[-.46,1.31,.31],[-.50,1.22,.55],[-.34,1.06,.69],[-.18,.96,.66]],width:.102,color:COPPER,lift:.109},
 {name:'right_amber_flick',path:[[.26,1.37,.24],[.45,1.25,.48],[.59,1.10,.65],[.69,.94,.59]],width:.097,color:AMBER,lift:.101},
 {name:'left_warm_side',path:[[-.66,1.16,-.05],[-.77,.98,.16],[-.71,.77,.32],[-.63,.60,.24]],width:.095,color:COPPER,lift:.115},
 {name:'right_warm_side',path:[[.61,1.23,-.06],[.79,1.08,.18],[.79,.82,.28],[.66,.62,.18]],width:.098,color:COPPER,lift:.104}
];
export function makeBaconHair(){
 const root=new THREE.Group();root.name='hair_bacon';root.userData.attachment='HairAttachment';
 const cap=new THREE.Mesh(new THREE.SphereGeometry(1,24,14),MAT(DEEP));
 cap.name='bacon_sculpted_underlay';cap.position.set(0,1.16,-.025);cap.scale.set(.705,.29,.61);cap.castShadow=true;root.add(cap);
 for(const spec of main)root.add(makeLock(spec));
 for(const band of bands)root.add(stripe(band));
 root.userData.colorLocked=true; // Preserve signature dark-brown/caramel alternating colors.
 return root;
}
