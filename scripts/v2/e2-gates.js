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
{ const sl = S.pileSlots(40), w = S.pileWorst(sl); out.pile = {bodies: sl.length, height: +sl.height.toFixed(2), radius: +sl.radius.toFixed(1), interpenetrationMax: +w.toFixed(3), limit: .1, pass: w <= .1}; }
{ const o = {t0: 0, from: [0, 0, 0], to: [9, 0, 0]}, end = S.tumbleAt(S.TUMBLE.dur - 1e-6, o); let lagErr = 0; for (let t = .26; t < S.TUMBLE.dur; t += .05) lagErr = Math.max(lagErr, Math.abs(S.limbAngle(S.tumbleAt(t, o), t) - S.tumbleAt(t - .25, o).spin));
  out.tumble = {turns: +(end.spin / (2 * Math.PI)).toFixed(2), lagSeconds: S.TUMBLE.lag, lagError: +lagErr.toFixed(6), pass: end.spin / (2 * Math.PI) >= 1.5 && lagErr < 1e-6}; }
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
    // the wash end state of every drained mesh = the DUMMY material
    const st = E.story6, washMeshes = []; hero.traverse(o => { if (o.material?.userData?.wash) washMeshes.push(o); }); E.renderFrame(Math.round((times.at(-1)[0] - .05) * fps), W, H);
    return {regions: res, washMeshes: washMeshes.length};
  }, [J.story6.drains.map((d, i) => [J.sheetTimes[i], d.region]), REG, W, H]);
  out.drain.pass = out.drain.regions.every(r => r.pass); out.drain.limit = 3; out.drain.endState = {colour: S.WHITE_STATE.colour, rough: S.WHITE_STATE.rough, lift: S.WHITE_STATE.lift, note: 'drain end state = the DUMMY material (troupe6 DUMMY: #F2F2F4, roughness .85, lift .08)'}; out.errors = errors;
} finally { await browser.close(); await server.close(); }
mkdirSync('review/e2', {recursive: true}); writeFileSync('review/e2/gates.json', JSON.stringify(out, null, 1) + '\n');
console.log(JSON.stringify({airCatch: out.airCatch.penetrationMax, pile: out.pile.interpenetrationMax, tumble: out.tumble, drain: out.drain.regions.map(r => `${r.region} ΔE ${r.dE76} (${r.heroPx}/${r.dummyPx} px)`), errors: out.errors}));
