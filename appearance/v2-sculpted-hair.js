import * as THREE from 'three';

// Reference-guided original 3D hair studies: solid, tapered curved mesh locks.
export const SCULPTED_HAIR_STYLES=Object.freeze(['sculpt_swept','sculpt_shag','sculpt_bob','sculpt_long']);
function lock(name,path,width,depth){
 const points=path.map(p=>new THREE.Vector3(...p)),curve=new THREE.CatmullRomCurve3(points,false,'centripetal',.35);
 const positions=[],indices=[],N=18,R=10,axis=new THREE.Vector3(0,0,1);
 for(let i=0;i<=N;i++){
  const t=i/N,center=curve.getPoint(t),tangent=curve.getTangent(t).normalize();
  const side=new THREE.Vector3().crossVectors(tangent,axis).normalize();
  if(side.lengthSq()<.01)side.set(1,0,0);
  const thick=new THREE.Vector3().crossVectors(tangent,side).normalize();
  const w=Math.max(.007,width*(.83+.17*Math.sin(Math.PI*t))*Math.pow(Math.max(.003,1-t),.48));
  const d=Math.max(.005,depth*(.85+.15*Math.sin(Math.PI*t))*Math.pow(Math.max(.01,1-t),.20));
  for(let j=0;j<R;j++){
   const a=j*2*Math.PI/R,p=center.clone().addScaledVector(side,Math.cos(a)*w).addScaledVector(thick,Math.sin(a)*d);
   positions.push(p.x,p.y,p.z);
  }
 }
 for(let i=0;i<N;i++)for(let j=0;j<R;j++){
  const a=i*R+j,b=i*R+(j+1)%R,c=a+R,d=b+R;indices.push(a,b,c,b,d,c);
 }
 for(const end of [0,N]){
  const center=curve.getPoint(end/N),idx=positions.length/3;positions.push(center.x,center.y,center.z);
  for(let j=0;j<R;j++){const a=end*R+j,b=end*R+(j+1)%R;indices.push(...(end===0?[idx,b,a]:[idx,a,b]));}
 }
 const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geo.setIndex(indices);geo.computeVertexNormals();
 const m=new THREE.Mesh(geo,new THREE.MeshStandardMaterial({color:0x483328,roughness:.78}));
 m.name=name;m.userData.tint=true;m.castShadow=true;m.receiveShadow=true;return m;
}
function scalp(dim){
 const m=new THREE.Mesh(new THREE.SphereGeometry(1,24,14),new THREE.MeshStandardMaterial({color:0x483328,roughness:.78}));
 m.name='hair_understructure';m.position.set(0,1.17,-.02);m.scale.set(...dim);m.userData.tint=true;m.castShadow=true;m.receiveShadow=true;return m;
}
const swept={cap:[.73,.32,.62],locks:[
 ['sweep_a',[[-.54,1.32,.19],[-.42,1.41,.39],[.04,1.23,.56],[.43,1.02,.59],[.57,.93,.53]],.32,.15],
 ['sweep_b',[[-.35,1.37,.04],[-.25,1.38,.34],[.17,1.17,.58],[.44,1.00,.62]],.25,.13],
 ['sweep_c',[[.13,1.39,.04],[.38,1.28,.31],[.58,1.10,.48],[.64,.91,.43]],.21,.12],
 ['left_fall',[[-.52,1.31,.03],[-.68,1.12,.27],[-.71,.85,.31],[-.68,.70,.26]],.23,.15],
 ['right_fall',[[.54,1.36,-.03],[.74,1.10,.19],[.72,.78,.19],[.69,.66,.14]],.22,.14],
 ['back_left',[[-.47,1.29,-.22],[-.69,1.07,-.45],[-.65,.76,-.51]],.27,.18],
 ['back_right',[[.46,1.31,-.25],[.72,1.02,-.42],[.68,.74,-.44]],.28,.18]
]};
const shag={cap:[.76,.36,.66],locks:[
 ['center_fringe',[[-.22,1.45,.09],[-.16,1.38,.39],[-.31,1.09,.64],[-.24,.94,.63]],.28,.16],
 ['left_fringe',[[-.52,1.37,.13],[-.58,1.25,.42],[-.47,1.03,.63],[-.58,.86,.58]],.25,.17],
 ['right_fringe',[[.26,1.39,.13],[.36,1.22,.43],[.30,1.07,.62],[.48,.94,.58]],.31,.16],
 ['swept_tip',[[.16,1.46,-.05],[.46,1.44,.21],[.69,1.23,.33],[.77,1.10,.28]],.25,.18],
 ['left_cheek',[[-.61,1.17,-.09],[-.76,1.00,.18],[-.78,.66,.30],[-.82,.50,.24]],.30,.17],
 ['right_cheek',[[.59,1.18,-.11],[.78,.91,.19],[.79,.65,.26],[.89,.51,.18]],.29,.18],
 ['back_a',[[-.49,1.24,-.34],[-.72,.94,-.56],[-.77,.56,-.59],[-.83,.42,-.53]],.30,.21],
 ['back_b',[[.19,1.37,-.43],[.48,1.02,-.63],[.66,.65,-.58],[.74,.41,-.50]],.34,.20],
 ['back_center',[[0,1.36,-.49],[.05,.98,-.65],[-.06,.58,-.62],[-.16,.42,-.57]],.33,.20]
]};
const bob={cap:[.74,.30,.62],locks:[
 ['part_left',[[-.25,1.40,.02],[-.46,1.31,.35],[-.55,1.10,.58],[-.64,.91,.56]],.27,.17],
 ['part_right',[[.07,1.42,.06],[.30,1.33,.41],[.47,1.14,.56],[.51,.98,.55]],.30,.17],
 ['left_front',[[-.56,1.32,.01],[-.74,1.02,.19],[-.77,.62,.28],[-.66,.23,.24]],.30,.20],
 ['right_front',[[.51,1.33,-.02],[.74,1.05,.23],[.75,.67,.29],[.66,.22,.22]],.29,.20],
 ['left_side',[[-.61,1.24,-.35],[-.80,.94,-.41],[-.78,.51,-.42],[-.64,.15,-.41]],.31,.21],
 ['right_side',[[.55,1.22,-.31],[.79,.92,-.40],[.78,.54,-.43],[.58,.16,-.42]],.30,.20],
 ['back_mid',[[-.12,1.31,-.44],[-.15,1.02,-.67],[-.16,.52,-.65],[-.22,.16,-.58]],.38,.22],
 ['back_right',[[.36,1.29,-.42],[.53,.98,-.63],[.54,.60,-.60],[.42,.13,-.55]],.33,.20]
]};
const long={cap:[.72,.31,.62],locks:[
 ['left_center',[[-.15,1.42,.14],[-.35,1.29,.38],[-.43,1.05,.55],[-.48,.79,.50]],.26,.16],
 ['right_center',[[.15,1.43,.13],[.34,1.30,.39],[.43,1.07,.55],[.47,.80,.50]],.26,.16],
 ['left_curtain',[[-.50,1.30,.07],[-.67,1.01,.21],[-.75,.51,.20],[-.75,-.03,.16],[-.86,-.58,.11]],.31,.22],
 ['right_curtain',[[.51,1.31,.04],[.67,1.00,.22],[.74,.47,.24],[.70,-.07,.19],[.83,-.58,.10]],.31,.22],
 ['left_back',[[-.54,1.27,-.26],[-.70,.81,-.53],[-.72,.12,-.59],[-.78,-.63,-.58],[-.67,-1.02,-.54]],.34,.24],
 ['right_back',[[.53,1.28,-.25],[.73,.82,-.56],[.71,.11,-.57],[.69,-.64,-.57],[.60,-.99,-.50]],.33,.24],
 ['mid_back_a',[[-.24,1.30,-.44],[-.30,.81,-.71],[-.30,.05,-.75],[-.40,-.80,-.70],[-.27,-1.07,-.60]],.36,.23],
 ['mid_back_b',[[.25,1.28,-.44],[.30,.80,-.72],[.27,.03,-.75],[.36,-.76,-.70],[.20,-1.07,-.63]],.37,.24],
 ['left_tip',[[-.61,.67,-.47],[-.81,.17,-.52],[-.93,-.40,-.46],[-.86,-.85,-.39]],.19,.15],
 ['right_tip',[[.63,.63,-.43],[.84,.15,-.50],[.88,-.44,-.45],[.84,-.81,-.35]],.18,.15]
]};
const refs={sculpt_swept:swept,sculpt_shag:shag,sculpt_bob:bob,sculpt_long:long};
export function makeSculptedHair(id){
 if(!Object.hasOwn(refs,id))throw new Error('Unknown sculpted hairstyle: '+id);
 const group=new THREE.Group();group.name='hair_'+id;group.userData.attachment='HairAttachment';
 group.add(scalp(refs[id].cap));
 for(const [name,points,w,d] of refs[id].locks)group.add(lock(name,points,w,d));
 return group;
}