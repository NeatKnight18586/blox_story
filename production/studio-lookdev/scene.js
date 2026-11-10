// Studio look gate page: reuses the approved P3B4 plaza unchanged, then
// optionally layers studio/lookdev/look.js (?look=1). ?look=0 is the legacy path.
import * as T from 'three';
await import('../dice-town-p3b4/scene.js');
const {applyStudioLook} = await import('../../studio/lookdev/look.js');
const g = window.__grounding;
const lookOn = new URLSearchParams(location.search).get('look') === '1';
const look = lookOn ? applyStudioLook({scene: g.scene, camera: g.camera, renderer: g.renderer}) : null;
// ?cast=v2 swaps in the Studio V2 Leo preset, posed and placed exactly like the legacy Leo.
const castV2 = new URLSearchParams(location.search).get('cast') === 'v2';
let leo = g.leo;
if (castV2) {
  const {createCharacter, setExpression} = await import('../../studio/characters/characters.js');
  leo = createCharacter('leo'); setExpression(leo, 'happy'); g.scene.add(leo.root);
}
function syncCast() {
  if (!castV2) return;
  g.leo.root.visible = false;
  leo.root.position.copy(g.leo.root.position); leo.root.rotation.copy(g.leo.root.rotation);
  for (const n of Object.keys(leo.pivots)) leo.pivots[n].rotation.copy(g.leo.pivots[n].rotation);
}

// Leo medium close-up: derived from Leo's own head position and facing, so it
// stays valid if the plaza layout moves.
function leoCloseUp() {
  const head = new T.Vector3(); leo.parts.head.getWorldPosition(head);
  const ry = leo.root.rotation.y, fwd = new T.Vector3(Math.sin(ry), 0, Math.cos(ry));
  const side = new T.Vector3(fwd.z, 0, -fwd.x);
  const target = head.clone().add(new T.Vector3(0, -1.1, 0));
  const pos = head.clone().addScaledVector(fwd, 9.5).addScaledVector(side, -2.4).add(new T.Vector3(0, .6, 0));
  g.camera.position.copy(pos); g.camera.lookAt(target); g.camera.fov = 34; g.camera.updateProjectionMatrix();
  return head;
}

const shots = {
  wide: width => { g.render('D01', true, width); syncCast(); g.scene.updateMatrixWorld(true); return {focus: leo.parts.head.getWorldPosition(new T.Vector3()), close: false}; },
  leo: width => { g.render('D01', true, width); syncCast(); g.scene.updateMatrixWorld(true); const head = leoCloseUp(); return {focus: head, close: true}; },
};

function render(shot, width = 1080) {
  const s = shots[shot]; if (!s) throw Error('Unknown shot ' + shot);
  const t0 = performance.now();
  const {focus, close} = s(width);
  if (look) look.render(focus, close); else { g.scene.updateMatrixWorld(true); g.renderer.render(g.scene, g.camera); }
  // A 1-pixel readback forces the CPU WebGL pipeline to finish before timing stops.
  const gl = g.renderer.getContext(); gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array(4));
  return {shot, look: lookOn, width, height: g.renderer.domElement.height, ms: performance.now() - t0,
    camera: {position: g.camera.position.toArray(), fov: g.camera.fov}};
}
window.__lookdev = {render, lookOn, shots: Object.keys(shots)};
