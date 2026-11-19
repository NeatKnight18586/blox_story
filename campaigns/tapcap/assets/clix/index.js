// campaigns/tapcap/assets/clix — Clix (sponsor talent) as a stylized giant, built from primitives (prompt §3).
//   createGlovedHand({pose: 'reach' | 'tap' | 'doubleTap', side: 1 | -1}) → Group (wrist at origin, fingers toward −y)
//   createClixBust() → Group (chin ≈ y 0, head ≈ 1 unit tall)
// Nothing on him carries a mark: plain silver diver watch with a plain black bezel (no ticks, numerals, text, logo or crown guard
// markings), plain blue nitrile gloves, plain white coat, plain black tee (TC-04 manual check).
import * as T from 'three';

const std = (color, o = {}) => new T.MeshPhysicalMaterial({color, roughness: .5, ...o});
const GLOVE = () => std('#2E73FF', {roughness: .42, sheen: .8, sheenColor: new T.Color('#9cc4ff'), sheenRoughness: .4, clearcoat: .35, clearcoatRoughness: .35});
const COAT = () => std('#F4F5F2', {roughness: .78, sheen: .4, sheenColor: new T.Color('#ffffff')});
const STEEL = () => std('#D9DDE2', {metalness: 1, roughness: .18});
const BLACK = () => std('#0E0F12', {roughness: .35, clearcoat: .6});
const seg = (r, a, b, m) => { const g = new T.CapsuleGeometry(r, a.distanceTo(b), 6, 16), mesh = new T.Mesh(g, m);
  mesh.position.copy(a).add(b).multiplyScalar(.5); mesh.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), b.clone().sub(a).normalize()); return mesh; };

// finger = 3 phalanges; curl angles per joint (radians), bending toward the palm (+z)
const POSES = {
  reach: {idx: [.15, .2, .15], mid: [.2, .25, .2], ring: [.28, .3, .25], pinky: [.35, .35, .3], thumb: [.5, .2]},
  tap: {idx: [.05, .08, .05], mid: [1.3, 1.5, 1.1], ring: [1.35, 1.5, 1.1], pinky: [1.35, 1.5, 1.1], thumb: [1.1, .7]},
  doubleTap: {idx: [.05, .08, .05], mid: [.05, .08, .05], ring: [1.35, 1.5, 1.1], pinky: [1.35, 1.5, 1.1], thumb: [1.1, .7]},
};
export function createGlovedHand({pose = 'reach', side = 1} = {}) {
  const P = POSES[pose] ?? POSES.reach, g = new T.Group(), glove = GLOVE(); g.name = `clixHand_${pose}`;
  // palm: rounded slab, fingers hang toward −y, palm faces +z
  const palm = new T.Mesh(new T.CapsuleGeometry(.34, .22, 8, 20), glove); palm.scale.set(1.2, .9, .42); palm.position.y = -.48; g.add(palm);
  const fingers = [['idx', -.27, .72, .088], ['mid', -.09, .8, .09], ['ring', .09, .74, .086], ['pinky', .26, .58, .076]];
  for (const [k, x, len, r] of fingers) {
    let p = new T.Vector3(x * side, -.8, 0), dir = new T.Vector3(0, -1, 0); const L = [len * .42, len * .32, len * .26];
    for (let j = 0; j < 3; j++) { dir.applyAxisAngle(new T.Vector3(1, 0, 0), -P[k][j]); const q = p.clone().add(dir.clone().multiplyScalar(L[j]));
      g.add(seg(r * (1 - j * .06), p, q, glove)); p = q; }
  }
  { let p = new T.Vector3(-.34 * side, -.38, .16), dir = new T.Vector3(-.75 * side, -.55, .35).normalize();   // thumb
    for (let j = 0; j < 2; j++) { dir.applyAxisAngle(new T.Vector3(0, 0, 1), side * P.thumb[j] * .5).applyAxisAngle(new T.Vector3(1, 0, 0), -P.thumb[j] * .5);
      const q = p.clone().add(dir.clone().multiplyScalar(j ? .2 : .26)); g.add(seg(.1, p, q, glove)); p = q; } }
  // rolled glove cuff, wrist, watch, lab-coat cuff
  const cuffG = new T.Mesh(new T.TorusGeometry(.33, .05, 12, 40), glove); cuffG.rotation.x = Math.PI / 2; cuffG.scale.set(1.1, .55, 1); cuffG.position.y = -.06; g.add(cuffG);
  const wrist = new T.Mesh(new T.CylinderGeometry(.31, .33, .5, 32), glove); wrist.scale.z = .62; wrist.position.y = .12; g.add(wrist);
  const watch = new T.Group(); watch.position.set(0, .16, 0); g.add(watch);
  for (let i = 0; i < 18; i++) { const a = i / 18 * Math.PI * 2, link = new T.Mesh(new T.BoxGeometry(.11, .17, .05), STEEL()); link.position.set(Math.sin(a) * .33, 0, Math.cos(a) * .215); link.rotation.y = a; watch.add(link); }
  const caseM = new T.Mesh(new T.CylinderGeometry(.17, .17, .09, 40), STEEL()); caseM.rotation.x = Math.PI / 2; caseM.position.z = -.24; watch.add(caseM);
  const bezel = new T.Mesh(new T.TorusGeometry(.15, .03, 12, 40), BLACK()); bezel.position.z = -.29; watch.add(bezel);
  const dial = new T.Mesh(new T.CircleGeometry(.125, 40), std('#14171c', {roughness: .25})); dial.rotation.y = Math.PI; dial.position.z = -.287; watch.add(dial);
  for (const [len, ang] of [[.08, .6], [.11, 2.4]]) { const h = new T.Mesh(new T.BoxGeometry(.014, len, .004), STEEL()); h.geometry.translate(0, len / 2, 0); h.rotation.set(0, Math.PI, ang); h.position.z = -.292; watch.add(h); }
  const glass = new T.Mesh(new T.CircleGeometry(.125, 40), new T.MeshPhysicalMaterial({transmission: 1, roughness: 0, thickness: .01, transparent: true, opacity: .25, clearcoat: 1})); glass.rotation.y = Math.PI; glass.position.z = -.296; watch.add(glass);
  const crown = new T.Mesh(new T.CylinderGeometry(.03, .03, .05, 16), STEEL()); crown.rotation.z = Math.PI / 2; crown.position.set(.19 * side, 0, -.24); watch.add(crown);
  const coat = new T.Mesh(new T.CylinderGeometry(.5, .44, .6, 40, 1, true), COAT()); coat.material.side = T.DoubleSide; coat.scale.z = .78; coat.position.y = .66; coat.rotation.x = .12; g.add(coat);
  for (let i = 0; i < 3; i++) { const fold = new T.Mesh(new T.TorusGeometry(.49 - i * .01, .022, 8, 40, Math.PI * 1.2), COAT()); fold.rotation.set(Math.PI / 2 + .12, 0, .5 + i * 1.7); fold.scale.y = .78; fold.position.y = .55 + i * .14; g.add(fold); }
  const hem = new T.Mesh(new T.TorusGeometry(.45, .035, 10, 40), COAT()); hem.rotation.x = Math.PI / 2; hem.scale.y = .8; hem.position.y = .34; g.add(hem);
  return g;
}

