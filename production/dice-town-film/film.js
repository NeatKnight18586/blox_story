// Dice Town — The Sixth Roll. Full 117.100 s film (3513 frames @ 30 fps, 38 shots)
// on the studio sets. Shot boundaries are the locked edit (stories/dice-town/
// P3A_SHOT_OPTIMIZATION.json) so the private narration WAV drops in unchanged.
// Every frame is a pure function of its index: render any frame, any order.
import * as T from 'three';
import {createCharacter, createCustom, setExpression, setHair} from '../../studio/characters/characters.js';
import {locomote, idle, hop, ease, lerp, onTwos} from '../../studio/motion/r6.js';
import * as S from '../../studio/dice/sets.js';
import {topQuaternion, supportY} from '../dice-town-p4b1/die.js';
await import('../studio-town/scene.js');
const W = window.__town, {scene, camera, renderer, cast, extras, P, look, die, dieBody, key} = W;
const {leo, pip, mother} = cast;
export const FPS = 30, FRAMES = 3513;
const V = (x, y, z) => new T.Vector3(x, y, z);

// ---------------- Set assembly ----------------
for (const o of scene.children) if (o.name === 'fountain') o.visible = false; // keep the plaza focused on the die
for (const o of scene.children) if (['tree', 'bench', 'bush', 'hydrant', 'lamp_post'].includes(o.name) && o.position.z < -7 && o.position.z > -12.5 && o.position.x > -40 && o.position.x < 0) o.visible = false;
const D = V(P.x - 1, 0, P.z - 1);
const dais = S.dais(); dais.group.position.copy(D); scene.add(dais.group);
const tipRest = dais.tip.position.y;
const hatchWorld = () => dais.hatch.localToWorld(V(0, 0, 0));
const ringWorld = () => dais.ring.getWorldPosition(V());
const stalls = scene.children.filter(o => o.name === 'market_stall' && Math.abs(o.position.x - P.x) < 30);
const stallA = stalls.find(s => s.position.x < P.x), stallB = stalls.find(s => s.position.x > P.x);
const towerRing = V(P.x + 1.5, 4.6, P.z - 26.6);
const towerRingMesh = new T.Mesh(new T.TorusGeometry(.32, .08, 8, 20), new T.MeshStandardMaterial({color: 0x3d4147, metalness: .3, roughness: .5})); towerRingMesh.position.copy(towerRing); scene.add(towerRingMesh);

const C = V(1000, 0, 0), G = V(1400, 0, 0), H = V(1800, 0, 0), I = V(2200, 0, 0);
const ch = S.chamber(); ch.group.position.copy(C); scene.add(ch.group);
const gate = S.gateSet(); gate.position.copy(G); scene.add(gate);
const home = S.homeExterior(); home.group.position.copy(H); scene.add(home.group);
const room = S.homeInterior(); room.group.position.copy(I); scene.add(room.group);

// Props.
const tether = S.rope(); scene.add(tether);
const book = S.notebook(); scene.add(book);
const pinLoose = S.loosePin(); scene.add(pinLoose);
const harness = S.harness(leo);
const baker = createCustom('baker', {scale: 1, skin: '#cc8e69', top: '#ffffff', accent: '#e9a64b', torso: 'stripe', sleeves: 'short',
  legs: {cloth: '#3e6fb0', shoe: '#6b4428'}, hair: {option: 'messy_brown', color: '#3a2418'}, props: []});
scene.add(baker.root);
const cups = [0, 1, 2].map(i => { const m = new T.Mesh(new T.CylinderGeometry(.22, .17, .45, 14), new T.MeshStandardMaterial({color: ['#ffffff', '#e2483d', '#2f80d1'][i], roughness: .4})); m.castShadow = true; scene.add(m); return m; });

// The family photograph, rendered once from the real 3D characters (young mother + Pip).
const youngMother = createCharacter('mother', {expression: 'happy'}); setHair(youngMother, 'bun_red', {color: '#4a2c1e'}); youngMother.glasses.visible = false;
const photoPip = createCharacter('pip', {expression: 'happy'});
youngMother.pivots.leftShoulder.rotation.set(-.35, 0, -.55);
const photoTex = S.renderPhoto(renderer, [[youngMother, [-1.1, 0, 0], .15], [photoPip, [1.2, 0, .6], -.2]]);
const photoHeld = S.photo(photoTex, 1.15); scene.add(photoHeld);
const photoBig = S.photo(photoTex, 3.2); scene.add(photoBig);
const photoPropped = S.photo(photoTex, .9); scene.add(photoPropped);

// Screen tint for flashbacks (warm sepia) and the morning shots (dawn), parented to the camera.
const tint = new T.Mesh(new T.PlaneGeometry(4, 4), new T.MeshBasicMaterial({color: 0xffffff, transparent: true, opacity: 0, depthTest: false, depthWrite: false, toneMapped: false}));
tint.position.z = -.2; tint.renderOrder = 999; camera.add(tint); scene.add(camera);

