import * as T from 'three';

// Static art direction only: no clock, simulation or post-processing pass.
export function addSkyAndDistance(scene){
 const canvas=document.createElement('canvas');canvas.width=1024;canvas.height=512;
 const ctx=canvas.getContext('2d'),gradient=ctx.createLinearGradient(0,0,0,512);
 gradient.addColorStop(0,'#548cae');gradient.addColorStop(.44,'#6da5c1');gradient.addColorStop(.50,'#a7c9d3');gradient.addColorStop(.55,'#eedcbb');gradient.addColorStop(1,'#d8c6a7');ctx.fillStyle=gradient;ctx.fillRect(0,0,1024,512);
 const sky=new T.CanvasTexture(canvas);sky.colorSpace=T.SRGBColorSpace;sky.mapping=T.EquirectangularReflectionMapping;
 scene.background=sky;
 const sunDirection=new T.Vector3(-24,12,-55).normalize();
 const sun=new T.Mesh(new T.SphereGeometry(2.2,24,16),new T.MeshBasicMaterial({color:0xffebbb,fog:false,toneMapped:false}));sun.name='visible_sun';sun.position.copy(sunDirection).multiplyScalar(150);scene.add(sun);
 const glowCanvas=document.createElement('canvas');glowCanvas.width=glowCanvas.height=128;const g=glowCanvas.getContext('2d'),radial=g.createRadialGradient(64,64,5,64,64,64);radial.addColorStop(0,'rgba(255,225,166,.42)');radial.addColorStop(1,'rgba(255,225,166,0)');g.fillStyle=radial;g.fillRect(0,0,128,128);
 const glow=new T.Sprite(new T.SpriteMaterial({map:new T.CanvasTexture(glowCanvas),transparent:true,depthWrite:false,fog:false,toneMapped:false}));glow.name='sun_glow';glow.position.copy(sun.position);glow.scale.set(17,17,1);scene.add(glow);
 const cloudMaterial=new T.MeshBasicMaterial({color:0xf3e7ce,fog:false});
 for(const[x,y,z,scale]of[[-35,15,-58,1.2],[-20,18,-80,1.1]]){
  const clump=new T.Group();clump.name='cloud_clump';clump.position.set(x,y,z);clump.scale.setScalar(scale);
  for(const[dx,dy,r]of[[-2,0,1.7],[0,.5,2.4],[2.5,0,1.8]]){const m=new T.Mesh(new T.SphereGeometry(r,12,8),cloudMaterial);m.scale.set(1,.42,.65);m.position.set(dx,dy,0);clump.add(m);}
  scene.add(clump);
 }
 // Three shallow distant roof profiles; no interiors or explorable street grid.
 for(const[x,z,w,h]of[[-19,-28,7,8],[-5,-32,9,7],[12,-30,8,9]]){
  const shape=new T.Shape();shape.moveTo(-w/2,0);shape.lineTo(w/2,0);shape.lineTo(w/2,h);shape.lineTo(w*.12,h+1.5);shape.lineTo(-w/2,h);shape.closePath();
  const m=new T.Mesh(new T.ExtrudeGeometry(shape,{depth:2,bevelEnabled:false}),new T.MeshStandardMaterial({color:0x9eada4,roughness:1}));m.name='distant_roofline';m.position.set(x,0,z);scene.add(m);
 }
}
