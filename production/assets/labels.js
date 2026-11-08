import * as THREE from 'three';
// Canvas pixels become genuine WebGL textures; no HTML overlay is missed by capture.
export function textTexture(width,height,draw){const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;draw(canvas.getContext('2d'));const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;return texture;}
export function makeNameTag(text){
 const texture=textTexture(512,192,c=>{c.fillStyle='#b9bca8';c.fillRect(0,0,512,192);c.strokeStyle='#727f78';c.lineWidth=7;c.strokeRect(12,12,488,168);c.fillStyle='#e0ddc7';for(const [x,y] of [[30,18],[390,154],[440,36],[72,145]])c.fillRect(x,y,42,5);c.fillStyle='#756f5e';c.font='19px sans-serif';c.textAlign='center';c.fillText('NAME',256,47);c.fillStyle='#303d3e';c.font='bold 104px sans-serif';c.fillText(text,256,146);});
 const group=new THREE.Group();group.name='name_tag';group.userData.revealTag=true;
 const board=new THREE.Mesh(new THREE.BoxGeometry(1.75,.66,.04),new THREE.MeshStandardMaterial({color:0xa4afa6,roughness:1,transparent:true}));group.add(board);
 const front=new THREE.Mesh(new THREE.PlaneGeometry(1.73,.64),new THREE.MeshBasicMaterial({map:texture,transparent:true,side:THREE.DoubleSide}));front.position.z=.022;group.add(front);return group;
}
export function createCounterOverlay(spec,whisperText){
 const scene=new THREE.Scene(),camera=new THREE.OrthographicCamera(0,360,640,0,.1,10);camera.position.z=2;
 const textures=new Map();
 for(const value of [spec.before,spec.after])textures.set(value,textTexture(320,232,c=>{c.fillStyle='#0a1c29';c.fillRect(0,0,320,232);c.strokeStyle='#b9af7f';c.lineWidth=5;c.strokeRect(3,3,314,226);c.fillStyle='#c8d7d8';c.font='26px sans-serif';c.textAlign='center';c.fillText(spec.actor.toUpperCase(),160,43);c.fillStyle=value===spec.before?'#dbe6df':'#ffda99';c.font='bold 126px sans-serif';c.fillText(String(value),160,169);c.fillStyle='#94acb3';c.font='19px sans-serif';c.fillText('NAMES LEFT',160,208);}));
 const panel=new THREE.Mesh(new THREE.PlaneGeometry(1,1),new THREE.MeshBasicMaterial({map:textures.get(spec.before),depthTest:false,depthWrite:false,toneMapped:false}));scene.add(panel);
 const whisperTexture=textTexture(512,80,c=>{c.fillStyle='rgba(5,15,26,.9)';c.fillRect(0,0,512,80);c.fillStyle='#e3e2cf';c.font='italic 48px sans-serif';c.textAlign='center';c.fillText(whisperText,256,57);});
 const whisper=new THREE.Mesh(new THREE.PlaneGeometry(170,27),new THREE.MeshBasicMaterial({map:whisperTexture,transparent:true,depthTest:false,depthWrite:false,toneMapped:false}));whisper.position.set(180,55,0);scene.add(whisper);
 return {apply(state){panel.material.map=textures.get(state.counter);const w=state.counterEmphasis?142:94,h=w*232/320;panel.scale.set(w,h,1);panel.position.set(state.counterEmphasis?85:60,state.counterEmphasis?435:590,0);whisper.visible=state.whisper;},draw(renderer){const clear=renderer.autoClear;renderer.autoClear=false;renderer.clearDepth();renderer.render(scene,camera);renderer.autoClear=clear;},panel,whisper};
}
