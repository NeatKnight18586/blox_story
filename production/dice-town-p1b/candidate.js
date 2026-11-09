import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {createBaseAvatar} from '../../avatar/baseAvatar.js';
import {applyAppearance} from '../../appearance/appearance.js';
import {applyFace} from '../../appearance/faces.js';
import {makeFinalHair} from '../dice-town/hair.js';
const scene=new T.Scene();scene.background=new T.Color(0x9cbcc9);
const renderer=new T.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});renderer.setSize(720,1280);renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;renderer.toneMapping=T.ACESFilmicToneMapping;document.body.append(renderer.domElement);
scene.add(new T.HemisphereLight(0xb9d9eb,0x62544b,1.35));const key=new T.DirectionalLight(0xffd6a0,3.6);key.position.set(-8,14,9);key.castShadow=true;key.shadow.mapSize.set(2048,2048);scene.add(key);
const floor=new T.Mesh(new T.PlaneGeometry(100,100),new T.MeshStandardMaterial({color:0xb5afa0,roughness:1}));floor.rotation.x=-Math.PI/2;floor.receiveShadow=true;scene.add(floor);
const original=createBaseAvatar();applyAppearance(original,{color:0xdab692,pieces:{torso:0x197f83,leftLeg:0x354b52,rightLeg:0x354b52}});applyFace(original,'worried');original.pivots.head.add(makeFinalHair('neat_side_part'));original.root.position.x=-2.7;original.root.rotation.y=.2;scene.add(original.root);
const imported=await new GLTFLoader().loadAsync('./assets/character-a.glb');const candidate=imported.scene;
candidate.traverse(m=>{if(m.isMesh){m.castShadow=m.receiveShadow=true;}});
const bounds=new T.Box3().setFromObject(candidate),height=bounds.max.y-bounds.min.y;candidate.scale.setScalar(5.19/height);candidate.updateMatrixWorld(true);const scaled=new T.Box3().setFromObject(candidate);candidate.position.set(2.7,-scaled.min.y,0);candidate.rotation.y=.2;scene.add(candidate);
const camera=new T.PerspectiveCamera(34,720/1280,.1,100);camera.position.set(5,7,22);camera.lookAt(0,2.8,0);
const mixer=new T.AnimationMixer(candidate);const action=mixer.clipAction(imported.animations.find(c=>c.name==='static'));action.play();
const ids=[];candidate.traverse(m=>{if(m.isMesh)ids.push(m.uuid);});
function renderFrame(frame){mixer.setTime(frame/30);renderer.render(scene,camera);const current=[];candidate.traverse(m=>{if(m.isMesh)current.push(m.uuid);});return{meshes:current.length,identity:ids.every((x,i)=>current[i]===x),heightBeforeNormalization:height,animations:imported.animations.map(c=>c.name),skins:0,frame};}
window.__candidate={renderFrame};renderFrame(0);
