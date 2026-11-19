// node scripts/v2/touchgrass-gates.js [--spec stories/touchgrass/episode.json] [--only p1,p3,...] [--floor] [--out review/touchgrass/gates-e1.json]
// Touch Grass E1 gates (toyhouse-gates.js pattern, same thresholds), measured on frames rendered by engine/episode.js (gateMeasure,
// placesAt + id-mask passes in the page):
//  P1 hook: shot 01 frame 0 — TOWN_A's visor glow visible (≥ 30 cyan px at 270×480 inside the headset's box: hue 180–210°, s ≥ .45, v ≥ .5)
//     and the face (head box) ≥ 25 % of frame height.
//  P3 framing: subject / `see` cast clipped ≤ 5 % of their box (first, mid, last; medium/close: head + shoulders); inserts: the `prop`
//     (story prop `prop_<id>` or a named scene object) 35–60 % of frame height with ≥ 6 % margin (mid); medium/close faces 12–35 % (mid).
//  P4 (--floor) floor flicker: 12 consecutive frames at 1440×2560 on 02 04 23 48 58, motion-compensated (toyhouse P4), ≤ 2 %.
//  P5 spacing: every 2nd frame, cast-cast centre distance ≥ 1.0 body width; actor footprint vs story prop overlap = 0 (TOUCH excepted).
//  P6 motion: first vs last mean |Δluma| ≥ 3 % (≤ 1.5 s: ≥ 1.5 %); every 1.5 s window ≥ 3 %.
//  P8 black void: pixels with luma < 4/255 ≤ 0.5 % of the frame (first, mid, last of every shot).
//  P9 palette: dustTown shots before 77.74 — mean HSV saturation of pixels outside NOVA, every headset, the grass and the visor
//     screen ≤ .15 (mid frame); dustTown shots from 77.74 — ground mean R / mean B ≥ 1.25 (shots with ≥ 1 % ground pixels).
//  P10 finger scale (26 28 33 39): finger box ≥ 60 % of frame height, or its world height ≥ 20 × the nearest actor's height (mid).
//  P11 continuity: LEO's headset on him in 11 (hand) and on his head 12–23; off his head from 57.28; NOVA's can in hand in 08 09 44 49.
//  P12 (E2, owner) giant finger (25 26 28 33 34 39 40, mid frame): the finger's visible pixels (depth-tested id pass: finger white, every
//     other mesh black; particles / sprites / blended layers off) span ≥ 40 % of frame height, start at the top edge (enters through the
//     crack), end ≤ 70 % down (the owner's 40–70 % box), and ≥ 98 % of the finger's own silhouette is visible (nothing in front).
//  P9 (E2, owner): the headset / NOVA / grass / screen exclusion mask is dilated 2 px (headset edge pixels excluded too).
//  E3 owner waivers: P8 skips the space shots 19 20 32 33 34 35 (black sky by design); P3 skips 14 (zoom into the visor) and 56 (LEO
//     cropped foreground); P9 keeps every NOVA part (any object under a NOVA* root, boots included).
import {readFileSync} from 'node:fs';
import {mkdir, writeFile} from 'node:fs/promises';
import {startServer} from './server.js';
import {launch} from './browser.js';
import {layoutShots} from '../../engine/timeline.js';

