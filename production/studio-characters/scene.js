// Studio V2 character review stage: lineup + expression close-ups under the studio look.
import * as T from 'three';
import {createCharacter, setExpression, EXPRESSIONS} from '../../studio/characters/characters.js';
import {applyStudioLook} from '../../studio/lookdev/look.js';

const renderer = new T.WebGLRenderer({antialias: true, preserveDrawingBuffer: true});
renderer.setPixelRatio(1); renderer.setSize(1080, 1920); renderer.shadowMap.enabled = true; renderer.shadowMap.type = T.PCFSoftShadowMap;
document.body.append(renderer.domElement);
const scene = new T.Scene(), camera = new T.PerspectiveCamera(40, 9 / 16, .1, 250);

// Same light rig family as the plaza (hemisphere + warm shadowed key + fill) so the look rebalances it identically.
scene.add(new T.HemisphereLight(0xc5e3f1, 0x756a55, 1.7));
const key = new T.DirectionalLight(0xffd6a0, 3.6); key.position.set(9, 16, 12); key.castShadow = true;
key.shadow.mapSize.set(2048, 2048); Object.assign(key.shadow.camera, {left: -10, right: 10, top: 10, bottom: -10, near: 1, far: 60}); key.shadow.bias = -.0004; key.shadow.normalBias = .02;
scene.add(key);
const fill = new T.DirectionalLight(0xffe8c9, 2.0); fill.position.set(-10, 8, 6); scene.add(fill);
const ground = new T.Mesh(new T.CylinderGeometry(60, 60, .2, 64), new T.MeshStandardMaterial({color: 0x999281, roughness: 1}));
ground.name = 'continuous_town_ground'; ground.position.y = -.1; ground.receiveShadow = true; scene.add(ground);
const inlay = new T.Mesh(new T.CylinderGeometry(7, 7, .02, 64), new T.MeshStandardMaterial({color: 0xb6ad96, roughness: 1}));
inlay.name = 'inset_radial_paving'; inlay.position.y = .005; inlay.receiveShadow = true; scene.add(inlay);

const cast = {mother: createCharacter('mother'), leo: createCharacter('leo'), pip: createCharacter('pip')};
for (const a of Object.values(cast)) scene.add(a.root);
const look = applyStudioLook({scene, camera, renderer});

function lineupPose() {
  const {mother, leo, pip} = cast;
  mother.root.position.set(-2.05, 0, -.8); mother.root.rotation.y = .32;
  leo.root.position.set(2.15, 0, -.2); leo.root.rotation.y = -.3;
  pip.root.position.set(-.35, 0, 1.7); pip.root.rotation.y = .12;
  for (const a of Object.values(cast)) for (const p of Object.values(a.pivots)) p.rotation.set(0, 0, 0);
  // Relaxed, slightly open stances; Pip's raised hand gives the group a focal point.
  for (const a of [mother, leo]) { a.pivots.leftShoulder.rotation.z = -.08; a.pivots.rightShoulder.rotation.z = .08; }
  mother.pivots.head.rotation.set(.04, .12, -.05); leo.pivots.head.rotation.set(0, -.1, .04);
  pip.pivots.rightShoulder.rotation.set(-.15, 0, 2.85); pip.pivots.head.rotation.set(-.08, 0, .06);
  pip.pivots.leftHip.rotation.x = .08; pip.pivots.rightHip.rotation.x = -.06;
  setExpression(mother, 'pleased'); setExpression(leo, 'confident'); setExpression(pip, 'excited');
}

const shots = {
  lineup() { lineupPose(); camera.fov = 38; camera.position.set(0, 3.7, 17.5); camera.lookAt(0, 3.3, 0); return {focus: null}; },
  lineup34() { lineupPose(); camera.fov = 38; camera.position.set(10, 4.2, 12.8); camera.lookAt(.2, 3.2, 0); return {focus: null}; },
};
// Face close-up: square frame on one character's head, any expression.
function face(who, expression) {
  const a = cast[who]; lineupPose(); for (const p of Object.values(a.pivots)) p.rotation.set(0, 0, 0);
  setExpression(a, expression);
  const head = new T.Vector3(); a.parts.head.getWorldPosition(head);
  const ry = a.root.rotation.y, fwd = new T.Vector3(Math.sin(ry), 0, Math.cos(ry)), s = a.root.scale.x * a.pivots.head.scale.x;
  camera.fov = 30; camera.position.copy(head).addScaledVector(fwd, 4.6 * s).add(new T.Vector3(0, .25 * s, 0)); camera.lookAt(head.clone().add(new T.Vector3(0, .1 * s, 0)));
  return {focus: head, close: true};
}

function render(shot, width = 1080, height = Math.round(width * 16 / 9)) {
  const t0 = performance.now();
  renderer.setSize(width, height); camera.aspect = width / height;
  const [kind, who, expr] = shot.split(':');
  const {focus, close} = kind === 'face' ? face(who, expr) : shots[kind]();
  camera.updateProjectionMatrix(); scene.updateMatrixWorld(true);
  look.render(focus, close);
  const gl = renderer.getContext(); gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array(4));
  return {shot, width, height, ms: performance.now() - t0};
}
window.__cast = {render, cast, EXPRESSIONS, scene, camera, renderer};
