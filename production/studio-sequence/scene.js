// Studio V2 native sequence proof: 12 s, three shots, 30 fps, explicit-frame
// rendering of the town set (any frame, any order, identical pixels).
//  A  0–134  street establishing: slow dolly, Leo + Pip walk in with the crowd
//  B 135–239 tracking two-shot: Pip waves, Leo looks up — shocked
//  C 240–359 plaza: the die drops and lands on 3, crowd reacts, Leo + Pip run in
import * as T from 'three';
import {setExpression} from '../../studio/characters/characters.js';
import {locomote, idle, wave, hop, lookToward, ease, lerp, onTwos} from '../../studio/motion/r6.js';
await import('../studio-town/scene.js');
const W = window.__town, {scene, camera, renderer, cast, extras, P, look, die, stage, pose} = W;
const {leo, pip} = cast;
export const FPS = 30, FRAMES = 360, CUTS = [0, 135, 240, 360];

// Set dressing: clear trees/benches/bushes/hydrant from the walking corridor (a standard on-set cheat).
for (const o of scene.children) if (['tree', 'bench', 'bush', 'hydrant'].includes(o.name) && o.position.z < -7 && o.position.z > -12.5 && o.position.x > -50 && o.position.x < 24) o.visible = false;

const dieFinal = {pos: die.position.clone(), q: die.quaternion.clone()};
const dieStart = dieFinal.q.clone().multiply(new T.Quaternion().setFromAxisAngle(new T.Vector3(1, 0, .4).normalize(), 1.7));
const head = a => a.parts.head.getWorldPosition(new T.Vector3());
const Y = .35; // sidewalk top

const farLamps = scene.children.filter(o => o.name === 'lamp_post' && o.position.z < 0 && o.position.x > -33 && o.position.x < 20);
function street(t) {
  stage('street');
  for (const l of farLamps) l.visible = false; // lamps in the walking line would cross Pip and Leo's faces
  for (const e of extras) e.root.visible = false;
  // Leo and Pip walk +x along the far sidewalk; they stop as Leo looks up.
  locomote(leo, t, {gait: 'walk', from: [-30, Y, -8.6], dir: [1, 0], stopAt: 7.45});
  locomote(pip, t, {gait: 'child_walk', from: [-28.9, Y, -7.75], dir: [1, 0], stopAt: 7.45}); // camera side, a step ahead so the wave reads
  if (t >= 7.45) { idle(leo, t - 7.45); idle(pip, t - 7.45, {seed: 2}); }
  if (t > 5.3 && t < 6.7) wave(pip, t);
  lookToward(leo, t, 6.9, [leo.root.position.x + 20, 0, 6], {dur: .25}); // toward the sky over the plaza, camera side
  if (t > 6.9) leo.pivots.head.rotation.x = -.38 * ease((t - 6.9) / .25); // looking up at the sky
  setExpression(leo, t < 6.95 ? (onTwos(t) % 2.4 < 1.6 ? 'happy' : 'calm') : t < 7.25 ? 'curious' : 'shocked');
  setExpression(pip, t > 5.3 && t < 6.7 ? 'excited' : t < 7.3 ? 'happy' : 'shocked');
  // Crowd: shop-front idlers, opposite-lane walkers, one crossing at the zebra.
  const idlers = [[0, -38, -12.2, .4], [1, -22, -12.2, -.2], [2, -16, -12.2, .3], [3, 10, -12.2, -.5], [9, -48, -9.5, .3], [10, 16, -12.2, -.6]];
  for (const [i, x, z, ry] of idlers) { const e = extras[i]; e.root.visible = true; pose(e, i + 1); idle(e, t, {seed: i}); e.root.position.set(x, Y, z); e.root.rotation.set(0, ry, 0); }
  const walkers = [[4, [12, Y, -11.1], [-1, 0], 0], [5, [-1, Y, -11.1], [-1, 0], 1.2], [6, [-50, Y, -11.1], [1, 0], 0]];
  for (const [i, from, dir, t0] of walkers) { const e = extras[i]; e.root.visible = true; locomote(e, t, {from, dir, t0}); }
  const crosser = extras[8]; crosser.root.visible = true; locomote(crosser, t, {from: [-8.5, .25, 7.2], dir: [0, -1], t0: .3, stopAt: 3.3}); if (t >= 3.3) idle(crosser, t - 3.3);
  for (const i of [0, 3, 10]) lookToward(extras[i], t, 0, [leo.root.position.x, 0, leo.root.position.z], {dur: .01, max: .7});
}

