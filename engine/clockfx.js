// engine/clockfx.js — RULE-CLOCK EFFECT KIT (Phase 1F; reusable for every episode's clock). Opt-in spec `clock`:
//   "clock": [{"at": {"word": "town", "nth": 1} | seconds, "fx": "dong"},
//             {"at": …, "fx": "pop", "pos": [x, y, z], "show": "<object name>"?, "scale": 1?},
//             {"at": …, "fx": "crack"}]                        (crack = world.setState('bellCrack', true) from then on)
// dong  = the bell swings (world.setState('bell', {swing})) + a translucent SHOCKWAVE ring expanding over the rooftops from the
//         belfry (≤ 1 s): a flat ring at belfry height + a camera-facing ring, both fading.
// pop   = a cartoon smoke puff + a small sparkle burst (Phase 1G default: chunky ink-outlined white clusters, 3–4 frame pop; `style: 'soft'` = the 1F balls); `show` names a scene object
//         hidden until the puff's peak (POP.swap s after `at`), so the puff hides the swap from nothing → object.
// All pure in t (any frame order). Pure helpers: dongSwing, shockAt, puffAt, sparkAt (tests/v2/clockfx.test.js).
import * as T from 'three';

export const DONG = {swing: 26, decay: 1.6, freq: 1.15, dur: 3.2, wave: {dur: .9, radius: 70, width: .08}};
export const POP = {dur: .75, swap: .12, balls: 7, sparks: 10, radius: 1.6};
const clamp01 = x => Math.max(0, Math.min(1, x));
// bell swing (degrees) at time u after a dong: an immediate swing, damped
export const dongSwing = u => (u < 0 || u > DONG.dur) ? 0 : DONG.swing * Math.exp(-DONG.decay * u) * Math.sin(2 * Math.PI * DONG.freq * u);
// shockwave ring at u: radius grows fast and eases out, alpha fades; null outside [0, dur)
export const shockAt = u => { const d = DONG.wave.dur; if (u < 0 || u >= d) return null; const k = u / d; return {r: DONG.wave.radius * (1 - (1 - k) ** 3), alpha: .55 * (1 - k) ** 1.4}; };
// smoke ball i of a pop at u: offset dir (unit-ish), scale, opacity
export function puffAt(i, u, seed = 1) {
  if (u < 0 || u >= POP.dur) return null; const k = u / POP.dur, a = (i / POP.balls) * Math.PI * 2 + seed * 1.7, up = i % 2 ? .35 : .7;
  const grow = clamp01(k / .22), shrink = clamp01((k - .45) / .55), s = (.55 + .45 * Math.sin(i * 2.3 + seed)) * (grow * (1 - shrink * shrink)) * POP.radius;
  const out = .2 + .75 * (1 - (1 - clamp01(k / .5)) ** 2);
  return {dir: [Math.cos(a) * out, up * out + .25 * k, Math.sin(a) * out], s: Math.max(0, s) * .6, opacity: .95 * (1 - shrink)};
}
// sparkle j of a pop at u: position offset + size + opacity
export function sparkAt(j, u, seed = 1) {
  if (u < 0 || u >= POP.dur) return null; const k = u / POP.dur, a = (j / POP.sparks) * Math.PI * 2 + seed, el = ((j * 37) % 7) / 7 - .2, d = POP.radius * (.4 + 1.6 * (1 - (1 - k) ** 2));
  return {off: [Math.cos(a) * Math.cos(el) * d, Math.sin(el) * d + .4 + k * .6, Math.sin(a) * Math.cos(el) * d], size: .45 * (1 - k) + .1, opacity: k < .1 ? k / .1 : 1 - (k - .1) / .9};
}
// Phase 1G CARTOON POP (default; event `style: 'soft'` keeps the 1F cloud balls): chunky bright-white clusters with a dark-ink outline that
// pop in 3–4 frames (stretch → squash → settle), hold, then shrink out fast. Cluster i at u: {dir, s, sx, sy}; null outside [0, dur).
export const POP_CARTOON = {dur: .55, swap: .12, clusters: 6, inFrames: 3.5, fps: 24};
export function cartoonPuffAt(i, u, seed = 1) {
  const P = POP_CARTOON; if (u < 0 || u >= P.dur) return null; const tin = P.inFrames / P.fps, n = P.clusters, ring = i > 0;
  const a = ring ? (i - 1) / (n - 1) * Math.PI * 2 + seed * 1.3 : 0, size = ring ? .62 + .28 * (((i * 37 + seed) % 5) / 5) : .95;
  let s; if (u < tin) s = 1.15 * (u / tin) ** .6; else if (u < tin + .08) s = 1.15 - .15 * ((u - tin) / .08); else if (u < .36) s = 1; else s = 1 - ((u - .36) / (P.dur - .36)) ** 2;
  const sy = u < tin * .6 ? 1.3 : u < tin + .06 ? .8 : 1 + .05 * Math.sin((u - tin) * 40) * Math.max(0, 1 - (u - tin) / .2), sx = 1 / Math.sqrt(sy);
  const out = ring ? .95 * (.75 + .25 * clamp01(u / .2)) : 0;
  return {dir: [Math.cos(a) * out, (ring ? .1 + .3 * (i % 2) : .15) + .5 * u, Math.sin(a) * out * .75], s: Math.max(0, s) * size, sx, sy};
}
export const resolveClockAt = (at, wordTime) => typeof at === 'number' ? at : wordTime(at);