// ---------------- Helpers ----------------
const actors = [leo, pip, mother, baker, ...extras];
const props = [tether, book, pinLoose, photoHeld, photoBig, photoPropped, ...cups];
const dieRest = q => { die.quaternion.copy(q); die.position.set(D.x, supportY(dieBody, q, dais.topY), D.z); };
function resetWorld() {
  for (const a of actors) a.root.visible = false;
  for (const p of props) p.visible = false;
  for (const o of Object.values(harness)) o.visible = true;
  ch.setLights(false); ch.setCrank(0); ch.setPaddle(0); ch.setPin(0); ch.pin.visible = true; ch.die.rotation.set(0, 0, 0);
  gate.setOpen(0); dais.tip.position.y = tipRest;
  dieRest(topQuaternion(3)); book.setOpen(1); book.setPage('contingency');
  tint.material.opacity = 0;
}
function put(a, pos, ry = 0, expr = null) {
  a.root.visible = true; for (const p of Object.values(a.pivots)) p.rotation.set(0, 0, 0);
  a.root.position.copy(pos); a.root.rotation.set(0, ry, 0); if (expr) setExpression(a, expr); return a;
}
const facing = (from, to) => Math.atan2(to.x - from.x, to.z - from.z);
function aim(pos, target, fov = 40) { camera.position.copy(pos); camera.lookAt(target); camera.fov = fov; }
const hand = (a, side) => { a.root.updateMatrixWorld(true); return a.parts[side + 'Arm'].localToWorld(V(0, -.95, .1)); };
// Floating resident: arms out, legs dangling, gentle bob (limbs on twos).
function float(a, t, height, seed = 0) {
  const tt = onTwos(t), w = Math.sin(tt * 2.4 + seed);
  a.root.position.y += height + .12 * Math.sin(t * 1.8 + seed) * a.root.scale.x;
  a.pivots.leftShoulder.rotation.set(-.2, 0, -1.25 - .2 * w); a.pivots.rightShoulder.rotation.set(-.2, 0, 1.25 + .2 * w);
  a.pivots.leftHip.rotation.x = .25 * w; a.pivots.rightHip.rotation.x = -.25 * w;
}
// Arms forward holding something at chest height.
function holdPose(a, lift = 1.15, spread = .12) {
  a.pivots.leftShoulder.rotation.set(-lift, 0, spread); a.pivots.rightShoulder.rotation.set(-lift, 0, -spread);
}
// Place the open notebook between Leo's hands, pages tilted up toward his face.
function holdBook(open = 1, lift = 1.15) {
  holdPose(leo, lift); leo.root.updateMatrixWorld(true);
  const mid = hand(leo, 'left').add(hand(leo, 'right')).multiplyScalar(.5);
  book.visible = true; book.setOpen(open);
  book.position.copy(mid).add(V(0, .15, 0).applyEuler(leo.root.rotation));
  book.rotation.set(-2.14, leo.root.rotation.y, Math.PI, 'YXZ');
}
// Leo tethered: rope from his harness ring to a world anchor.
function tie(anchor) { leo.root.updateMatrixWorld(true); tether.visible = true; tether.update(harness.ring.getWorldPosition(V()), anchor); }
// Plaza crowd (indices 12–21 by default) at fixed marks around the plaza.
const MARKS = [[-9, 6], [-6, 11], [14, 11], [12, -3], [-12, -2], [10, -8], [-6, -10], [5, -12], [-15, 5], [-16, 10]];
function crowd(t, {lift = 0, liftStart = 0, stagger = .25, look = true, count = 10, expr = 'curious', skip = () => false} = {}) {
  MARKS.slice(0, count).forEach(([x, z], k) => {
    if (skip(x, z)) return;
    const e = extras[12 + k], pos = V(P.x + x, .3, P.z + z);
    put(e, pos, facing(pos, D), null); idle(e, t, {seed: k});
    const u = lift ? ease((t - liftStart - k * stagger) / 1.1) : 0;
    if (u > 0) float(e, t, lift * u * (.7 + .3 * ((k * 7) % 3) / 2), k);
    if (look) e.pivots.head.rotation.x = -.12;
    setExpression(e, u > .1 ? (k % 3 === 0 ? 'shocked' : k % 3 === 1 ? 'excited' : 'scared') : expr);
  });
}
function plazaLight() { key.target.position.copy(P); key.position.copy(P).add(V(30, 50, 36)); }
function setLight(c) { key.target.position.copy(c); key.position.copy(c).add(V(30, 50, 36)); }
// Die rocking toward six: k=0 rests on `from`, k=1 rests on six.
const qToward = (from, k) => new T.Quaternion().slerpQuaternions(topQuaternion(from), topQuaternion(6), k);

