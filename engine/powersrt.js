// engine/powersrt.js — tuft 2B POWERS + PROPS, the renderer side (three). Maths: engine/powers.js (pure, seeded, on ones).
// Opt-in: built only when a shot carries `powers` / `fizzles` / `cage` / `chains` or the spec lists `props2b`. Every FX family is ONE
// InstancedMesh (flame cards, embers, bolt + trail segments, fly ribbon, chain pieces); the lantern sea is ONE InstancedMesh (1,500).
// Glow parts are MeshBasic at HDR (× FX_HDR under post 'cine') so only they bloom; a cyan PointLight follows an active cyanFire.
import * as T from 'three';
import * as PW from './powers.js';
import * as B from './beast.js';

export const FX_HDR = {fire: 1.25, bolt: 4.0, fly: 2.4, lantern: 2.0, ground: 1.0};
const COL = {fireCore: '#E8FFFF', fire: '#2FE6FF', fireTip: '#0B7FD9', ember: '#9FF6FF', bolt: '#FFF27A', trail: '#FFE21A', fly: '#FF8A1E', flyTip: '#FF3D0A', smoke: '#8E949B', iron: '#2A2C31', cloth: '#7A1E22'};
export function createPowers({scene, spec, shots, FPS, hdr, cast, beasts, groundY = () => 0}) {
  const ev = key => shots.flatMap(sh => [].concat(sh[key] ?? []).map(e => ({...e, t: sh.start / FPS + (e.at ?? 0)})));
  const powers = ev('powers'), fizzles = ev('fizzles'), cages = ev('cage'), chains = ev('chains'), k = n => hdr ? FX_HDR[n] : 1;
  const breathers = Object.entries(cast).filter(([, x]) => x.beast && x.a?.P?.name === 'NIGHTFANG').map(([n]) => n);
  const inst = (geo, n, col, blend = T.AdditiveBlending, name = 'fx') => { const m = new T.InstancedMesh(geo, new T.MeshBasicMaterial({color: '#ffffff', transparent: true, blending: blend, depthWrite: false, fog: false, toneMapped: !hdr}), n);
    m.instanceColor = new T.InstancedBufferAttribute(new Float32Array(n * 3), 3); m.frustumCulled = false; m.count = 0; m.name = name; m.renderOrder = 3; m.userData.live = true; m.userData.col = col; scene.add(m); return m; };
  const needFire = powers.some(p => p.kind === 'cyanFire') || breathers.length, needBolt = powers.some(p => p.kind === 'lightning'), needFly = powers.some(p => p.kind === 'fly');
  const flames = needFire ? inst(new T.OctahedronGeometry(1, 0), 1400, COL.fire, T.AdditiveBlending, 'fxFire') : null, embersM = needFire ? inst(new T.OctahedronGeometry(1, 0), 200, COL.ember, T.AdditiveBlending, 'fxEmbers') : null;
  const gtex = (() => { const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d'), g = x.createRadialGradient(32, 32, 0, 32, 32, 32); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(.5, 'rgba(255,255,255,.35)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, 64, 64); const t = new T.CanvasTexture(c); return t; })();
  const ground = breathers.length ? (() => { const m = inst(new T.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), 12, COL.fire, T.AdditiveBlending, 'fxGroundGlow'); m.material.map = gtex; return m; })() : null;   // P3: the breath lights the ground (baked sets ignore point lights)
  const light = needFire ? new T.PointLight('#43E8FF', 0, 16, 1.4) : null; if (light) { light.name = 'fxFireLight'; scene.add(light); }
  const segs = needBolt ? inst(new T.BoxGeometry(1, 1, 1), 160, COL.bolt, T.AdditiveBlending, 'fxBolts') : null, ribbon = needFly ? inst(new T.OctahedronGeometry(1, 0), 80, COL.fly, T.AdditiveBlending, 'fxFly') : null;
  const smoke = fizzles.length ? new T.Mesh(new T.IcosahedronGeometry(1, 1), new T.MeshStandardMaterial({color: COL.smoke, roughness: 1, transparent: true, flatShading: true, depthWrite: false})) : null; if (smoke) { smoke.visible = false; smoke.name = 'fxSmoke'; scene.add(smoke); }
  const links = chains.length ? new T.InstancedMesh(new T.TorusGeometry(.5, .16, 4, 8), new T.MeshStandardMaterial({color: COL.iron, roughness: .5, metalness: .6, flatShading: true}), 4 * PW.CHAINS.n) : null; if (links) { links.frustumCulled = false; links.count = 0; links.name = 'fxChainPieces'; scene.add(links); }
  // ---- props (spec.props2b [{kind, at: [x, y, z], yaw, scale, around?}]) ------------------------------------------------------
  const props = {}; for (const [i, p] of (spec.props2b ?? []).entries()) props[p.id ?? p.kind + i] = buildProp(p);
  function buildProp(p) {
    const g = new T.Group(), std = (c, o = {}) => new T.MeshStandardMaterial({color: c, roughness: .55, flatShading: true, ...o}), add = (geo, m, pos, rot) => { const x = new T.Mesh(geo, m); x.position.set(...pos); if (rot) x.rotation.set(...rot); g.add(x); return x; };
    let anim = null;
    if (p.kind === 'spider') { const b = std('#1B1B1F'); add(new T.IcosahedronGeometry(.07, 0), b, [0, 0, 0]); add(new T.IcosahedronGeometry(.05, 0), b, [0, 0, .09]);
      for (let i = 0; i < 8; i++) { const s = i < 4 ? 1 : -1, a = (i % 4 - 1.5) * .45; add(new T.BoxGeometry(.012, .012, .14), b, [s * .07, -.02, Math.sin(a) * .06], [0, s * (Math.PI / 2 - a), .5 * s]); }
      const th = add(new T.CylinderGeometry(.004, .004, 6, 3), new T.MeshBasicMaterial({color: '#DDE3EA', transparent: true, opacity: .7}), [0, 3, 0]); void th;
      anim = t => { g.position.y = (p.at?.[1] ?? 4) + .18 * Math.sin(2 * Math.PI * .6 * t) - .5 * Math.max(0, Math.sin(.4 * t)); g.rotation.y = .4 * Math.sin(.7 * t); }; }
    else if (p.kind === 'toaster') { const ch = std('#C9CED6', {metalness: .8, roughness: .25}); add(new T.BoxGeometry(1.1, .7, .6), ch, [0, .35, 0]);
      for (const x of [-.22, .22]) add(new T.BoxGeometry(.14, .05, .44), std('#141414'), [x, .7, 0]); add(new T.BoxGeometry(.08, .2, .08), std('#1D1D1D'), [.6, .5, 0]);
      const toast = [-.22, .22].map(x => add(new T.BoxGeometry(.1, .5, .4), std('#C68A42'), [x, .62, 0])); anim = t => { const u = (t % 4) / 4, pop = u > .7 ? Math.min(1, (u - .7) / .05) * Math.max(0, 1 - (u - .75) * 3) : 0; toast.forEach(x => { x.position.y = .62 + .45 * pop; }); }; }
    else if (p.kind === 'spaghettiPlates') { for (const [i, x] of [-1.1, 0, 1.1].entries()) { add(new T.CylinderGeometry(.48, .4, .06, 10), std('#F4F1EA'), [x, .03, (i - 1) * .2]);
        for (let j = 0; j < 4; j++) add(new T.TorusKnotGeometry(.13, .025, 32, 4, 2 + j, 3), std('#E7C46A'), [x + (j - 1.5) * .07, .14 + .03 * j, (i - 1) * .2], [Math.PI / 2, 0, j]);
        add(new T.IcosahedronGeometry(.1, 0), std('#B8301E'), [x, .26, (i - 1) * .2]); } }
    else if (p.kind === 'giantCage' || p.kind === 'chains') {
      const R = p.r ?? 34, H = p.h ?? 62, iron = std(COL.iron, {metalness: .6, roughness: .45});
      if (p.kind === 'giantCage') { for (let i = 0; i < 28; i++) { const a = 2 * Math.PI * i / 28; add(new T.BoxGeometry(.9, H, .9), iron, [Math.sin(a) * R, H / 2, Math.cos(a) * R]); }
        for (const y of [1.2, H * .5, H]) add(new T.TorusGeometry(R, .7, 4, 28), iron, [0, y, 0], [Math.PI / 2, 0, 0]);
        for (let i = 0; i < 4; i++) add(new T.BoxGeometry(.9, .9, 2 * R), iron, [0, H + 2, 0], [0, i * Math.PI / 4, 0]);
        const cloth = add(new T.CylinderGeometry(R * .55, R * 1.08, H * 1.05, 14, 1, true), std(COL.cloth, {side: T.DoubleSide, roughness: .9}), [0, H * .52, 0]); cloth.name = 'cageCloth';
        const cv = cages[0]; anim = t => { const c = cv ? PW.clothAt(cv.t, t) : {u: 0, lift: 0, swing: 0, away: 0, visible: true}; cloth.visible = c.visible; cloth.position.set(c.away * .6, H * .52 + c.lift, -c.away * .3); cloth.rotation.set(-c.swing * .35, c.swing, c.swing * .5); cloth.scale.setScalar(1 + .15 * c.u); }; }
      else for (let i = 0; i < (p.n ?? 12); i++) add(new T.TorusGeometry(.5, .16, 4, 8), iron, [0, -i * .8, 0], [0, i % 2 ? Math.PI / 2 : 0, 0]); }
    else if (p.kind === 'lanternSea') {
      const n = p.n ?? 1500, geo = new T.CylinderGeometry(.42, .34, .8, 6, 1); geo.translate(0, 0, 0);
      const m = new T.InstancedMesh(geo, new T.MeshBasicMaterial({color: '#ffffff', fog: false, toneMapped: !hdr}), n); m.instanceColor = new T.InstancedBufferAttribute(new Float32Array(n * 3), 3); m.frustumCulled = false; m.name = 'lanternSea'; g.add(m);
      const M = new T.Matrix4(), Q = new T.Quaternion(), V = new T.Vector3(), S = new T.Vector3(), Y = new T.Vector3(0, 1, 0), c0 = new T.Color('#FFB24A'), c1 = new T.Color('#FF7A2E');
      const st = p.streams ? {n, src: p.streams.src, yMax: p.streams.yMax, rise: p.streams.rise, wind: p.streams.wind, seed: p.streams.seed} : null; m.userData.n = n;   // P3B: streams (opt-in)
      anim = t => { for (let i = 0; i < n; i++) { const L = st ? PW.lanternStreamAt(i, t, st) : PW.lanternAt(i, t, {R: p.r ?? 90, n}); Q.setFromAxisAngle(Y, L.yaw); M.compose(V.fromArray(L.p), Q, S.setScalar(L.s)); m.setMatrixAt(i, M);
          const c = c0.clone().lerp(c1, PW.h1(3, i, 11)).multiplyScalar(L.glow * k('lantern')); m.setColorAt(i, c); } m.instanceMatrix.needsUpdate = true; m.instanceColor.needsUpdate = true; }; }
    g.position.set(...(p.at ?? [0, 0, 0])); g.rotation.y = (p.yaw ?? 0) * Math.PI / 180; g.scale.setScalar(p.scale ?? 1); g.traverse(o => { o.userData.live = true; o.castShadow = false; }); g.name = 'prop2b_' + p.kind; scene.add(g);
    return {p, g, anim}; }
  // ---- per frame -------------------------------------------------------------------------------------------------------------
  const M = new T.Matrix4(), Q = new T.Quaternion(), V = new T.Vector3(), S = new T.Vector3(), E = new T.Euler(), C = new T.Color(), Z = new T.Vector3(0, 0, 1);
  const put = (m, i, p, s, col, a, rot = 0, sx = null) => { if (i >= m.instanceMatrix.count) return i; E.set(rot, rot * .7, 0); Q.setFromEuler(E); M.compose(V.fromArray(p), Q, sx ? S.set(...sx) : S.setScalar(s)); m.setMatrixAt(i, M); C.set(col).multiplyScalar(a); m.setColorAt(i, C); return i + 1; };
  const basisOf = dir => { const f = new T.Vector3(...dir).normalize(), r = new T.Vector3().crossVectors(new T.Vector3(0, 1, 0), f); if (r.lengthSq() < 1e-6) r.set(1, 0, 0); r.normalize(); const u = new T.Vector3().crossVectors(f, r); return {f, r, u}; };
  const toWorld = (o, b, l) => [o[0] + b.r.x * l[0] + b.u.x * l[1] + b.f.x * l[2], o[1] + b.r.y * l[0] + b.u.y * l[1] + b.f.y * l[2], o[2] + b.r.z * l[0] + b.u.z * l[1] + b.f.z * l[2]];
  const handTip = (x, side) => { const arm = x.a.parts?.[side + 'Arm']; if (!arm) return null; arm.updateWorldMatrix(true, false); return arm.localToWorld(new T.Vector3(0, -1.0, 0)).toArray(); };
  const state = {fire: 0, bolts: 0, fly: 0, links: 0, light: 0};
  function frame(t) {
    let nf = 0, ne = 0, nb = 0, nr = 0, li = 0, lp = new T.Vector3();
    let ng = 0; const jet = (o, dir, t0, seed, scale = 1, dur, F = PW.FIRE) => { const b = basisOf(dir);
      for (const c of PW.fireCards(t0, t, seed, dur, F)) { const col = c.k < .2 ? COL.fireCore : c.k < .65 ? COL.fire : COL.fireTip; nf = put(flames, nf, toWorld(o, b, c.p.map(v => v * scale)), c.s * scale, col, c.a * .42 * k('fire'), c.rot, [c.s * scale * .55, c.s * scale * .55, c.s * scale * 1.3]); }
      for (const e of PW.embers(t0, t, seed, dur, F)) ne = put(embersM, ne, toWorld(o, b, e.p.map(v => v * scale)), e.s * scale * (F === PW.BREATH ? 2 : 1), COL.ember, e.a * k('fire'));
      const L = PW.fireLight(t0, t, dur, F); if (L > li) { li = L; lp.fromArray(toWorld(o, b, [0, 0, (F === PW.BREATH ? PW.breathReach(F) * .45 : 1.6) * scale])); }
      if (F === PW.BREATH && ground && L > 0) for (let q = 0; q < 6; q++) { const p2 = toWorld(o, b, [0, 0, PW.breathReach(F) * scale * (q + 1) / 7]), gy = groundY(p2[0], p2[2]), R = scale * (1.4 + .5 * q); if (p2[1] - gy > 6 * scale) continue; ng = put(ground, ng, [p2[0], gy + .08, p2[2]], R * 2, COL.fire, L / F.light * .55 * k('ground') * (1 - Math.min(1, (p2[1] - gy) / (6 * scale)))); } };
    for (const p of powers) { const x = cast[p.actor]; if (!x || x.beast) continue; const r = x.a.root, yaw = r.rotation.y, fwd = [Math.sin(yaw), 0, Math.cos(yaw)], tau = t - p.t, s = r.scale.x;
      if (p.kind === 'cyanFire' && tau >= 0 && tau <= PW.FIRE.dur + PW.FIRE.life) { const on = tau <= PW.FIRE.dur + .15;
        if (on) for (const sd of ['left', 'right']) { const sh = x.a.pivots?.[sd + 'Shoulder']; if (sh) { sh.rotation.set(-1.5, 0, sd === 'left' ? -.12 : .12); } }   // palms out: both arms forward
        x.a.root.updateMatrixWorld(true); for (const [i, sd] of ['left', 'right'].entries()) { const o = handTip(x, sd); if (o) jet(o, fwd, p.t, 11 + i, s * .8); } }
      if (p.kind === 'lightning' && tau >= 0) { const d = PW.sprintAt(p.t, t); r.position.x += fwd[0] * d; r.position.z += fwd[2] * d; r.updateMatrixWorld(true);
        const c = [r.position.x, r.position.y + 2.6 * s, r.position.z]; if (tau <= PW.SPRINT.dur + .25) for (const pts of PW.bolts(p.t, t, 7, FPS)) for (let q = 1; q < pts.length; q++) { const a = toWorld(c, {r: new T.Vector3(1, 0, 0), u: new T.Vector3(0, 1, 0), f: new T.Vector3(0, 0, 1)}, pts[q - 1]), b2 = toWorld(c, {r: new T.Vector3(1, 0, 0), u: new T.Vector3(0, 1, 0), f: new T.Vector3(0, 0, 1)}, pts[q]); nb = seg(nb, a, b2, .07, COL.bolt, k('bolt')); }
        for (let q = 1; q < PW.SPRINT.trail; q++) { const t1 = t - q * PW.SPRINT.dt, t2 = t - (q - 1) * PW.SPRINT.dt; if (t1 < p.t) break; const d1 = PW.sprintAt(p.t, t1), d2 = PW.sprintAt(p.t, t2), base = [r.position.x - fwd[0] * d, c[1] - .6 * s, r.position.z - fwd[2] * d];
          if (d2 - d1 < 1e-3) continue; nb = seg(nb, [base[0] + fwd[0] * d1, base[1], base[2] + fwd[2] * d1], [base[0] + fwd[0] * d2, base[1], base[2] + fwd[2] * d2], PW.SPRINT.ribbon * s * (1 - q / PW.SPRINT.trail), COL.trail, k('bolt') * .8 * (1 - q / PW.SPRINT.trail)); } }
      if (p.kind === 'fly' && tau >= 0) { r.position.y += PW.flyRise(p.t, t); r.updateMatrixWorld(true);
        for (const sx of [-.5, .5]) for (const c of PW.flyRibbon(p.t, t, sx > 0 ? 5 : 6)) nr = put(ribbon, nr, [r.position.x + Math.cos(yaw) * sx * s + c.p[0], r.position.y + c.p[1] * s, r.position.z - Math.sin(yaw) * sx * s], c.s * s, c.p[1] < -1 ? COL.flyTip : COL.fly, c.a * k('fly'), 0, [c.s * s * .6, c.s * s * 1.4, c.s * s * .6]); } }
    // NIGHTFANG breathe → cyan fire from the jaw (track keys)
    for (const n of breathers) { const a = cast[n].a, s = a.sample; if (!s) continue; const tr = beasts.trackOf(a); tr.forEach((kk, i) => { if (kk.state !== 'breathe') return; const t1 = tr[i + 1]?.t ?? 1e9; if (t < kk.t + .25 || t > t1 + PW.BREATH.life) return;
      const K = a.P.scale ?? 1, o = B.worldOf(s, 'jaw', [0, .05 * K, 1.9 * K]), h0 = B.worldOf(s, 'head', [0, 0, 0]), h1 = B.worldOf(s, 'head', [0, -.35 * K, 1.0 * K]); jet(o, [h1[0] - h0[0], h1[1] - h0[1], h1[2] - h0[2]], kk.t + .25, 31 + i, K * .9, Math.min(PW.BREATH.dur * 2, t1 - kk.t - .25), PW.BREATH); }); }
    for (const f of fizzles) { const x = cast[f.actor], z = PW.fizzleAt(f.t, t); if (!smoke) break; smoke.visible = !!z && !!x; if (!z || !x) continue; const o = handTip(x, 'right') ?? x.a.root.position.toArray(), s = x.a.root.scale.x;
      smoke.position.set(o[0], o[1] + z.y * s, o[2]); smoke.scale.setScalar(z.s * s); smoke.material.opacity = z.a; }
    if (links) { let nl = 0; for (const c of chains) { const tt = beasts.actors.titan ?? Object.values(beasts.actors).find(a => a.P.name === 'TITAN'); if (!tt?.sample) continue;
        const origins = ['chainFL', 'chainFR', 'chainBL', 'chainBR'].filter(nm => tt.sample.segs[nm]).map(nm => { const q = B.worldOf(tt.sample, nm, [0, 0, 0]); return [q[0], q[1], q[2]]; });
        for (const pc of PW.chainPieces(c.t, t, origins, 13)) { if (nl >= links.instanceMatrix.count) break; E.set(...pc.rot); Q.setFromEuler(E); M.compose(V.fromArray(pc.p), Q, S.setScalar(pc.s * (tt.P.scale ?? 1))); links.setMatrixAt(nl++, M); } }
      links.count = nl; links.instanceMatrix.needsUpdate = true; state.links = nl; }
    for (const [m, n] of [[flames, nf], [embersM, ne], [segs, nb], [ribbon, nr], [ground, ng]]) if (m) { m.count = n; m.instanceMatrix.needsUpdate = true; if (m.instanceColor) m.instanceColor.needsUpdate = true; }
    if (light) { light.intensity = li * 9; light.position.copy(lp); } Object.assign(state, {fire: nf, embers: ne, bolts: nb, fly: nr, light: li});
    for (const pr of Object.values(props)) { pr.g.visible = t >= (pr.p.from ?? -1e9) && t < (pr.p.until ?? 1e9); if (pr.g.visible) pr.anim?.(t); } }   // prop `from` / `until` (s)
  function seg(i, a, b, w, col, alpha) { if (!segs || i >= segs.instanceMatrix.count) return i; const d = new T.Vector3(b[0] - a[0], b[1] - a[1], b[2] - a[2]), L = d.length(); if (L < 1e-4) return i;
    Q.setFromUnitVectors(Z, d.clone().normalize()); M.compose(V.set((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2), Q, S.set(w, w, L)); segs.setMatrixAt(i, M); C.set(col).multiplyScalar(alpha); segs.setColorAt(i, C); return i + 1; }
  // P3B keep-clear (prop streams.keepClear, after the camera is set): lanterns over a subject's head (+ 1.5 studs), Tuft's eyes or the frame's upper
  // third are scaled to 0. zones(): [{p: world centre, r: studs}] from the episode (heads, Tuft's eyes).
  const P0 = new T.Vector3(), P1 = new T.Vector3(), DQ = new T.Vector3(), SQ = new T.Quaternion();
  function cull(camera, zones) { for (const pr of Object.values(props)) { const kc = pr.p.streams?.keepClear; if (!kc || !pr.g.visible) continue; const m = pr.g.children.find(o => o.name === 'lanternSea'); if (!m) continue;
      pr.g.updateMatrixWorld(true); camera.updateMatrixWorld(true); const asp = camera.aspect, zs = [], k = pr.g.scale.x, wm = pr.g.matrixWorld, cam = camera.position;
      const rad = (p, r) => { const d = P0.fromArray(p).distanceTo(cam); return r / (d * Math.tan(camera.fov * Math.PI / 360)); };
      for (const z of zones()) { P1.fromArray(z.p).project(camera); if (P1.z > 1) continue; zs.push({x: P1.x, y: P1.y, r: rad(z.p, z.r)}); }
      let hid = 0; for (let i = 0; i < m.userData.n; i++) { m.getMatrixAt(i, M); M.decompose(DQ, SQ, S); if (S.x < 1e-4) continue; P0.copy(DQ).applyMatrix4(wm); const w = P0.toArray(); P1.copy(P0).project(camera);
        if (P1.z > 1 || Math.abs(P1.x) > 1.2 || Math.abs(P1.y) > 1.2) continue; if (PW.keepClear({x: P1.x, y: P1.y, r: rad(w, .5 * k * S.x)}, zs, {top: kc.top ?? 1 / 3, aspect: asp})) { M.compose(DQ, SQ, S.setScalar(0)); m.setMatrixAt(i, M); hid++; } }
      m.instanceMatrix.needsUpdate = true; state.lanternsHidden = hid; } }
  return {frame, cull, props, state, meshes: () => [flames, embersM, segs, ribbon, links, smoke].filter(Boolean)};
}