const starTex = (() => { let t = null; return () => { if (t || typeof document === 'undefined') return t; const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d');
  g.translate(32, 32); g.fillStyle = '#fff6c8'; g.beginPath(); for (let i = 0; i < 8; i++) { const r = i % 2 ? 7 : 30, a = i * Math.PI / 4; g.lineTo(Math.cos(a) * r, Math.sin(a) * r); } g.closePath(); g.fill();
  t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace; return t; }; })();

export function createClockFx(scene, events, {world, wordTime}) {
  const evs = events.map((e, i) => ({...e, t: resolveClockAt(e.at, wordTime), i})).sort((a, b) => a.t - b.t);
  const dongs = evs.filter(e => e.fx === 'dong'), pops = evs.filter(e => e.fx === 'pop'), cracks = evs.filter(e => e.fx === 'crack');
  const bellObj = world?.downtown?.hall?.bell ?? null, belfry = new T.Vector3();
  const grp = new T.Group(); grp.name = 'clockFx'; scene.add(grp);
  const ringMat = () => new T.MeshBasicMaterial({color: '#fff4d6', transparent: true, opacity: 0, depthWrite: false, side: T.DoubleSide, fog: false, toneMapped: false, blending: T.AdditiveBlending});
  const flat = new T.Mesh(new T.RingGeometry(1 - DONG.wave.width, 1, 96).rotateX(-Math.PI / 2), ringMat()); flat.name = 'shockwaveFlat';
  const face = new T.Mesh(new T.RingGeometry(1 - DONG.wave.width * .8, 1, 96), ringMat()); face.name = 'shockwaveFace';
  face.onBeforeRender = (r, sc, cam) => { face.quaternion.copy(cam.quaternion); face.updateMatrixWorld(); };   // camera-facing at draw time
  flat.frustumCulled = face.frustumCulled = false; grp.add(flat, face); flat.renderOrder = face.renderOrder = 5;
  const cloudMat = new T.MeshStandardMaterial({color: '#ffffff', roughness: .7, emissive: '#ffffff', emissiveIntensity: .62, flatShading: false}), inkMat = new T.MeshBasicMaterial({color: '#17131c', side: T.BackSide});
  let clusterGeo = null; const clusterG = () => clusterGeo ??= (() => { const parts = [[0, 0, 0, .62], [.48, .12, .1, .46], [-.42, .18, -.05, .44], [.05, .5, -.1, .4]].map(([x, y, z, r]) => new T.IcosahedronGeometry(r, 1).translate(x, y, z).toNonIndexed());
    const n = parts.reduce((k, g) => k + g.attributes.position.count, 0), pos = new Float32Array(n * 3); let o = 0; for (const g of parts) { pos.set(g.attributes.position.array, o); o += g.attributes.position.array.length; }
    const out = new T.BufferGeometry(); out.setAttribute('position', new T.BufferAttribute(pos, 3)); out.computeVertexNormals(); return out; })();
  const smokeMat = new T.MeshStandardMaterial({color: '#ffffff', roughness: .85, emissive: '#c9ced8', emissiveIntensity: .55, transparent: true, depthWrite: false});
  const ballG = new T.IcosahedronGeometry(1, 2), puffs = pops.map(p => { const g = new T.Group(); g.name = 'popPuff'; const cartoon = p.style !== 'soft';
    const balls = cartoon ? Array.from({length: POP_CARTOON.clusters}, () => { const m = new T.Mesh(clusterG(), cloudMat); m.renderOrder = 6; const ol = new T.Mesh(m.geometry, inkMat); ol.scale.setScalar(1.13); ol.renderOrder = 5; m.add(ol); g.add(m); return m; })
      : Array.from({length: POP.balls}, () => { const m = new T.Mesh(ballG, smokeMat.clone()); m.renderOrder = 6; g.add(m); return m; });
    const sparks = Array.from({length: POP.sparks}, () => { const s = new T.Sprite(new T.SpriteMaterial({map: starTex(), color: '#ffe680', transparent: true, depthWrite: false, fog: false, toneMapped: false})); s.renderOrder = 7; g.add(s); return s; });
    g.position.fromArray(p.pos ?? [0, 0, 0]); g.scale.setScalar(p.scale ?? 1); grp.add(g); return {p, g, balls, sparks, cartoon, show: p.show ? scene.getObjectByName(p.show) : null}; });
  return {
    events: evs,
    update(t) {
      // bell: the latest dong's swing (worldState may also drive it outside a dong window)
      const d = dongs.filter(e => t >= e.t && t - e.t <= DONG.dur).pop();
      if (d && world?.setState) world.setState('bell', {swing: dongSwing(t - d.t)});
      if (cracks.length && world?.setState) world.setState('bellCrack', t >= cracks[0].t);
      // shockwave from the belfry
      const w = dongs.map(e => ({e, s: shockAt(t - e.t)})).filter(x => x.s).pop();
      flat.visible = face.visible = !!w;
      if (w) { if (bellObj) { bellObj.updateWorldMatrix(true, false); bellObj.getWorldPosition(belfry); belfry.y -= 1.5; } else belfry.fromArray(w.e.pos ?? [0, 30, 0]);
        flat.position.copy(belfry); flat.scale.setScalar(w.s.r); flat.material.opacity = w.s.alpha;
        face.position.copy(belfry); face.scale.setScalar(w.s.r * .55); face.material.opacity = w.s.alpha * .7; }
      // pops
      for (const P of puffs) { const u = t - P.p.t, D = P.cartoon ? POP_CARTOON : POP; P.g.visible = u >= 0 && u < D.dur;
        if (P.show) P.show.visible = u >= D.swap;
        if (!P.g.visible) continue;
        if (P.cartoon) { P.balls.forEach((m, i) => { const b = cartoonPuffAt(i, u, P.p.i + 1); m.visible = !!b && b.s > .01; if (!m.visible) return; m.position.fromArray(b.dir); m.scale.set(b.s * b.sx, b.s * b.sy, b.s * b.sx); m.rotation.y = i * 1.1; });
          P.sparks.forEach((s, j) => { const k = sparkAt(j, u * POP.dur / D.dur, P.p.i + 1); s.visible = !!k; if (!k) return; s.position.fromArray(k.off); s.scale.setScalar(k.size); s.material.opacity = Math.max(0, k.opacity); }); continue; }
        P.balls.forEach((m, i) => { const b = puffAt(i, u, P.p.i + 1); m.visible = !!b && b.s > .01; if (!m.visible) return; m.position.fromArray(b.dir); m.scale.setScalar(b.s); m.material.opacity = b.opacity; });
        P.sparks.forEach((s, j) => { const k = sparkAt(j, u, P.p.i + 1); s.visible = !!k; if (!k) return; s.position.fromArray(k.off); s.scale.setScalar(k.size); s.material.opacity = Math.max(0, k.opacity); }); }
    },
  };
}