// ---------------- Shots ----------------
// Each: [id, startFrame, endFrame, fn(t, u, dur)] → {focus?, close?, set?, tint?}
const SHOTS = [
  ['D01', 0, 66, (t, u) => { // establishing: die shows three; first residents lift
    crowd(t, {lift: 2.2, liftStart: 1.0, stagger: .12});
    aim(V(P.x + lerp(10, 9, ease(u)), lerp(16, 15.2, ease(u)), P.z + lerp(27, 25.5, ease(u))), V(P.x - 2, 4.0, P.z - 2), 57);
  }],
  ['D02', 66, 169, (t, u) => { // two residents rise in turn, three still visible behind
    crowd(t, {count: 10, lift: 3, liftStart: -2, skip: (x, z) => z > 4 || x > 9});
    const a = put(extras[2], V(P.x + 1.5, .3, P.z + 9), 2.9, null), b = put(extras[5], V(P.x + 9, .3, P.z + 6), -2.9, null);
    for (const [e, t0, h, s] of [[a, .3, 3.2, 1], [b, 1.0, 2.6, 2]]) { const k = ease((t - t0) / 1.2); float(e, t, h * k, s); setExpression(e, k > .2 ? (s === 1 ? 'shocked' : 'excited') : 'calm'); }
    aim(V(P.x + 5.5, 4.6, P.z + 27), V(P.x + 4.5, 6.4, P.z + 5), 44);
  }],
  ['D03', 169, 255, (t, u) => { // the baker braces, catches his stall, rise arrested
    stallA.updateMatrixWorld(true);
    const k = ease((t - .5) / .9);
    put(baker, stallA.localToWorld(V(0, .3, -1.7)), stallA.rotation.y, k > .3 ? 'scared' : 'shocked');
    baker.root.position.y += .7 * k;
    baker.pivots.leftShoulder.rotation.set(-1.25 + .25 * k, 0, .15); baker.pivots.rightShoulder.rotation.set(-1.25 + .25 * k, 0, -.15);
    baker.pivots.leftHip.rotation.x = .15 * k; baker.pivots.rightHip.rotation.x = -.1 * k;
    [[13, 14, 4.2], [18, -2, 5.5]].forEach(([x, z, h], k) => { const e = put(extras[14 + k], V(P.x + x, .3, P.z + z), 0, 'shocked'); float(e, t, h, k); });
    aim(stallA.localToWorld(V(-1.6, 5.0, 8.5)), stallA.localToWorld(V(0, 3.9, -1.2)), 38);
  }],
  ['D04', 255, 337, (t) => { // shoes leave the ground: calf/shoe insert with a growing air gap
    stallA.updateMatrixWorld(true);
    put(baker, stallA.localToWorld(V(0, .3, -1.7)), stallA.rotation.y, 'scared');
    const k = ease((t - .4) / .8); baker.root.position.y += .7 + .5 * k;
    baker.pivots.leftShoulder.rotation.set(-1.0, 0, .15); baker.pivots.rightShoulder.rotation.set(-1.0, 0, -.15);
    baker.pivots.leftHip.rotation.x = .12 + .1 * Math.sin(onTwos(t) * 5); baker.pivots.rightHip.rotation.x = -.12;
    aim(stallA.localToWorld(V(3.4, 1.2, -6.2)), stallA.localToWorld(V(0, 1.3, -1.7)), 42);
  }],
  ['D05', 337, 382, (t) => { // everyone rising — except Leo, tied to the clock tower
    const pos = V(P.x - .5, .3, P.z - 20.5); put(leo, pos, 0, 'serious');
    leo.root.position.y += .18; leo.pivots.leftShoulder.rotation.z = -.25; leo.pivots.rightShoulder.rotation.z = .25;
    tie(towerRing);
    [[4, 4, -17, 3.2], [-6, 6, -16, 4.5], [8, 3, -19, 5.2]].forEach(([x, i, z, h], k) => { const e = put(extras[12 + i], V(P.x + x, .3, P.z + z), facing(V(P.x + x, 0, P.z + z), D)); float(e, t, h, k); setExpression(e, 'shocked'); });
    aim(V(P.x + 3.6, 4.4, P.z - 10.5), V(P.x - .8, 4.3, P.z - 21), 40);
  }],
  ['D06', 382, 504, (t) => { // close: anchor ring, taut rope, harness edge; tiny settle
    put(leo, V(P.x - .5, .3, P.z - 20.5), 0, 'determined'); leo.root.position.y += .18 + .04 * Math.sin(t * 2.2);
    leo.pivots.head.rotation.y = -.25; tie(towerRing);
    aim(V(P.x + 3.2, 3.6, P.z - 16.8), V(P.x + .6, 3.9, P.z - 25.5), 44);
  }],
  ['D07', 504, 631, (t) => { // notebook: the lost-gravity contingency page; one tap
    put(leo, V(P.x - .5, .3, P.z - 20.5), 0, 'calm'); leo.root.position.y += .18; tie(towerRing);
    holdBook(1); book.setPage('contingency');
    if (t > 1.8 && t < 2.5) leo.pivots.rightShoulder.rotation.x = -1.25 - .12 * Math.sin((t - 1.8) / .7 * Math.PI);
    aim(leo.root.localToWorld(V(-1.9, 7.0, -1.1)), book.localToWorld(V(-.45, 0, 0)), 36);
  }],
  ['D08', 631, 693, (t) => { // flashback, rule one: loose cups float off the stall, feet stay planted
    stallB.updateMatrixWorld(true);
    cups.forEach((c, i) => { c.visible = true; const k = ease((t - .2 - i * .18) / 1.2); c.position.copy(stallB.localToWorld(V(-1.4 + i * 1.4, 2.65 + 2.2 * k, .5))); c.rotation.set(.4 * k * (i - 1), 0, .3 * k); });
    const e = put(extras[3], stallB.localToWorld(V(2.2, .3, 2.6)), stallB.rotation.y + Math.PI, 'curious'); idle(e, t); e.pivots.head.rotation.x = -.3;
    aim(stallB.localToWorld(V(-1.5, 3.4, 9)), stallB.localToWorld(V(0, 3.4, 0)), 40);
    return {tint: ['#d9a35a', .2]};
  }],
  ['D09', 693, 742, (t) => { // flashback, rule two: everyone walks backward (side profile)
    for (const [i, x0, z] of [[0, -18, -9.6], [1, -23, -11]]) {
      const e = extras[i]; e.root.visible = true; locomote(e, t, {from: [x0, .35, z], dir: [-1, 0]}); e.root.rotation.y += Math.PI; setExpression(e, i ? 'confused' : 'concerned');
    }
    setLight(V(-20, 0, -10));
    aim(V(-22, 4.2, 4.5), V(-21, 3.4, -10), 40);
    return {tint: ['#d9a35a', .2]};
  }],
  ['D10', 742, 793, (t) => { // flashback, rule three: people lift (three on the die behind)
    crowd(t, {lift: 2.6, liftStart: .1, stagger: .08});
    aim(V(P.x + 12, 6.5, P.z + 20), V(P.x + 1, 5.5, P.z + 1), 48);
    return {tint: ['#d9a35a', .2]};
  }],
  ['D11', 793, 886, (t) => { // never six: the six face rolls up… and is knocked away
    const k = t < 1.6 ? .5 * ease(t / 1.6) : t < 1.75 ? .5 - 1.8 * (t - 1.6) : Math.max(0, .23 - .23 * ease((t - 1.75) / .8));
    const jitter = t > 1.6 && t < 2.1 ? .03 * Math.sin(t * 60) : 0;
    dieRest(qToward(3, k).multiply(new T.Quaternion().setFromEuler(new T.Euler(jitter, 0, jitter))));
    aim(V(D.x + 10, 11.5, D.z + 11), V(D.x, 5.6, D.z), 40);
  }],
  ['D12', 886, 990, (t) => { // Leo's tallies: three identical wobbles
    put(leo, V(P.x - .5, .3, P.z - 20.5), 0, t < 1.4 ? 'curious' : 'confident'); leo.root.position.y += .18; tie(towerRing);
    holdBook(1); book.setPage('tallies');
    if (t > 1.2 && t < 2.6) leo.pivots.leftShoulder.rotation.x = -1.3;
    aim(leo.root.localToWorld(V(-1.5, 6.6, -.9)), book.localToWorld(V(.45, 0, 0)), 34);
  }],
  ['D13', 990, 1099, (t) => { // same wobble; lower crop reveals the brass tip
    const k = t < 1.7 ? .5 * ease(t / 1.7) : t < 1.85 ? .5 - 1.8 * (t - 1.7) : Math.max(0, .23 - .23 * ease((t - 1.85) / .8));
    dieRest(qToward(3, k));
    dais.tip.position.y = tipRest + (t > 1.55 && t < 2.6 ? .55 * Math.sin(Math.min(1, (t - 1.55) / .25) * Math.PI / 2) : 0);
    aim(V(D.x + 11, 6.4, D.z + 11), V(D.x + 1.2, 3.2, D.z + 1.2), 40);
  }],
  ['D14', 1099, 1220, (t) => { // re-clip to the hatch ring, then drop below the rim
    const h = hatchWorld();
    put(leo, V(h.x - 1.6, .3, h.z + .8), facing(V(h.x - 1.6, 0, h.z + .8), h), t < 1.6 ? 'serious' : 'determined');
    if (t < 1.6) { leo.pivots.rightShoulder.rotation.set(-1.0, 0, 0); leo.pivots.head.rotation.x = .3; }
    else { const k = ease((t - 1.6) / 2.0); leo.root.position.set(lerp(h.x - 1.6, h.x, ease((t - 1.6) / .5)), .3 - 6.5 * k * k, lerp(h.z + .8, h.z, ease((t - 1.6) / .5))); leo.pivots.leftShoulder.rotation.z = -.4; leo.pivots.rightShoulder.rotation.z = .4; }
    leo.root.updateMatrixWorld(true); tether.visible = t < 1.6 || leo.root.position.y > -1.5; if (tether.visible) tether.update(harness.ring.getWorldPosition(V()), ringWorld());
    [[0, -4, 12, 7], [1, 2, 18, 9], [2, 8, 8, 6]].forEach(([i, x, z, hgt], k) => { const e = put(extras[12 + i], V(P.x + x, .3, P.z - z), 0, 'excited'); float(e, t, hgt, k); });
    aim(V(D.x + 13, 4.6, D.z + 12), V(h.x, 2.0, h.z), 44);
  }],
  ['D15', 1220, 1332, (t) => { // cutaway: die support, paddle hinge, crank link, lock pin
    ch.setLights(true); const c = Math.max(0, t - .6) * 1.6; ch.setCrank(c); ch.setPaddle(.16 * Math.max(0, Math.sin(c * .8)));
    put(leo, V(C.x - 3.6, 0, C.z + 3.8), facing(V(C.x - 3.6, 0, C.z + 3.8), V(C.x + 2, 0, C.z)), t < 1 ? 'curious' : 'shocked'); idle(leo, t);
    leo.pivots.head.rotation.x = -.35;
    setLight(C); aim(V(C.x - 5.0, 4.4, C.z + 11.5), V(C.x - .2, 5.4, C.z - 1), 58);
  }],
  ['D16', 1332, 1442, (t) => { // insert: blade meets the underside, same kick, held displaced
    ch.setLights(true); const k = ease(t / 1.2); ch.setCrank(k * 2.2); ch.setPaddle(.17 * k);
    if (t > 1.15) ch.die.rotation.set(.05 * Math.exp(-(t - 1.15) * 3) * Math.sin((t - 1.15) * 40), 0, .06);
    setLight(C); aim(V(C.x + 5.5, 7.2, C.z + 8.5), V(C.x, 11.8, C.z + .6), 44);
  }],
  ['D17', 1442, 1495, (t) => { // Mayor Pip, hand on the crank; eyes flick up, guilty stop
    ch.setLights(true); ch.setCrank(2.2); ch.setPaddle(.1);
    ch.wheel.updateMatrixWorld(true); const handle = ch.wheel.localToWorld(V(1.0, 0, .35));
    const pos = V(C.x + 5.4, 0, C.z + 2.2); put(pip, pos, facing(pos, handle), t < .7 ? 'serious' : 'shame');
    pip.pivots.rightShoulder.rotation.set(-1.3, 0, 0); pip.root.updateMatrixWorld(true);
    pip.root.position.add(handle.clone().sub(hand(pip, 'right')).setY(0));
    pip.pivots.head.rotation.x = t > .7 ? -.25 : 0;
    setLight(C); aim(V(C.x + 9.2, 3.0, C.z + 6.2), V(C.x + 4.6, 2.6, C.z + 1.8), 34);
  }],
  ['D18', 1495, 1590, (t) => { // still a child: the old photo below his chin
    ch.setLights(true); const pos = V(C.x + 5, 0, C.z + 3.5); put(pip, pos, -.6, t < 1 ? 'sad' : 'pensive');
    holdPose(pip, 1.05); pip.root.updateMatrixWorld(true);
    photoHeld.visible = true; photoHeld.position.copy(hand(pip, 'left').add(hand(pip, 'right')).multiplyScalar(.5)).add(V(0, .35, 0)); photoHeld.rotation.set(-.35, pip.root.rotation.y, 0, 'YXZ');
    pip.pivots.head.rotation.x = .18 * ease((t - .5) / .5);
    setLight(C); aim(V(C.x + 3.0, 3.1, C.z + 8.5), V(C.x + 5, 2.5, C.z + 3.5), 32);
  }],
  ['D19', 1590, 1710, (t, u) => { // then and now: the family photo, then the older mother today
    if (t < 2.0) {
      photoBig.visible = true; photoBig.position.set(C.x - 30, 4, C.z); photoBig.rotation.set(0, 0, 0);
      aim(V(C.x - 30 + lerp(-.2, .25, t / 2), 4.1, C.z + lerp(6.2, 5.0, ease(t / 2))), V(C.x - 30, 4.1, C.z), 40);
      setLight(C); return {tint: ['#d9a35a', .1]};
    }
    const k = (t - 2) / 2; put(mother, V(H.x + 2.8, 0, H.z + .5), 0, 'pensive'); idle(mother, t); mother.pivots.head.rotation.y = .3;
    setLight(H); aim(V(H.x + lerp(6.5, 5.6, ease(k)), 4.6, H.z + lerp(13, 11.5, ease(k))), V(H.x + 2.8, 4.2, H.z + .5), 36);
  }],
  ['D20', 1710, 1768, (t) => { // his hands at the photo's corners; a small tilt to see it
    ch.setLights(true); const pos = V(C.x + 5, 0, C.z + 3.5); put(pip, pos, -.6, 'sad');
    holdPose(pip, 1.05 + .08 * ease(t / .8)); pip.root.updateMatrixWorld(true);
    photoHeld.visible = true; photoHeld.position.copy(hand(pip, 'left').add(hand(pip, 'right')).multiplyScalar(.5)).add(V(0, .35, 0)); photoHeld.rotation.set(-.35 - .25 * ease(t / .8), pip.root.rotation.y, 0, 'YXZ');
    pip.pivots.head.rotation.x = .3;
    setLight(C); aim(pip.root.localToWorld(V(.3, 3.6, 3.4)), photoHeld.position.clone(), 36);
  }],
  ['D21', 1768, 1905, (t) => { // whisper: worried face, glance away → the gate still closed
    if (t < 2.6) {
      ch.setLights(true); const pos = V(C.x + 5, 0, C.z + 3.5); put(pip, pos, -.6, t < 1.3 ? 'concerned' : 'scared'); idle(pip, t);
      pip.pivots.head.rotation.y = t > 1.1 ? .45 * ease((t - 1.1) / .3) : 0;
      setLight(C); aim(pip.root.localToWorld(V(-.4, 2.9, 4.2)), pip.parts.head.getWorldPosition(V()), 30);
      return {focus: pip.parts.head.getWorldPosition(V()), close: true};
    }
    setLight(G); aim(V(G.x + 2.2, 6.0, G.z + lerp(30, 27.5, ease((t - 2.6) / 2))), V(G.x, 5.4, G.z), 46);
  }],
  ['D22', 1905, 1997, (t) => { // Leo, no answer: notebook lowered below his chin
    ch.setLights(true); const pos = V(C.x + 7.2, 0, C.z + 4.5); put(leo, pos, -.9, t < 1.2 ? 'concerned' : 'pensive');
    holdBook(1, .7 - .15 * ease(t / 1.4)); book.setPage('tallies');
    setLight(C); aim(leo.root.localToWorld(V(.6, 5.1, 6.5)), leo.parts.head.getWorldPosition(V()).add(V(0, -.6, 0)), 32);
    return {focus: leo.parts.head.getWorldPosition(V()), close: true};
  }],
  ['D23', 1997, 2129, (t) => { // Leo pulls the pin… match cut to Pip's open palm
    ch.setLights(true); setLight(C);
    if (t < 2.2) {
      const out = ease((t - .6) / .9); ch.setPin(out);
      ch.pin.updateMatrixWorld(true); const pinW = ch.pin.localToWorld(V(.65, 0, 0));
      const pos = V(C.x + 6.6, 0, C.z + 1.6); put(leo, pos, -1.7, 'serious');
      leo.pivots.leftShoulder.rotation.set(-1.25, 0, 0); leo.root.updateMatrixWorld(true);
      leo.root.position.add(pinW.clone().sub(hand(leo, 'left')).setY(0)); leo.root.position.x += .15;
      aim(V(C.x + 6.4, 3.6, C.z + 5.2), V(C.x + 4.7, 2.5, C.z + .5), 36);
      return;
    }
    ch.pin.visible = false; ch.setPin(1);
    const pos = V(C.x + 5, 0, C.z + 3.5); put(pip, pos, -.6, t < 3.0 ? 'confused' : 'shocked');
    pip.pivots.rightShoulder.rotation.set(-1.35, 0, 0); pip.root.updateMatrixWorld(true);
    const palm = hand(pip, 'right').add(V(0, .12, 0));
    pinLoose.visible = true; const drop = ease((t - 2.4) / .6); pinLoose.position.copy(palm).add(V(0, 1.5 * (1 - drop), 0)); pinLoose.rotation.set(0, pip.root.rotation.y, 0);
    aim(V(C.x + 3.0, 3.1, C.z + 8.5), V(C.x + 5, 2.4, C.z + 3.5), 34);
  }],
  ['D24', 2129, 2224, (t) => { // "You can put it back." Pip and pin in front; Leo leaves the frame
    ch.setLights(true); ch.pin.visible = false; setLight(C);
    const pos = V(C.x + 5, 0, C.z + 3.5); put(pip, pos, -.6, t < 1.6 ? 'concerned' : 'pensive');
    pip.pivots.rightShoulder.rotation.set(-1.1, 0, 0); pip.root.updateMatrixWorld(true);
    pinLoose.visible = true; pinLoose.position.copy(hand(pip, 'right').add(V(0, .12, 0))); pinLoose.rotation.set(0, pip.root.rotation.y, 0);
    leo.root.visible = true; locomote(leo, t, {from: [C.x + 7.6, 0, C.z + 1.2], dir: [-.85, -.53], t0: .5}); setExpression(leo, 'calm');
    aim(pip.root.localToWorld(V(-.6, 2.8, 4.6)), pip.parts.head.getWorldPosition(V()).add(V(0, -.4, 0)), 36);
    return {focus: pip.parts.head.getWorldPosition(V()), close: true};
  }],
  ['D25', 2224, 2339, (t) => { // the next mornings: not six, and not six again (dawn)
    dieRest(topQuaternion(t < 1.9 ? 2 : 4));
    crowd(t, {count: 6, expr: 'pensive', skip: (x, z) => z > 4});
    aim(V(D.x + 13, 21, D.z + 19), V(D.x + 1, 5, D.z + 1), 36);
    return {tint: ['#ff9a4d', .12]};
  }],
  ['D26', 2339, 2454, (t) => { // five mornings: two more holds, Pip at the edge holding the pin
    dieRest(topQuaternion(t < 1.9 ? 5 : 1));
    crowd(t, {count: 6, expr: 'pensive', skip: (x, z) => z > 4});
    const pos = V(D.x + 9.5, .3, D.z + 9.0); put(pip, pos, facing(pos, D), 'pensive');
    pip.pivots.rightShoulder.rotation.set(-.7, 0, 0); pip.root.updateMatrixWorld(true);
    pinLoose.visible = true; pinLoose.position.copy(hand(pip, 'right'));
    aim(V(D.x + 13, 21, D.z + 19), V(D.x + 1, 5, D.z + 1), 36);
    return {tint: ['#ff9a4d', .12]};
  }],
  ['D27', 2454, 2585, (t) => { // almost: pin to the empty sleeve, stops; looks at the photo; withdraws
    ch.setLights(true); ch.pin.visible = false; setLight(C);
    photoPropped.visible = true; photoPropped.position.set(C.x + 3.2, 2.85 + .45, C.z + .55); photoPropped.rotation.set(-.25, .2, 0);
    const sleeveW = ch.sleeve.getWorldPosition(V());
    const pos = V(C.x + 6.0, 0, C.z + 2.2); put(pip, pos, facing(pos, sleeveW), t < 2.2 ? 'serious' : t < 3.0 ? 'sad' : 'pensive');
    const reach = t < 1.6 ? ease(t / 1.6) : t < 2.4 ? 1 : 1 - ease((t - 2.4) / 1.0);
    pip.pivots.rightShoulder.rotation.set(-.6 - .85 * reach, 0, 0); pip.root.updateMatrixWorld(true);
    pinLoose.visible = true; pinLoose.position.copy(hand(pip, 'right')); pinLoose.rotation.set(0, pip.root.rotation.y + Math.PI / 2, 0);
    pip.pivots.head.rotation.set(t > 2.0 && t < 3.2 ? .35 : 0, t > 2.0 && t < 3.2 ? -.4 : 0, 0);
    aim(V(C.x + 1.2, 3.3, C.z + 3.8), V(C.x + 5.0, 2.3, C.z + 1.7), 40);
  }],
  ['D28', 2585, 2669, (t, u) => { // the sixth sunrise: everyone waits; the die begins to turn
    crowd(t, {count: 10, expr: 'curious'});
    dieRest(qToward(3, .12 * ease(t / 2.8)));
    aim(V(P.x + lerp(10, 9.2, u), lerp(16, 15.2, u), P.z + lerp(27, 25.6, u)), V(P.x - 2, 4.0, P.z - 2), 57);
    return {tint: ['#ff9a4d', .1]};
  }],
  ['D29', 2669, 2716, (t) => { // it rocks toward six
    dieRest(qToward(3, .12 + .55 * ease(t / 1.57)));
    aim(V(D.x + 9.5, 15, D.z + 11.5), V(D.x, 6.8, D.z), 40);
  }],
  ['D30', 2716, 2787, (t) => { // Pip reaches for the pin… and stops himself
    ch.setLights(true); ch.pin.visible = false; setLight(C);
    const sleeveW = ch.sleeve.getWorldPosition(V());
    const pos = V(C.x + 6.0, 0, C.z + 2.2); put(pip, pos, facing(pos, sleeveW), t < 1.1 ? 'nervous' : 'determined');
    const reach = t < .9 ? ease(t / .9) * .7 : .7 - .7 * ease((t - .9) / .5);
    pip.pivots.rightShoulder.rotation.set(-.6 - .85 * reach, 0, 0); pip.root.updateMatrixWorld(true);
    pinLoose.visible = true; pinLoose.position.copy(hand(pip, 'right')); pinLoose.rotation.set(0, pip.root.rotation.y + Math.PI / 2, 0);
    aim(V(C.x + 1.2, 3.3, C.z + 3.8), V(C.x + 5.2, 2.3, C.z + 1.9), 38);
  }],
  ['D31', 2787, 2850, (t) => { // the die settles (damped), no number swaps
    const k = .67 + .33 * (1 - Math.exp(-t * 3) * Math.cos(t * 9));
    dieRest(qToward(3, Math.min(1, k)));
    aim(V(D.x + 9.5, 15, D.z + 11.5), V(D.x, 6.8, D.z), 40);
  }],
  ['D32', 2850, 2898, (t, u) => { // six
    dieRest(topQuaternion(6));
    crowd(t, {count: 4, expr: 'excited'});
    aim(V(D.x + lerp(7, 5.6, ease(u)), lerp(19, 17, ease(u)), D.z + lerp(10, 8.4, ease(u))), V(D.x, 7.4, D.z), 40);
  }],
  ['D33', 2898, 2985, (t) => { // the town gate swings open
    gate.setOpen(ease((t - .3) / 1.6)); setLight(G);
    aim(V(G.x + 2.2, 6.0, G.z + 28), V(G.x, 5.2, G.z - 2), 46);
  }],
  ['D34', 2985, 3090, (t) => { // Pip runs through the open gate, down the road
    gate.setOpen(1); setLight(G);
    pip.root.visible = true; locomote(pip, t, {gait: 'run', from: [G.x + 1.2, .1, G.z + 9], dir: [-.04, -1]}); setExpression(pip, 'excited');
    aim(V(G.x + 3.5, 6.0, G.z + 27), V(G.x + .4, 3.6, G.z - 6), 46);
  }],
  ['D35', 3090, 3230, (t) => { // an older woman in the doorway; she says his name
    setLight(H);
    put(mother, V(H.x + 2.8, 0, H.z + .55), 0, t < 1.3 ? 'curious' : t < 2.8 ? 'shocked' : 'pleased'); idle(mother, t);
    if (t > 3.2) mother.pivots.rightShoulder.rotation.set(-.75 * ease((t - 3.2) / .6), 0, -.1);
    put(pip, V(H.x + 2.4, 0, H.z + 5.0), Math.PI, 'nervous'); idle(pip, t, {seed: 3});
    aim(V(H.x + 4.0, 3.3, H.z + 9.6), V(H.x + 2.8, 4.5, H.z + .5), 36);
  }],
  ['D36', 3230, 3344, (t, u) => { // inside: the small chair by the kitchen table
    setLight(I);
    aim(V(I.x + lerp(6.2, 5.2, ease(u)), 1.9, I.z + lerp(4.2, 3.4, ease(u))), V(I.x + 2.4, 1.8, I.z - 1.8), 40);
  }],
  ['D37', 3344, 3389, (t) => { // "We kept your chair."
    setLight(I);
    put(mother, V(I.x - 1.0, 0, I.z + .6), .5, 'happy'); idle(mother, t);
    mother.pivots.head.rotation.x = .14 * Math.max(0, Math.sin(Math.min(1, t / .9) * Math.PI));
    aim(V(I.x + 2.6, 5.0, I.z + 7.2), V(I.x - .8, 4.4, I.z + .2), 34);
    return {focus: mother.parts.head.getWorldPosition(V()), close: true};
  }],
  ['D38', 3389, 3513, (t) => { // Leo at the open gate closes his notebook without planning tomorrow
    gate.setOpen(1); setLight(G);
    put(leo, V(G.x - 2.0, .1, G.z - .5), .6, t < 1.5 ? 'pensive' : 'pleased');
    holdBook(1 - ease((t - 1.5) / .55), 1.0 - .25 * ease((t - 2.2) / .8)); book.setPage('tallies');
    aim(V(G.x + 6.5, 5.2, G.z + 11), V(G.x - 2.5, 4.4, G.z - 3), 46);
  }],
];
export const CUTS = SHOTS.map(s => s[1]).concat(FRAMES);
const shotAt = f => SHOTS.find(s => f >= s[1] && f < s[2]);

export function renderFrame(f, width = 1080) {
  if (!Number.isInteger(f) || f < 0 || f >= FRAMES) throw Error('frame out of range');
  const t0 = performance.now(), height = Math.round(width * 16 / 9);
  renderer.setSize(width, height); camera.aspect = width / height;
  const [id, a, b, fn] = shotAt(f), dur = (b - a) / FPS, t = (f - a) / FPS, u = (f - a) / Math.max(1, b - a - 1);
  resetWorld(); plazaLight();
  const r = fn(t, u, dur) ?? {};
  if (r.tint) { tint.material.color.set(r.tint[0]); tint.material.opacity = r.tint[1]; }
  camera.updateProjectionMatrix(); scene.updateMatrixWorld(true);
  look.render(r.focus ?? null, !!r.close);
  const gl = renderer.getContext(); gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array(4));
  return {frame: f, shot: id, width, height, ms: performance.now() - t0};
}
window.__sequence = {renderFrame, FPS, FRAMES, CUTS, SHOTS: SHOTS.map(([id, a, b]) => [id, a, b])};