function plaza(tc) {
  stage('plaza');
  // Die: falls (accelerating), tumbles to the 3-up face, one small bounce, settles.
  const u = Math.min(1, tc / 1.0);
  die.quaternion.slerpQuaternions(dieStart, dieFinal.q, ease(u));
  die.position.copy(dieFinal.pos); die.position.y += 11 * (1 - u * u);
  if (tc > 1 && tc < 1.32) die.position.y += .9 * Math.sin(Math.PI * (tc - 1) / .32);
  // Crowd: watch the die, hop when it lands (staggered), shock → delight.
  extras.forEach((e, i) => {
    if (!e.root.visible) return;
    pose(e, i + 1); idle(e, tc, {seed: i});
    lookToward(e, tc, 0, [die.position.x, 0, die.position.z], {dur: .01});
    e.pivots.head.rotation.x = tc < 1 ? -.3 : -.1;
    hop(e, tc, 1.05 + (i % 4) * .06);
    setExpression(e, tc < 1 ? 'curious' : tc < 2.2 ? (i % 2 ? 'shocked' : 'scared') : (i % 2 ? 'excited' : 'happy'));
  });
  // Leo and Pip run in from the right and stop, staring at the result.
  const L0 = [P.x + 17, .3, P.z + 8], L1 = [P.x + 3.4, P.z + 5.2], P0 = [P.x + 18.5, .3, P.z + 10.5], P1 = [P.x + 5.8, P.z + 7.6];
  const run = (a, from, to, t0, gaitName) => {
    const d = [to[0] - from[0], to[1] - from[2]], len = Math.hypot(...d), dir = [d[0] / len, d[1] / len];
    const speed = (a === pip ? .65 : 1) * 8 * Math.sin(.9) / .56, stop = t0 + len / speed;
    locomote(a, tc, {gait: 'run', from, dir, t0, stopAt: stop});
    if (tc < t0) a.root.position.set(from[0] + 30, from[1], from[2]); // off-screen until cued
    if (tc >= stop) { idle(a, tc - stop); a.root.rotation.y = Math.atan2(die.position.x - a.root.position.x, die.position.z - a.root.position.z); }
    return stop;
  };
  run(leo, L0, L1, 1.7); run(pip, P0, P1, 1.85);
  setExpression(leo, 'shocked'); setExpression(pip, tc < 3.3 ? 'nervous' : 'shocked');
}

// Camera per shot (eased moves; never a frozen frame).
function cameraFor(f) {
  const t = f / FPS;
  if (f < CUTS[1]) { const u = ease(f / (CUTS[1] - 1)); camera.fov = 52; camera.position.set(lerp(-48, -41, u), lerp(10, 9, u), lerp(4.5, 4, u)); camera.lookAt(lerp(-16, -10, u), 6.3, -12); return {focus: null}; }
  if (f < CUTS[2]) {
    const u = ease((f - CUTS[1]) / (CUTS[2] - CUTS[1] - 1)), x = leo.root.position.x;
    camera.fov = 40; camera.position.set(x + lerp(10, 8.2, u), 5.2, lerp(4.6, 3.8, u)); camera.lookAt(x + .6, lerp(4.4, 4.9, u), -9.1);
    return {focus: head(leo), close: true};
  }
  const u = ease((f - CUTS[2]) / (FRAMES - CUTS[2] - 1));
  camera.fov = 57; camera.position.set(P.x + lerp(10, 8.2, u), lerp(11, 9.2, u), P.z + lerp(27, 22.5, u)); camera.lookAt(P.x + lerp(-2, -.5, u), lerp(4.5, 4.3, u), P.z + lerp(-2, -1, u));
  return {focus: null};
}

export function renderFrame(f, width = 1440) {
  if (!Number.isInteger(f) || f < 0 || f >= FRAMES) throw Error('frame out of range');
  const t0 = performance.now(), height = Math.round(width * 16 / 9);
  renderer.setSize(width, height); camera.aspect = width / height;
  const t = f / FPS;
  if (f < CUTS[2]) street(t); else plaza((f - CUTS[2]) / FPS);
  scene.updateMatrixWorld(true);
  const {focus, close} = cameraFor(f); camera.updateProjectionMatrix(); scene.updateMatrixWorld(true);
  look.render(focus, close);
  const gl = renderer.getContext(); gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array(4));
  return {frame: f, shot: f < CUTS[1] ? 'A' : f < CUTS[2] ? 'B' : 'C', width, height, ms: performance.now() - t0,
    leo: leo.root.position.toArray().map(v => +v.toFixed(4)), expression: leo.expression};
}
window.__sequence = {renderFrame, FPS, FRAMES, CUTS};
