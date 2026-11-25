// engine/buildgate.js — page for scripts/v2/build-gates.js (owner 2026-11-14, adult_f). One actor, front, orthographic,
// flat colours, no lighting, no antialiasing: torso red, arms blue, legs green, head yellow, background white.
// Returns RGBA bytes (row 0 = bottom, GL order); the measuring is in the script.
import * as T from 'three';
import {createActor} from '../avatar-style/body.js';
import {createActor6} from '../avatar-style/body6.js';

const renderer = new T.WebGLRenderer({antialias: false, preserveDrawingBuffer: true}); renderer.setPixelRatio(1); document.body.appendChild(renderer.domElement);
const scene = new T.Scene(); scene.background = new T.Color('#ffffff');
const FLAT = {torso: '#ff0000', leftArm: '#0000ff', rightArm: '#0000ff', leftLeg: '#00ff00', rightLeg: '#00ff00', head: '#ffff00'};
const cam = new T.OrthographicCamera(-1, 1, 1, -1, .1, 40); let actor = null;
// opts: {build, tier, w, h, span (world units across), cy (frame centre y)}
function render({build = 'adult_f', tier = 'hero', w = 390, h = 693, span = 4.4, cy = 2.85, body = 'v1'}) {   // body 'v6' (E4 opt-in): the Actor v6 body in the same flat colours
  if (actor) scene.remove(actor.root);
  if (body === 'v6') {
    actor = createActor6({tier, build, skin: '#ffff00', regions: {torso: {main: '#ff0000'}, arms: {upper: '#0000ff', lower: '#0000ff', sleeve: 'wrist'}, legs: {main: '#00ff00', shoes: '#00ff00'}}});
    actor.root.traverse(o => { if (o.isMesh) o.material = new T.MeshBasicMaterial({color: o.material.color.clone()}); });   // flat, unlit
  } else actor = createActor({tier, build, materials: Object.fromEntries(Object.entries(FLAT).map(([k, c]) => [k, new T.MeshBasicMaterial({color: c})]))});
  scene.add(actor.root);
  renderer.setSize(w, h, false); const vh = span * h / w;
  Object.assign(cam, {left: -span / 2, right: span / 2, top: vh / 2, bottom: -vh / 2}); cam.position.set(0, cy, 20); cam.lookAt(0, cy, 0); cam.updateProjectionMatrix();   // frustum is relative to the camera at y = cy
  renderer.render(scene, cam);
  const gl = renderer.getContext(), buf = new Uint8Array(w * h * 4); gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, buf);
  return {px: Array.from(buf), unitPx: w / span};
}
window.__bg = {render};