const argv = process.argv.slice(2), arg = (k, d) => { const i = argv.indexOf(`--${k}`); return i >= 0 ? argv[i + 1] : d; };
const specPath = arg('spec', 'stories/touchgrass/episode.json'), spec = JSON.parse(readFileSync(specPath, 'utf8')), FPS = spec.fps;
const only = new Set((arg('only', 'p1,p3,p5,p6,p8,p9,p10,p11,p12') + (argv.includes('--floor') ? ',p4' : '')).split(','));
const shots = layoutShots(spec), W = 270, H = 480, GOLD = 77.74;
const TOUCH = {LEO: ['leoCrate', 'grass', 'leoFinger', 'hsDirt'], LEO_VR: ['sword', 'leoShip'], NOVA: ['grass', 'hsDirt'], TOWN_A: [], TOWN_B: [], TOWN_C: []};
const P8_SKIP = new Set(['19', '20', '32', '33', '34', '35']), P3_SKIP = new Set(['14', '56']);   // E3 owner waivers
const NOPRINT = /^(finger[ZSD]|enemy\d|tumbleweed)$/;
const worldOf = s => ['#9C9994', '#C9A27A'].includes(s.look?.fog) ? 'dust' : 'vr';   // dustTown shots carry the dustGray / dustGold look preset
const server = await startServer(), browser = await launch(), res = {spec: specPath, generated: new Date().toISOString().slice(0, 10)}, errors = [];
const E = (k, msg) => errors.push(`${k}: ${msg}`);
const clip = b => { if (!b || !b.front) return 1; const w = b.x1 - b.x0, h = b.y1 - b.y0; if (w <= 0 || h <= 0) return 0; const iw = Math.max(0, Math.min(1, b.x1) - Math.max(0, b.x0)), ih = Math.max(0, Math.min(1, b.y1) - Math.max(0, b.y0)); return 1 - iw * ih / (w * h); };
// in-page helpers: projected box of a named object, id-mask passes, RGBA read
const HELP = `
window.__tg = window.__tg ?? (() => { const E = window.__episode, sc = E.debug.scene, cam = E.debug.camera, R = E.debug.renderer; let MB = null; sc.traverse(o => { if (!MB && o.isMesh && o.material?.isMeshBasicMaterial) MB = o.material.constructor; });
  const V = cam.position.constructor, vis = o => { for (let p = o; p; p = p.parent) if (!p.visible) return false; return true; };
  const box = o => { if (!o || !vis(o)) return null; o.updateMatrixWorld(true); cam.updateMatrixWorld(true); const lo = [1e9, 1e9, 1e9], hi = [-1e9, -1e9, -1e9];
    o.traverse(m => { if (!m.isMesh || !vis(m) || m.isSprite || m.material?.transparent && m.material.opacity < .5) return; if (!m.geometry.boundingBox) m.geometry.computeBoundingBox(); const b = m.geometry.boundingBox;
      for (let i = 0; i < 8; i++) { const v = new V(i & 1 ? b.max.x : b.min.x, i & 2 ? b.max.y : b.min.y, i & 4 ? b.max.z : b.min.z).applyMatrix4(m.matrixWorld); [v.x, v.y, v.z].forEach((x, k) => { lo[k] = Math.min(lo[k], x); hi[k] = Math.max(hi[k], x); }); } });
    if (lo[0] > hi[0]) return null; let x0 = 1, x1 = 0, y0 = 1, y1 = 0, front = false;
    for (let i = 0; i < 8; i++) { const v = new V(i & 1 ? hi[0] : lo[0], i & 2 ? hi[1] : lo[1], i & 4 ? hi[2] : lo[2]).project(cam); if (v.z < 1) front = true; const x = (v.x + 1) / 2, y = (1 - v.y) / 2; x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
    return {x0, x1, y0, y1, h: y1 - y0, front, worldH: hi[1] - lo[1]}; };
  const rgba = (w, h) => { const gl = R.getContext(), px = new Uint8Array(w * h * 4); gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, px); return px; };
  const mask = (keep, w, h) => { const hid = []; sc.traverse(o => { if ((o.isMesh || o.isSprite || o.isPoints || o.isLine) && o.visible && !keep(o)) { hid.push(o); o.visible = false; } });
    const bg = sc.background, fog = sc.fog, mm = new MB({color: '#ffffff'}); sc.background = null; sc.fog = null; sc.overrideMaterial = mm; R.render(sc, cam);
    const px = rgba(w, h); sc.overrideMaterial = null; sc.background = bg; sc.fog = fog; for (const o of hid) o.visible = true; const m = new Uint8Array(w * h); for (let i = 0; i < w * h; i++) m[i] = px[i * 4] > 127 ? 1 : 0; return m; };
  const under = (o, r) => { for (let p = o; p; p = p.parent) if (p === r) return true; return false; };
  return {E, sc, cam, box, rgba, mask, under, vis, MB}; })();`;
