// Opt-in non-photorealistic material study; legacy material identities untouched unless called.
import * as THREE from 'three';
let ramp;
function gradient(){
 if(!ramp){
  ramp=new THREE.DataTexture(new Uint8Array([145,145,145,255, 215,215,215,255, 255,255,255,255]),3,1,THREE.RGBAFormat);
  ramp.minFilter=THREE.NearestFilter;ramp.magFilter=THREE.NearestFilter;
  ramp.generateMipmaps=false;ramp.unpackAlignment=1;ramp.needsUpdate=true;
 }
 return ramp;
}
export function applyToonV2(root){
 const replaced=new Map(),converted=new Map();
 root.traverse(o=>{
  if(!o.isMesh||!o.material?.isMeshStandardMaterial||o.userData.lookDepth||o.material.transparent)return;
  const old=o.material;
  if(!converted.has(old))converted.set(old,new THREE.MeshToonMaterial({
   color:old.color.clone(),gradientMap:gradient(),map:old.map,emissive:old.emissive.clone(),
   emissiveIntensity:old.emissiveIntensity,side:old.side,fog:old.fog,transparent:old.transparent,
   opacity:old.opacity,alphaTest:old.alphaTest,vertexColors:old.vertexColors
  }));
  replaced.set(o,old);o.material=converted.get(old);
 });
 return {converted:replaced.size,restore(){for(const [mesh,old] of replaced)mesh.material=old;for(const m of converted.values())m.dispose();}};
}
