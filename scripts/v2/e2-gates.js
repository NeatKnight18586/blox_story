// scripts/v2/e2-gates.js — E2 gates → review/e2/gates.json
//   airCatch: P3b hip-carry geometry from the catch key on (the air fall moves lead and partner by the same vector, so the pair's penetration is the
//             ground carry's): penetration ≤ 0.08 · pile: max SAT interpenetration of the mound's lying bodies ≤ 0.1 · tumble: turns ≥ 1.5, limb lag 0.25 s
//   drain:    stories/_fixture_e2/drainbloom.json rendered in-page; each drained hero region (mask of its meshes) vs the same region of the white dummy
//             beside him: mean colour ΔE76 ≤ 3; plus the wash end state = the DUMMY material exactly.
import {writeFileSync, mkdirSync, readFileSync} from 'node:fs';
import * as A from '../../engine/acting6.js';
import * as S from '../../engine/story6.js';
import {startServer} from './server.js';
import {launch} from './browser.js';

const out = {};
{ const n = 'carry_hip', v = A.VERBS[n], T = A.timing(v), pv = v.two.partner, kp = v.kp, FPS = 30; let pen = {depth: 0};
  for (let i = 0; i <= Math.round((T.D + .8) * FPS); i++) { const t = i / FPS; if (t < T.key) continue; const lead = A.sampleVerb(n, t), ps = A.sampleVerb(pv, Math.max(0, t - T.key + A.timing(A.VERBS[pv]).key)), c = A.carryOrigin(lead.sample, 'adult_m', n, kp);
    const pn = A.penetration(A.placeBoxes(A.bodyBoxes(lead.sample), {}), A.placeBoxes(A.bodyBoxes(ps.sample), {at: c.p, yaw: c.yaw * Math.PI / 180, k: kp}), {skip: (x, y) => /Hand/.test(x) && /Thigh|Shin/.test(y) || /Hand/.test(y) && /Thigh|Shin/.test(x)});
    if (pn.depth > pen.depth) pen = {...pn, t: +t.toFixed(2)}; }
  out.airCatch = {verb: n, penetrationMax: pen.depth, pair: pen.pair, limit: .08, pass: pen.depth <= .08, note: 'hands under the thighs skipped (P3b rule); the fall adds one vector to both roots'}; }
{ const bx = S.PILE.slots.map(S.pileBodyBoxes); let w = 0, pair = null; for (let i = 0; i < bx.length; i++) for (let j = i + 1; j < bx.length; j++) { const p = A.penetration(bx[i], bx[j]); if (p.depth > w) { w = p.depth; pair = `${i}-${j} ${p.pair}`; } }
  out.pile = {bodies: bx.length, poses: S.PILE.slots.map(b => b.pose), height: S.PILE.height, radius: S.PILE.radius, groundHidden5: S.PILE.coverage5, interpenetrationMax: +w.toFixed(4), pair, limit: .1, pass: w <= .1, note: 'R15 segment boxes (acting6 bodyBoxes) of the frozen mound'}; }
{ const o = {t0: 0, from: [0, 0, 0], to: [9, 0, 0]}, end = S.tumbleAt(S.TUMBLE.dur - 1e-6, o); let lagErr = 0; for (let t = .26; t < S.TUMBLE.dur; t += .05) lagErr = Math.max(lagErr, Math.abs(S.limbAngle(S.tumbleAt(t, o), t) - S.tumbleAt(t - .25, o).spin));
  out.tumble = {turns: +(end.spin / (2 * Math.PI)).toFixed(2), lagSeconds: S.TUMBLE.lag, lagError: +lagErr.toFixed(6), pass: end.spin / (2 * Math.PI) >= 1.5 && lagErr < 1e-6}; }
{ const ps = 'stories/_fixture_e2/pile.json', PJ = JSON.parse(readFileSync(ps, 'utf8')), server = await startServer(), browser = await launch();
  try { const page = await browser.newPage(); await page.goto(`${server.url}/engine/episode.html?spec=${encodeURIComponent(ps)}&aa=1`); await page.waitForFunction(() => window.__episode, null, {timeout: 180000});
    out.pile390 = await page.evaluate(([f, names, W, H]) => { const E = window.__episode; E.renderFrame(f, W, H); const m = new Uint8Array(W * H); for (const n of names) { const a = E.actorMask(n, W, H); for (let i = 0; i < W * H; i++) m[i] |= a[i]; E.renderFrame(f, W, H); }
      const lab = new Int32Array(W * H), sizes = []; let id = 0;
      for (let i = 0; i < W * H; i++) { if (!m[i] || lab[i]) continue; id++; let n = 0; const st = [i]; lab[i] = id; while (st.length) { const k = st.pop(); n++; const x = k % W, y = (k - x) / W; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const xx = x + dx, yy = y + dy; if (xx < 0 || yy < 0 || xx >= W || yy >= H) continue; const j = yy * W + xx; if (m[j] && !lab[j]) { lab[j] = id; st.push(j); } } } sizes.push(n); }
      let x0 = W, x1 = 0, y0 = H, y1 = 0; for (let i = 0; i < W * H; i++) if (m[i]) { const x = i % W, y = (i - x) / W; x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
      return {components: sizes.length, componentPx: sizes.sort((a, b) => b - a).slice(0, 5), bboxPx: [x0, y0, x1, y1], ratio: +((y1 - y0 + 1) / (x1 - x0 + 1)).toFixed(3)}; }, [Math.round(PJ.still * PJ.fps), Object.keys(PJ.cast).filter(n => n.startsWith('crowd')), 390, 693]);
    out.pile390.rule = 'one connected component (4-connected), height / width 0.35–0.6, 390 × 693 still from 20 studs at 25° up'; out.pile390.pass = out.pile390.components === 1 && out.pile390.ratio >= .35 && out.pile390.ratio <= .6;
  } finally { await browser.close(); await server.close(); } }
{ const fs = 'stories/_fixture_e2/episode.json', FJ = JSON.parse(readFileSync(fs, 'utf8')), sp = FJ.story6.spawns[0], server = await startServer(), browser = await launch();
  try { const page = await browser.newPage(); await page.goto(`${server.url}/engine/episode.html?spec=${encodeURIComponent(fs)}&aa=1`); await page.waitForFunction(() => window.__episode, null, {timeout: 180000});
    out.spawn = await page.evaluate(([t0, actor, W, H]) => { const E = window.__episode, {scene, camera, renderer} = E.debug, gl = renderer.getContext(), fps = E.FPS, f0 = Math.round(t0 * fps), V = camera.position.constructor;
      const col = scene.getObjectByName('spawnColumn_' + actor), p = col.position, h = col.geometry.parameters.height, R = 6.3;
      const white = new (scene.children.find(o => o.isMesh && o.material?.isMeshBasicMaterial)?.material.constructor)({color: '#ffffff'}), black = white.clone(); black.color.set('#000000'); white.toneMapped = black.toneMapped = white.fog = black.fog = false;
      const padG = scene.getObjectByName('spawnPad'), bitsy = scene.children.find(o => o.name === actor), rings = scene.getObjectByName('story6Rings');
      const keep = o => { for (let q = o; q; q = q.parent) if (q === padG || q === col || q === bitsy || q === rings) return true; return false; };
      const maskAt = f => { E.renderFrame(f, W, H); const saved = new Map(), hid = []; scene.traverse(o => { if ((o.isSprite || o.isPoints || o.isLine) && o.visible) { hid.push(o); o.visible = false; } else if (o.isMesh) { saved.set(o, o.material); o.material = keep(o) ? white : black; } });
        const bg = scene.background, fog = scene.fog; scene.background = null; scene.fog = null; renderer.setClearColor('#000000', 1); renderer.render(scene, camera); const p2 = new Uint8Array(W * H * 4); gl.readPixels(0, 0, W, H, gl.RGBA, gl.UNSIGNED_BYTE, p2);
        for (const [o, m] of saved) o.material = m; for (const o of hid) o.visible = true; scene.background = bg; scene.fog = fog; const m = new Uint8Array(W * H); for (let k = 0; k < W * H; k++) m[k] = p2[k * 4] > 100 ? 1 : 0; return m; };
      const lumaOutside = (f, m) => { E.renderFrame(f, W, H); const px = new Uint8Array(W * H * 4); gl.readPixels(0, 0, W, H, gl.RGBA, gl.UNSIGNED_BYTE, px); let n = 0, sum = 0;
        for (let k = 0; k < W * H; k++) { if (m[k]) continue; sum += .2126 * px[k * 4] + .7152 * px[k * 4 + 1] + .0722 * px[k * 4 + 2]; n++; } return {luma: sum / Math.max(1, n), outsideFrac: n / (W * H)}; };
      const union = new Uint8Array(W * H); for (let k = -1; k < 8; k++) { const m = maskAt(f0 + k); for (let q = 0; q < W * H; q++) union[q] |= m[q]; }   // pad, column, ring and actor over the whole flash
      const before = lumaOutside(f0 - 1, union), during = [], flashDelta = [];
      for (let k = 0; k < 8; k++) { const on = lumaOutside(f0 + k, union); during.push(on);
        const hideFx = () => { col.visible = false; rings.visible = false; }, orig = E.story6.frame; E.story6.frame = tt => { orig(tt); hideFx(); };   // the same frame without the flash
        const off = lumaOutside(f0 + k, union); E.story6.frame = orig; flashDelta.push(Math.abs(on.luma - off.luma) / off.luma); }
      const dev = Math.max(...flashDelta), raw = Math.max(...during.map(d => Math.abs(d.luma - before.luma) / before.luma));
      return {frame: f0, before: +before.luma.toFixed(2), during: during.map(d => +d.luma.toFixed(2)), outsideFrac: +before.outsideFrac.toFixed(3), maxChange: +(100 * dev).toFixed(2), rawChangeWithCameraMove: +(100 * raw).toFixed(2), columnHeight: +h.toFixed(2)}; }, [sp.t, sp.actor, 390, 693]);
    out.spawn.limit = 3; out.spawn.pass = out.spawn.maxChange <= 3; out.spawn.rule = 'mean luma outside the pad, column, ring and actor: each of the 8 flash frames with the flash vs the same frame without it, % (rawChangeWithCameraMove = vs the frame before, includes the orbit)';
  } finally { await browser.close(); await server.close(); } }