try {
  const page = await browser.newPage(); const perr = []; page.on('pageerror', e => perr.push(e.message));
  await page.goto(`${server.url}/engine/episode.html?spec=${encodeURIComponent(specPath)}&aa=0`);
  await page.waitForFunction(() => window.__episode || document.title === 'error', null, {timeout: 300000});
  if (perr.length) throw Error(perr.join('; '));
  await page.evaluate(HELP);
  const G = (n, o = {}) => page.evaluate(([n, o]) => { const r = window.__episode.gateMeasure(n, o); if (!o.keepLuma) delete r.luma; delete r.floor; return r; }, [n, {w: W, h: H, ...o}]);
  const NB = names => page.evaluate(names => Object.fromEntries(names.map(nm => [nm, window.__tg.box(window.__tg.sc.getObjectByName(nm))])), names);
  const meanDiff = (a, b) => { let d = 0; for (let i = 0; i < a.length; i++) d += Math.abs(a[i] - b[i]); return d / a.length / 255; };
  if (only.has('p1')) {
    const f0 = await G(0), p1 = await page.evaluate(([w, h]) => { const T = window.__tg; T.E.renderFrame(0, w, h); const b = T.box(T.sc.getObjectByName('TOWN_A_headset')); const px = T.rgba(w, h); let n = 0;
      if (b) for (let y = Math.max(0, Math.floor(b.y0 * h)); y < Math.min(h, Math.ceil(b.y1 * h)); y++) for (let x = Math.max(0, Math.floor(b.x0 * w)); x < Math.min(w, Math.ceil(b.x1 * w)); x++) {
        const i = ((h - 1 - y) * w + x) * 4, r = px[i] / 255, g = px[i + 1] / 255, bb = px[i + 2] / 255, mx = Math.max(r, g, bb), mn = Math.min(r, g, bb), d = mx - mn; if (mx < .5 || d / mx < .45) continue;
        const hu = mx === r ? 60 * (((g - bb) / d) % 6) : mx === g ? 60 * ((bb - r) / d + 2) : 60 * ((r - g) / d + 4); if (hu >= 180 && hu <= 210) n++; }
      return {glowPx: n, headsetBox: b}; }, [W, H]);
    const face = f0.actors.TOWN_A?.face?.h ?? 0; res.p1 = {faceAt0: +face.toFixed(3), glowPx: p1.glowPx};
    if (face < .25) E('P1', `01 face ${(face * 100).toFixed(1)} % of frame height at frame 0 (≥ 25)`);
    if (p1.glowPx < 30) E('P1', `01 visor glow ${p1.glowPx} cyan px at frame 0 (≥ 30)`);
  }
  const rows = [];
  if (['p3', 'p6', 'p8', 'p9', 'p10', 'p12'].some(k => only.has(k))) for (const s of shots) {
    const ids = [s.start, s.start + Math.floor(s.frames / 2), s.start + s.frames - 1], m = [], nb = [];
    const names = [s.prop && !s.prop.startsWith('prop_') ? s.prop : null].filter(Boolean);
    for (const n of ids) { m.push(await G(n, {keepLuma: true})); nb.push(await NB(names)); }
    const row = {id: s.id, t: +(s.start / FPS).toFixed(2)}, who = s.subject ?? null, sid = s.id.split('-')[0];
    if (only.has('p3')) {
      const items = []; if (s.size !== 'insert') { if (who && spec.cast[who]?.style === 'v2') items.push(who); for (const x of s.see ?? []) if (spec.cast[x]?.style === 'v2' && x !== who) items.push(x); }
      const hs = ['medium', 'close'].includes(s.size), abox = a => { if (!a?.box) return null; if (!hs) return {...a.box, front: a.front}; const f = a.face, t = a.torso; if (!f || !t) return {...a.box, front: a.front};
        return {x0: Math.min(f.x0, t.x0), x1: Math.max(f.x1, t.x1), y0: f.y0, y1: Math.max(f.y1, Math.min(t.y1, t.y0 + .25 * (t.y1 - t.y0))), front: a.front}; };
      let worst = 0, worstWhat = ''; for (const r of m) for (const id of items) { const b = abox(r.actors[id]); if (!b) continue; const c = clip(b); if (c > worst) { worst = c; worstWhat = id; } }
      row.clip = +worst.toFixed(3); if (worst > .05 && !P3_SKIP.has(sid)) E('P3', `${s.id} ${worstWhat} clipped ${(worst * 100).toFixed(1)} %`);
      if (s.size === 'insert' && s.prop) { const b = s.prop.startsWith('prop_') ? m[1].props[s.prop.slice(5)] : nb[1][s.prop];
        if (!b) E('P3', `${s.id} insert prop ${s.prop} not visible`); else { const h = b.y1 - b.y0, mg = Math.min(b.x0, b.y0, 1 - b.x1, 1 - b.y1); row.insert = {h: +h.toFixed(3), margin: +mg.toFixed(3)};
          if (h < .35 || h > .60) E('P3', `${s.id} insert height ${(h * 100).toFixed(1)} % (35–60)`); if (mg < .06) E('P3', `${s.id} insert margin ${(mg * 100).toFixed(1)} % (≥ 6)`); } }
      if (who && hs) { const f = m[1].actors[who]?.face; if (f) { row.face = +f.h.toFixed(3); if (f.h < .12 || f.h > .35) E('P3', `${s.id} face ${(f.h * 100).toFixed(1)} % (12–35)`); } }
    }
    if (only.has('p6')) { const d = meanDiff(m[0].luma, m[2].luma), lim = s.frames / FPS <= 1.5 ? .015 : .03; row.motion = +d.toFixed(4); if (d < lim) E('P6', `${s.id} first-vs-last ${(d * 100).toFixed(2)} % (≥ ${lim * 100})`);
      const win = Math.round(1.5 * FPS); let wmin = Infinity; if (s.frames > win + 4) for (let a = s.start; a + win < s.start + s.frames; a += Math.round(.75 * FPS)) { const la = (await G(a, {keepLuma: true})).luma, lb = (await G(a + win, {keepLuma: true})).luma; wmin = Math.min(wmin, meanDiff(la, lb)); }
      if (wmin < Infinity) { row.window = +wmin.toFixed(4); if (wmin < .03) E('P6', `${s.id} a 1.5 s window changes ${(wmin * 100).toFixed(2)} % (≥ 3)`); } }
    if (only.has('p8')) { const blk = Math.max(...m.map(r => r.luma.filter(v => v < 4).length / r.luma.length)); row.black = +(blk * 100).toFixed(3); if (blk > .005 && !P8_SKIP.has(sid)) E('P8', `${s.id} ${(blk * 100).toFixed(2)} % pixels with luma < 4 (≤ 0.5)`); }
    if (only.has('p9') && worldOf(s) === 'dust') {
      const r = await page.evaluate(([n, w, h, gold]) => { const T = window.__tg; T.E.renderFrame(n, w, h); const px = T.rgba(w, h), sc = T.sc;
        if (!gold) { const keepRoots = ['NOVA', 'prop_grass', 'prop_hsDirt', 'NOVA_tapFinger'].map(x => sc.getObjectByName(x)).filter(Boolean);
          const m = T.mask(o => keepRoots.some(r => T.under(o, r)) || (() => { for (let q = o; q; q = q.parent) if (/^NOVA/.test(q.name ?? '')) return true; return false; })() || /headset|^hs_|^band_/i.test(o.name ?? '') || /headset/i.test(o.parent?.name ?? '') || /^hs_/.test(o.parent?.name ?? ''), w, h);
          const m0 = Uint8Array.from(m); for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (m0[y * w + x]) for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) { const yy = y + dy, xx = x + dx; if (yy >= 0 && yy < h && xx >= 0 && xx < w) m[yy * w + xx] = 1; }   // E2: 2 px dilation
          let s = 0, k = 0; for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { if (m[(h - 1 - y) * w + x]) continue; const i = ((h - 1 - y) * w + x) * 4, mx = Math.max(px[i], px[i + 1], px[i + 2]), mn = Math.min(px[i], px[i + 1], px[i + 2]); s += mx ? (mx - mn) / mx : 0; k++; }
          return {sat: s / Math.max(1, k), excluded: 1 - k / (w * h)}; }
        const g = T.mask(o => /^(ground|street)_/.test(o.name ?? ''), w, h); let R = 0, B = 0, k = 0; for (let i = 0; i < w * h; i++) if (g[i]) { R += px[i * 4]; B += px[i * 4 + 2]; k++; }
        return {groundPx: k / (w * h), rb: k ? R / Math.max(1, B) : null}; }, [ids[1], W, H, s.start / FPS >= GOLD - 1e-6]);
      row.p9 = r;
      if (r.sat !== undefined && r.sat > .15) E('P9', `${s.id} non-NOVA/headset/grass saturation ${r.sat.toFixed(3)} (≤ .15)`);
      if (r.rb !== undefined && r.groundPx >= .01 && r.rb < 1.25) E('P9', `${s.id} ground R/B ${r.rb.toFixed(3)} (≥ 1.25)`);
    }
    if (only.has('p10') && ['26', '28', '33', '39'].includes(sid)) {
      const fid = (s.see ?? []).find(x => /^finger/.test(x)), b = m[1].props[fid], pr = m[1].prints.find(p => p.id === fid);
      const near = m[1].places.length ? Math.min(...m[1].places.map(p => 5.3 * p.r / .95)) : 5.3, wh = pr ? pr.y1 - pr.y0 : 0, fh = b ? Math.min(1, b.y1) - Math.max(0, b.y0) : 0;
      row.p10 = {frameFrac: +fh.toFixed(3), worldH: +wh.toFixed(1), actorH: +near.toFixed(2), ratio: +(wh / near).toFixed(1)};
      if (!(fh >= .6 || wh >= 20 * near)) E('P10', `${s.id} finger ${(fh * 100).toFixed(0)} % of frame, ${(wh / near).toFixed(1)} × actor height (≥ 60 % or ≥ 20 ×)`);
    }
    if (only.has('p12') && ['25', '26', '28', '33', '34', '39', '40'].includes(sid)) {
      const fid = (s.see ?? []).find(x => /^finger/.test(x)), r = await page.evaluate(([n, w, h, fid]) => { const T = window.__tg; T.E.renderFrame(n, w, h); const sc = T.sc, root = sc.getObjectByName('prop_' + fid);
        if (!root || !T.vis(root)) return null; const A = T.mask(o => T.under(o, root), w, h), Wm = new T.MB({color: '#ffffff'}), Km = new T.MB({color: '#000000'}), saved = [];
        sc.traverse(o => { if (!(o.isMesh || o.isSprite || o.isPoints || o.isLine) || !o.visible) return; const mine = T.under(o, root);
          if (o.isSprite || o.isPoints || o.isLine || (!mine && [].concat(o.material)[0]?.transparent)) { saved.push([o, null]); o.visible = false; return; } saved.push([o, o.material]); o.material = mine ? Wm : Km; });
        const bg = sc.background, fog = sc.fog; sc.background = null; sc.fog = null; T.E.debug.renderer.render(sc, T.cam); const px = T.rgba(w, h); sc.background = bg; sc.fog = fog;
        for (const [o, m] of saved) { if (m) o.material = m; else o.visible = true; }
        let a = 0, b = 0, y0 = h, y1 = -1; for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const i = (h - 1 - y) * w + x; if (A[i]) a++; if (px[i * 4] > 127) { b++; y0 = Math.min(y0, y); y1 = Math.max(y1, y); } }
        return {a, b, y0: y0 / h, y1: (y1 + 1) / h}; }, [s.start + Math.floor(s.frames / 2), W, H, fid]);
      if (!r) E('P12', `${s.id} finger not visible`); else { const hgt = r.y1 - r.y0, occ = r.a ? 1 - r.b / r.a : 1; row.p12 = {height: +hgt.toFixed(3), top: +r.y0.toFixed(3), bottom: +r.y1.toFixed(3), occluded: +occ.toFixed(4)};
        if (hgt < .4) E('P12', `${s.id} finger spans ${(hgt * 100).toFixed(1)} % of frame height (≥ 40)`); if (r.y0 > 1.5 / H) E('P12', `${s.id} finger starts ${(r.y0 * 100).toFixed(1)} % below the top edge (enters from the top)`);
        if (r.y1 > .7) E('P12', `${s.id} finger box ends ${(r.y1 * 100).toFixed(1)} % down (40–70)`); if (occ > .02) E('P12', `${s.id} finger ${(occ * 100).toFixed(1)} % covered (≤ 2)`); }
    }
    rows.push(row);
  }
  res.shots = rows;
  if (only.has('p5')) {
    let minD = Infinity, minAt = null; const overlaps = [];
    for (let n = 0; n < Math.round(spec.end * FPS); n += 2) {
      const {places, prints} = await page.evaluate(n => window.__episode.placesAt(n), n);
      const cast = places.filter(p => spec.cast[p.name]);
      for (let i = 0; i < cast.length; i++) for (const q of cast.slice(i + 1)) { const a = cast[i], d = Math.hypot(a.x - q.x, a.z - q.z) / (2 * Math.max(a.r, q.r)); if (d < minD) { minD = d; minAt = {n, a: a.name, b: q.name}; } }
      for (const a of cast) for (const p of prints) { if (NOPRINT.test(p.id) || TOUCH[a.name]?.includes(p.id)) continue; const r = a.r * .8, dx = Math.max(p.x0 - a.x, 0, a.x - p.x1), dz = Math.max(p.z0 - a.z, 0, a.z - p.z1);
        if (Math.hypot(dx, dz) < r && p.y0 < a.y + 5 && p.y1 > a.y + .1) overlaps.push({n, actor: a.name, prop: p.id}); }
    }
    const ov = [...new Map(overlaps.map(o => [o.actor + o.prop, o])).values()];
    res.p5 = {minPairBodyWidths: +minD.toFixed(3), at: minAt, overlaps: ov};
    if (minD < 1.0) E('P5', `min pair distance ${minD.toFixed(2)} body widths at frame ${minAt.n} (${minAt.a}–${minAt.b}) (≥ 1.0)`);
    if (ov.length) E('P5', `actor-prop overlap ${ov.map(o => `${o.actor}/${o.prop}@${o.n}`).join(' ')}`);
  }
  if (only.has('p11')) {
    const chk = [], sh = id => shots.find(s => s.id.startsWith(id));
    const span = (a, b) => { const s0 = sh(a), s1 = sh(b); const out = []; for (let n = s0.start; n < s1.start + s1.frames; n += 4) out.push(n); return out; };
    const q = (frames, fn) => page.evaluate(([frames, fn]) => frames.map(n => { const T = window.__tg, E = T.E; E.placesAt(n); const sc = T.sc, o = x => sc.getObjectByName(x);
      return [n, ...eval(fn)(o, T)]; }), [frames, fn]);
    const leo = "(o, T) => [T.vis(o('LEO')), T.vis(o('LEO_headset')), T.vis(o('LEO_headsetHand'))]";
    const r11 = await q(span('11', '11'), leo), r12 = await q(span('12', '23'), leo);
    const offF = []; for (let n = Math.ceil(57.28 * FPS); n < Math.round(spec.end * FPS); n += 8) offF.push(n); const rOff = await q(offF, leo);
    const can = []; for (const id of ['08', '09', '44', '49']) can.push(...await q(span(id, id), "(o, T) => [T.vis(o('NOVA')), T.vis(o('NOVA_can'))]"));
    const bad11 = r11.filter(([, v, hs, hh]) => v && !(hs || hh)), bad12 = r12.filter(([, v, hs]) => v && !hs), badOff = rOff.filter(([, v, hs]) => v && hs), badCan = can.filter(([, v, c]) => !v || !c);
    res.p11 = {shot11: {frames: r11.length, bad: bad11.length}, shots12to23: {frames: r12.length, bad: bad12.length}, offFrom57_28: {frames: rOff.length, bad: badOff.length}, novaCan: {frames: can.length, bad: badCan.length}};
    if (bad11.length) E('P11', `LEO without his headset in 11 at frames ${bad11.slice(0, 4).map(x => x[0]).join(',')}`);
    if (bad12.length) E('P11', `LEO headset not on his head in 12–23 at frames ${bad12.slice(0, 4).map(x => x[0]).join(',')}`);
    if (badOff.length) E('P11', `LEO headset on his head after 57.28 at frames ${badOff.slice(0, 4).map(x => x[0]).join(',')}`);
    if (badCan.length) E('P11', `NOVA's can not in hand at frames ${badCan.slice(0, 6).map(x => x[0]).join(',')}`);
  }
  if (only.has('p4')) {
    const list = ['02', '04', '23', '48', '58'], p4 = {};
    for (const id of list) { const s = shots.find(x => x.id.startsWith(id)), n0 = s.start + Math.max(0, Math.floor(s.frames / 2) - 6);
      p4[id] = await page.evaluate(([n0, cnt]) => { const E = window.__episode, cam = E.debug.camera, W = 1440, H = 2560, fr = []; let prev = null, worst = 0, cov = 0;
        const flick = (A, B, M, Ma, PVa, IPVb, near) => { let n = 0, k = 0; const e = IPVb.elements, f = PVa.elements;
          const un = (x, y, z) => { const w = e[3] * x + e[7] * y + e[11] * z + e[15]; return [(e[0] * x + e[4] * y + e[8] * z + e[12]) / w, (e[1] * x + e[5] * y + e[9] * z + e[13]) / w, (e[2] * x + e[6] * y + e[10] * z + e[14]) / w]; };
          for (let py = 2; py < H - 2; py += 2) for (let px = 2; px < W - 2; px += 2) { const i = py * W + px; if (!M[i]) continue;
            const nx = (px + .5) / W * 2 - 1, ny = 1 - (py + .5) / H * 2, p0 = un(nx, ny, -1), p1 = un(nx, ny, 1), dy = p1[1] - p0[1]; if (Math.abs(dy) < 1e-6) continue;
            const t = (0 - p0[1]) / dy; if (t < 0) continue; const X = p0[0] + (p1[0] - p0[0]) * t, Z = p0[2] + (p1[2] - p0[2]) * t; if (near(X, Z)) continue;
            const w = f[3] * X + f[11] * Z + f[15], ax = (f[0] * X + f[8] * Z + f[12]) / w, ay = (f[1] * X + f[9] * Z + f[13]) / w;
            const qx = Math.round((ax + 1) / 2 * W - .5), qy = Math.round((1 - ay) / 2 * H - .5); if (qx < 2 || qy < 2 || qx >= W - 2 || qy >= H - 2 || !Ma[qy * W + qx]) continue; n++;
            let ok = false; for (let dy2 = -2; dy2 <= 2 && !ok; dy2++) for (let dx = -2; dx <= 2; dx++) if (Math.abs(A[(qy + dy2) * W + qx + dx] - B[i]) <= 25) { ok = true; break; } if (!ok) k++; }
          return n ? k / n : 0; };
        const boxes = r => [...r.places.map(m => [m.x - m.r - 2.5, m.x + m.r + 2.5, m.z - m.r - 2.5, m.z + m.r + 2.5]), ...r.prints.map(q => [q.x0 - 2.5, q.x1 + 2.5, q.z0 - 2.5, q.z1 + 2.5])];
        for (let n = n0; n < n0 + cnt; n++) { const r = E.gateMeasure(n, {w: W, h: H, floor: true}); cam.updateMatrixWorld(true);
          const PV = cam.projectionMatrix.clone().multiply(cam.matrixWorldInverse), IPV = PV.clone().invert();
          const L = Uint8Array.from(r.luma), M = Uint8Array.from(r.floor); let c = 0; for (const v of M) c += v; cov = Math.max(cov, c / M.length);
          const movers = [...prev?.movers ?? [], ...boxes(r)], near = (X, Z) => movers.some(m => X > m[0] && X < m[1] && Z > m[2] && Z < m[3]);
          if (prev) { const f = flick(prev.L, L, M, prev.M, prev.PV, IPV, near); fr.push(+(f * 100).toFixed(3)); worst = Math.max(worst, f); } prev = {L, M, PV, movers: boxes(r)}; }
        return {from: n0, frames: cnt, worstPct: +(worst * 100).toFixed(3), floorCover: +cov.toFixed(3), perFrame: fr}; }, [n0, 12]);
      if (p4[id].worstPct > 2) E('P4', `${id} floor flicker ${p4[id].worstPct} % (≤ 2)`); console.log(id, JSON.stringify(p4[id])); }
    res.p4 = p4;
  }
} finally { await browser.close(); await server.close(); }
res.errors = errors; res.result = errors.length ? 'FAIL' : 'PASS';
await mkdir('review/touchgrass', {recursive: true});
await writeFile(arg('out', `review/touchgrass/gates-touchgrass${only.has('p4') && only.size === 1 ? '-p4' : ''}.json`), JSON.stringify(res, null, 1));
for (const e of errors) console.log('ERROR', e);
console.log(JSON.stringify({p1: res.p1, p5: res.p5 && {min: res.p5.minPairBodyWidths, overlaps: res.p5.overlaps.length}, p11: res.p11, errors: errors.length, result: res.result}));
process.exitCode = errors.length ? 1 : 0;
