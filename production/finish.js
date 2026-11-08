import * as THREE from 'three';
// P5 story-only finish. Geometry, lights' directions and timeline stay intact.
export function createFinish(scene,avatars){
 const lights=[];
 scene.traverse(o=>{if(!o.isDirectionalLight||!o.castShadow)return;
  o.shadow.mapSize.set(2048,2048);
  // Tighten the courtyard's old 24-unit square; keep bedroom coverage intact.
  if(o.shadow.camera.right===12)Object.assign(o.shadow.camera,{left:-9,right:9,top:9,bottom:-9});
  o.shadow.radius=4;o.shadow.bias=-.00008;o.shadow.normalBias=.012;
  o.shadow.intensity=.9;o.shadow.camera.updateProjectionMatrix();lights.push(o);
 });
 const material=new THREE.MeshBasicMaterial({colorWrite:false,depthWrite:true});
 const helpers=new Map();
 function surface(o,a){
  if(!o.isMesh||o.userData.lookDepth)return false;
  for(let p=o;p;p=p.parent)if(p===a.faceLayer||p.userData.revealTag)return false;
  return true;
 }
 function ghost(a,active){
  const originals=[];
  a.root.traverse(o=>{if(o.userData.lookDepth&&!o.userData.finishDepth)o.visible=false;if(surface(o,a))originals.push(o);});
  for(const o of originals){
   if(!helpers.has(o)){
    const d=new THREE.Mesh(o.geometry,material);d.name='p5_front_surface';d.userData.lookDepth=true;d.userData.finishDepth=true;d.renderOrder=11;o.parent.add(d);helpers.set(o,d);
   }
   const d=helpers.get(o);d.position.copy(o.position);d.quaternion.copy(o.quaternion);d.scale.copy(o.scale);d.visible=active&&o.visible;
  }
 }
 return {lights,helpers,material,apply(state){
  // Appearance attachments have now been applied: include vest, cap and hair,
  // not just the six meshes present at initial avatar construction.
  // Existing effects may touch shared depth material; reset after them every seek.
  Object.assign(material,{transparent:false,opacity:1,colorWrite:false,depthWrite:true});
  if(state.reveal)ghost(avatars.mara,state.reveal.ghostToHuman<1);
  if(state.ending)ghost(avatars.eli,state.ending.forgotten>0);
 }};
}
