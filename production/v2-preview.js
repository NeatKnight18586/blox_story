import * as THREE from 'three';
import {createBaseAvatar} from '../avatar/baseAvatar.js';
import {applyAppearance} from '../appearance/appearance.js';
import {applyFace} from '../appearance/faces.js';
import {HAIR_STYLES,HAIR_COLORS} from '../appearance/v2-hair.js';
import {SKIN_TONES} from '../appearance/v2-skin.js';
import {applyToonV2} from '../appearance/v2-toon.js';
import {createV2Backlot} from './assets/v2-backlot.js';
const q=new URLSearchParams(location.search);
const hair=HAIR_STYLES.includes(q.get('hair'))?q.get('hair'):'messy_fringe';
const skinToneId=Object.hasOwn(SKIN_TONES,q.get('skin'))?q.get('skin'):'warm';
const toon=q.get('toon')==='1';
const hairColorId=Object.hasOwn(HAIR_COLORS,q.get('hairColor'))?q.get('hairColor'):'espresso';
const angle=['front','side','threequarter'].includes(q.get('angle'))?q.get('angle'):'threequarter';
const width=720,height=1280;
const renderer=new THREE.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});
renderer.setPixelRatio(1);renderer.setSize(width,height);renderer.shadowMap.enabled=true;
renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.toneMapping=THREE.ACESFilmicToneMapping;
document.body.append(renderer.domElement);
const scene=new THREE.Scene();scene.background=new THREE.Color(0x182f42);
const hemi=new THREE.HemisphereLight(0xd8e7fb,0x506078,1.4);scene.add(hemi);
const key=new THREE.DirectionalLight(0xffd9ae,2.5);key.position.set(-4,9,6);key.castShadow=true;scene.add(key);
const fill=new THREE.DirectionalLight(0xb7dcff,.45);fill.position.set(5,5,4);scene.add(fill);
const floor=new THREE.Mesh(new THREE.PlaneGeometry(40,50),new THREE.MeshStandardMaterial({color:0x516477,roughness:.92}));
floor.rotation.x=-Math.PI/2;floor.receiveShadow=true;scene.add(floor);
createV2Backlot(scene,{palette:'moonlit',layout:'street_depth'});
const avatar=createBaseAvatar();applyAppearance(avatar,{
 skinToneId,hair,hairColorId,
 pieces:{torso:0x35719b,leftArm:0x35719b,rightArm:0x35719b,leftLeg:0x324056,rightLeg:0x324056}
});applyFace(avatar,'relieved');scene.add(avatar.root);
const camera=new THREE.PerspectiveCamera(39,width/height,.1,100);
camera.position.set(...({front:[0,5.2,10.5],side:[10.5,5.2,0],threequarter:[4.2,5.3,10.5]}[angle]));camera.lookAt(0,2.65,0);
const style=toon?applyToonV2(scene):null;
renderer.render(scene,camera);
window.__v2Proof={ready:true,hair,skinToneId,hairColorId,angle,toon,width,height,avatar,scene,camera,renderer,style};