export function createClixBust({gaze = [0, 0]} = {}) {
  const g = new T.Group(); g.name = 'clixBust';
  const skin = std('#E7B48F', {roughness: .55, sheen: .5, sheenColor: new T.Color('#ffd9c2')}), hairM = std('#3A2416', {roughness: .6, clearcoat: .25});
  // head: slightly oversized, soft jaw (stylized proportions)
  const head = new T.Mesh(new T.SphereGeometry(.5, 48, 36), skin); head.scale.set(.9, 1.04, .92); head.position.y = .55; g.add(head);
  const jaw = new T.Mesh(new T.SphereGeometry(.4, 40, 30), skin); jaw.scale.set(.95, .7, .9); jaw.position.set(0, .3, .06); g.add(jaw);
  for (const s of [-1, 1]) {   // ears + stud earring (left ear only)
    const ear = new T.Mesh(new T.SphereGeometry(.1, 20, 16), skin); ear.scale.set(.45, 1, .7); ear.position.set(s * .45, .52, -.02); g.add(ear);
    if (s < 0) { const stud = new T.Mesh(new T.SphereGeometry(.018, 12, 10), STEEL()); stud.position.set(-.475, .44, .02); g.add(stud); }
    // eyes: big brown irises, white sclera, highlight
    const eye = new T.Group(); eye.position.set(s * .17, .6, .38); eye.rotation.set(gaze[0], gaze[1], 0); g.add(eye);
    const sc = new T.Mesh(new T.SphereGeometry(.105, 32, 24), std('#FBFBF8', {roughness: .1, clearcoat: 1})); sc.scale.z = .6; eye.add(sc);
    const ir = new T.Mesh(new T.CircleGeometry(.068, 32), std('#6B3E1F', {roughness: .2})); ir.position.z = .064; eye.add(ir);
    const pu = new T.Mesh(new T.CircleGeometry(.032, 24), std('#120b07', {roughness: .1})); pu.position.z = .065; eye.add(pu);
    const hl = new T.Mesh(new T.CircleGeometry(.016, 16), new T.MeshBasicMaterial({color: '#ffffff'})); hl.position.set(.025, .03, .066); eye.add(hl);
    const lid = new T.Mesh(new T.SphereGeometry(.112, 32, 16, 0, Math.PI * 2, 0, Math.PI * .3), skin); lid.rotation.x = .1; eye.add(lid);   // upper lid (smile squint)
    const brow = new T.Mesh(new T.CapsuleGeometry(.022, .13, 4, 10), hairM); brow.rotation.z = Math.PI / 2 + s * .12; brow.position.set(s * .17, .76, .4); g.add(brow);
    const cheek = new T.Mesh(new T.SphereGeometry(.09, 20, 14), std('#EDB08E', {roughness: .6})); cheek.scale.set(1, .7, .5); cheek.position.set(s * .25, .43, .34); g.add(cheek);
  }
  const nose = new T.Mesh(new T.SphereGeometry(.06, 24, 18), skin); nose.scale.set(1, .9, 1.1); nose.position.set(0, .49, .46); g.add(nose);
  { const curve = new T.QuadraticBezierCurve3(new T.Vector3(-.13, .36, .41), new T.Vector3(0, .28, .47), new T.Vector3(.13, .36, .41));   // warm closed smile
    g.add(new T.Mesh(new T.TubeGeometry(curve, 24, .014, 8, false), std('#8A3F33', {roughness: .5}))); }
  // hair: curly messy fringe on top falling onto the forehead, short skin-faded sides (vertex-colour fade hair → skin)
  { const sh = new T.SphereGeometry(.505, 48, 36, 0, Math.PI * 2, 0, Math.PI * .62), col = [], p = sh.attributes.position, cH = new T.Color('#3A2416'), cS = new T.Color('#E7B48F');
    for (let i = 0; i < p.count; i++) { const y = p.getY(i) / .505, side = Math.abs(p.getX(i)) / .505; const z = p.getZ(i) / .505, face = 1 - T.MathUtils.smoothstep(z, .25, .5) * (1 - T.MathUtils.smoothstep(y, .5, .7)); const top = T.MathUtils.smoothstep(y, .38, .62), fade = T.MathUtils.smoothstep(y, -.3, .4) * .78 * (1 - T.MathUtils.smoothstep(z, .15, .45)); const t = Math.max(top, fade) * face; const c = cS.clone().lerp(cH, t); col.push(c.r, c.g, c.b); }
    sh.setAttribute('color', new T.Float32BufferAttribute(col, 3)); const m = new T.Mesh(sh, std('#ffffff', {vertexColors: true, roughness: .55, sheen: .5, sheenColor: new T.Color('#ffd9c2')})); m.scale.set(.92, 1.05, .94); m.position.y = .56; g.add(m); }
  const rnd = (i => () => (i = (i * 16807) % 2147483647) / 2147483647)(7);
  for (let i = 0; i < 70; i++) { const a = rnd() * Math.PI * 2, rr = Math.sqrt(rnd()) * .36, front = Math.cos(a) * rr;
    const c = new T.Mesh(new T.SphereGeometry(.07 + rnd() * .04, 14, 10), hairM); c.position.set(Math.sin(a) * rr * 1.1, 1.0 - rr * rr * .9 + rnd() * .05, front * .95 + .02); g.add(c); }
  for (let i = 0; i < 9; i++) { const x = -.28 + i * .07 + (rnd() - .5) * .03, c = new T.Mesh(new T.SphereGeometry(.06 + rnd() * .025, 14, 10), hairM);   // fringe curls on the forehead
    c.position.set(x, .86 - Math.abs(x) * .25 - rnd() * .06, .37 - Math.abs(x) * .25); g.add(c); }
  // neck, black tee, thin silver chain, open white lab coat with lapels
  const neck = new T.Mesh(new T.CylinderGeometry(.16, .18, .3, 24), skin); neck.position.y = .02; g.add(neck);
  const tee = new T.Mesh(new T.CylinderGeometry(.42, .62, .7, 40), std('#121316', {roughness: .85})); tee.scale.z = .62; tee.position.y = -.42; g.add(tee);
  const chain = new T.Mesh(new T.TorusGeometry(.2, .008, 8, 60, Math.PI), STEEL()); chain.rotation.set(Math.PI * .6, 0, Math.PI); chain.position.set(0, -.07, .1); g.add(chain);
  { const yoke = new T.Mesh(new T.CapsuleGeometry(.24, .62, 8, 24), COAT()); yoke.rotation.z = Math.PI / 2; yoke.scale.set(1, 1, .62); yoke.position.set(0, -.2, -.05); g.add(yoke);
    const body = new T.Mesh(new T.CylinderGeometry(.6, .7, .8, 48, 1, true, Math.PI * .12, Math.PI * 1.76), COAT()); body.material.side = T.DoubleSide; body.scale.z = .62; body.position.y = -.55; g.add(body); }
  for (const s of [-1, 1]) {
    const lap = new T.Shape(); lap.moveTo(0, 0); lap.lineTo(.16 * s, -.02); lap.lineTo(.07 * s, -.5); lap.lineTo(0, 0);
    const lm = new T.Mesh(new T.ExtrudeGeometry(lap, {depth: .025, bevelEnabled: true, bevelSize: .008, bevelThickness: .008, bevelSegments: 2}), COAT()); lm.position.set(s * .2, -.1, .3); lm.rotation.set(-.12, -s * .45, 0); g.add(lm);
  }
  return g;
}