const spec = 'stories/_fixture_e2/drainbloom.json', J = JSON.parse(readFileSync(spec, 'utf8')), W = 540, H = 960;
const server = await startServer(), browser = await launch();
try {
  const page = await browser.newPage(); const errors = []; page.on('pageerror', e => errors.push(e.message));
  await page.goto(`${server.url}/engine/episode.html?spec=${encodeURIComponent(spec)}&aa=1`); await page.waitForFunction(() => window.__episode, null, {timeout: 180000});
  const REG = {legs: '^(left|right)(Leg|LegEnd|KneeFill|LowerLeg)$', shoes: '^(left|right)(Foot|Sole)$', stripe: null, jacket: null, hands: '^(left|right)(Hand|Cuff)$'};
  out.drain = await page.evaluate(([times, regs, W, H]) => {
    const E = window.__episode, {scene, renderer, camera} = E.debug, T = camera.constructor.prototype.constructor, gl = renderer.getContext(), res = [];
    const lin = c => { c /= 255; return c > .04045 ? ((c + .055) / 1.055) ** 2.4 : c / 12.92; }, lab = ([R, G, B]) => { const r = lin(R), g = lin(G), b = lin(B), X = (.4124 * r + .3576 * g + .1805 * b) / .95047, Y = .2126 * r + .7152 * g + .0722 * b, Z = (.0193 * r + .1192 * g + .9505 * b) / 1.08883, f = v => v > .008856 ? Math.cbrt(v) : 7.787 * v + 16 / 116; return [116 * f(Y) - 16, 500 * (f(X) - f(Y)), 200 * (f(Y) - f(Z))]; };
    const grab = () => { const p = new Uint8Array(W * H * 4); gl.readPixels(0, 0, W, H, gl.RGBA, gl.UNSIGNED_BYTE, p); return p; };
    const actor = n => scene.children.find(o => o.name === n);
    const isIn = (root, regex, strip) => o => { for (let p = o; p; p = p.parent) if (p === root) { if (strip === 'stripe') return /^(upper|lower)Torso_/.test(o.name) && /0d7cd4$/i.test(o.name); if (strip === 'jacket') return /^(torso|lowerTorso|waistCap|(left|right)(Arm|ArmEnd|ElbowFill|LowerArm))$/.test(o.name) || (/^(upper|lower)Torso_/.test(o.name) && !/0d7cd4$/i.test(o.name)); if (strip === 'dummyTorso') return /^(torso|lowerTorso|waistCap)$/.test(o.name); if (strip === 'dummyJacket') return /^(torso|lowerTorso|waistCap|(left|right)(Arm|ArmEnd|ElbowFill|LowerArm))$/.test(o.name); return new RegExp(regex).test(o.name); } return false; };
    const white = new (scene.children.find(o => o.isMesh && o.material?.isMeshBasicMaterial)?.material.constructor ?? T)({color: '#ffffff'}), black = white.clone(); black.color.set('#000000'); white.toneMapped = black.toneMapped = false; white.fog = black.fog = false;
    const mask = keep => { const hid = [], saved = new Map(); scene.traverse(o => { if ((o.isSprite || o.isPoints || o.isLine || o.isInstancedMesh) && o.visible) { hid.push(o); o.visible = false; } else if (o.isMesh) { saved.set(o, o.material); o.material = keep(o) ? white : black; } });   // non-region meshes render black (a hidden parent would hide its children)
      const bg = scene.background, fog = scene.fog; scene.background = null; scene.fog = null; renderer.setClearColor('#000000', 1);
      renderer.render(scene, camera); const p = grab(); for (const [o, m] of saved) o.material = m; for (const o of hid) o.visible = true; scene.background = bg; scene.fog = fog; const m = new Uint8Array(W * H); for (let i = 0; i < W * H; i++) m[i] = p[i * 4] > 200 ? 1 : 0; return m; };
    const mean = (px, m) => { let n = 0, s = [0, 0, 0]; for (let i = 0; i < W * H; i++) if (m[i]) { n++; s[0] += px[i * 4]; s[1] += px[i * 4 + 1]; s[2] += px[i * 4 + 2]; } return {n, rgb: s.map(v => v / Math.max(1, n))}; };
    const hero = actor('hero'), dum = actor('dummyA'), fps = E.FPS;
    times.forEach(([t, region]) => { const f = Math.round(t * fps); E.renderFrame(f, W, H); const px = grab();
      const hm = mask(isIn(hero, regs[region], region === 'stripe' || region === 'jacket' ? region : null)), dm = mask(isIn(dum, regs[region] ?? '', region === 'stripe' ? 'dummyTorso' : region === 'jacket' ? 'dummyJacket' : null));
      E.renderFrame(f, W, H); const a = mean(px, hm), b = mean(px, dm), la = lab(a.rgb), lb = lab(b.rgb), dE = Math.hypot(la[0] - lb[0], la[1] - lb[1], la[2] - lb[2]);
      res.push({region, t, heroPx: a.n, dummyPx: b.n, heroRGB: a.rgb.map(Math.round), dummyRGB: b.rgb.map(Math.round), dE76: +dE.toFixed(2), pass: dE <= 3}); });
    // E2b: after the hands drain, no pixel of the hero's body (head excluded) within ΔE 10 of the stripe blue (nominal #0D7CD4 and as rendered at t = 0)
    const inHead = o => { for (let p = o; p && p !== hero; p = p.parent) if (p.name === 'head' || p === hero.children.find(c => c.name === 'head')) return true; return false; };
    const headPiv = (() => { let hp = null; hero.traverse(o => { if (!hp && o.name === 'face_decal') hp = o.parent; }); return hp; })(), underHead = o => { for (let p = o; p; p = p.parent) if (p === headPiv) return true; return false; };
    E.renderFrame(0, W, H); const px0 = grab(), sm = mask(isIn(hero, '', 'stripe')); E.renderFrame(0, W, H); const ref = lab(mean(px0, sm).rgb), nom = lab([0x0D, 0x7C, 0xD4]);
    const fH = Math.round(times.at(-1)[0] * fps); E.renderFrame(fH, W, H); const pxH = grab(), body = mask(o => { for (let p = o; p; p = p.parent) if (p === hero) return !underHead(o); return false; }); E.renderFrame(fH, W, H);
    let nBlue = 0, nBody = 0; for (let i = 0; i < W * H; i++) if (body[i]) { nBody++; const l = lab([pxH[i * 4], pxH[i * 4 + 1], pxH[i * 4 + 2]]); if (Math.hypot(l[0] - ref[0], l[1] - ref[1], l[2] - ref[2]) <= 10 || Math.hypot(l[0] - nom[0], l[1] - nom[1], l[2] - nom[2]) <= 10) nBlue++; }
    const stripeLeak = {afterHandsFrame: fH, bodyPx: nBody, bluePx: nBlue, refRendered: ref.map(v => +v.toFixed(1)), pass: nBlue === 0};
    // the wash end state of every drained mesh = the DUMMY material
    const st = E.story6, washMeshes = []; hero.traverse(o => { if (o.material?.userData?.wash) washMeshes.push(o); }); E.renderFrame(Math.round((times.at(-1)[0] - .05) * fps), W, H);
    return {regions: res, washMeshes: washMeshes.length, stripeLeak};
  }, [J.story6.drains.map((d, i) => [J.sheetTimes[i], d.region]), REG, W, H]);
  out.drain.pass = out.drain.regions.every(r => r.pass); out.drain.limit = 3; out.drain.endState = {colour: S.WHITE_STATE.colour, rough: S.WHITE_STATE.rough, lift: S.WHITE_STATE.lift, note: 'drain end state = the DUMMY material (troupe6 DUMMY: #F2F2F4, roughness .85, lift .08)'}; out.errors = errors;
} finally { await browser.close(); await server.close(); }
mkdirSync('review/e2', {recursive: true}); writeFileSync('review/e2/gates.json', JSON.stringify(out, null, 1) + '\n');
console.log(JSON.stringify({spawn: out.spawn, stripeLeak: out.drain.stripeLeak, pile390: out.pile390, airCatch: out.airCatch.penetrationMax, pile: out.pile.interpenetrationMax, tumble: out.tumble, drain: out.drain.regions.map(r => `${r.region} ΔE ${r.dE76} (${r.heroPx}/${r.dummyPx} px)`), errors: out.errors}));
