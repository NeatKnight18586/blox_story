import * as T from 'three';
// Original stylized family-photo motif; no external art, text or family rig.
export function makeFamilyPhoto(){
const canvas=document.createElement('canvas');canvas.width=256;canvas.height=256;const c=canvas.getContext('2d');c.fillStyle='#d6c6a5';c.fillRect(0,0,256,256);c.fillStyle='#9eaa98';c.fillRect(16,16,224,208);c.fillStyle='#b2a58d';c.fillRect(16,176,224,48);
function figure(x,y,w,h,color,hair=false){c.fillStyle=color;c.fillRect(x-w/2,y,w,h);c.fillStyle='#d1b28c';c.beginPath();c.ellipse(x,y-w*.39,w*.35,w*.38,0,0,Math.PI*2);c.fill();c.fillStyle='#514d43';if(hair){c.beginPath();c.ellipse(x-6,y-w*.65,w*.4,w*.16,-.15,0,Math.PI*2);c.fill();c.fillStyle='#aaa291';c.fillRect(x-w*.3,y-w*.70,w*.3,w*.12);c.strokeStyle='#c3b797';c.lineWidth=8;c.beginPath();c.moveTo(x-w*.4,y+7);c.lineTo(x,y+24);c.lineTo(x+w*.4,y+7);c.stroke();}c.fillStyle='#34322b';for(const dx of[-w*.1,w*.1])c.fillRect(x+dx,y-w*.4,3,5);}
figure(93,99,76,90,'#777e8d',true);figure(166,143,43,58,'#9c634b');c.fillStyle='rgba(225,205,158,.14)';c.fillRect(16,16,224,208);const tex=new T.CanvasTexture(canvas);tex.colorSpace=T.SRGBColorSpace;
const photo=new T.Mesh(new T.PlaneGeometry(.96,.96),new T.MeshStandardMaterial({map:tex,roughness:1,side:T.DoubleSide}));photo.name='faded_family_photo';return photo;
}
