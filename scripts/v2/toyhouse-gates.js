// node scripts/v2/toyhouse-gates.js [--spec stories/toyhouse/episode.json] [--only p1,p3,...] [--floor]
// Toy House final fix gates (run 13 owner + reviewer verdict), measured on rendered frames (engine/episode.js gateMeasure/placesAt):
//  P1 hook: frame 0 background luma .35–.55 (bright wide), at 1.5 s the kart kid's head ≥ 25 % of frame height with kart + blaster in frame.
//  P2 T12: each blaster box ≥ 12 % of its half's height (split: measured per half camera).
//  P3 framing: subject / shot prop / tools in `see` clipped ≤ 5 % of their box area; inserts ≥ 6 % margin and 35–60 % height;
//     people medium/close: head box 12–35 % of frame height (first, mid, last frame).
//  P4 (--floor) floor flicker: 12 consecutive frames at 1440×2560 on T01 T04 T08 T11 T39: % of visible static floor pixels (floor plane
//     reprojected into the previous frame; floor within 2.5 of a moving actor / prop and its shadow skipped) whose luma has no match
//     within 25/255 in a ±2 px window ≤ 2 %.
//  P5 spacing: every 2nd frame, cast-cast and cast-crowd centre distance ≥ 1.0 body width (2 × radius); actor footprint vs story
//     prop xz box overlap = 0 (props an actor is meant to touch are listed in TOUCH).
//  P6 motion: first vs last frame mean |Δluma| ≥ 3 % (shots ≤ 1.5 s: ≥ 1.5 %).   P7: background luma ≥ .30 for shots in 2–38 s.
import {readFileSync} from 'node:fs';
import {mkdir, writeFile} from 'node:fs/promises';
import {startServer} from './server.js';
import {launch} from './browser.js';
import {layoutShots} from '../../engine/timeline.js';

const argv = process.argv.slice(2), arg = (k, d) => { const i = argv.indexOf(`--${k}`); return i >= 0 ? argv[i + 1] : d; };
const specPath = arg('spec', 'stories/toyhouse/episode.json'), spec = JSON.parse(readFileSync(specPath, 'utf8')), FPS = spec.fps;
const only = new Set((arg('only', 'p1,p2,p3,p5,p6,p7') + (argv.includes('--floor') ? ',p4' : '')).split(','));
const shots = layoutShots(spec), W = 270, H = 480;
// actor ↔ prop contacts that are the action (riding, holding, falling into, carrying)
const TOUCH = {kidc: ['kart', 'kart02', 'ped14', 'grabPlush'], kida: ['plush', 'fountain', 'kartA'], kidb: ['kartB'], taped: ['splash', 'gummy', 'drone', 'hyper', 'roll0', 'roll1', 'roll2', 'roll3', 'roll4', 'roll5'], dad: ['boxDad', 'box2'], hero: ['hyper', 'tape']};   // hero: the tape wraps around him (T23); dad: lifts box2 (T41)
const NOPRINT = /Darts$|^splash$/;
const server = await startServer(), browser = await launch(), res = {spec: specPath}, errors = [];
const E = (k, msg) => errors.push(`${k}: ${msg}`);
const clip = b => { if (!b || !b.front) return 1; const w = b.x1 - b.x0, h = b.y1 - b.y0; if (w <= 0 || h <= 0) return 0; const iw = Math.max(0, Math.min(1, b.x1) - Math.max(0, b.x0)), ih = Math.max(0, Math.min(1, b.y1) - Math.max(0, b.y0)); return 1 - iw * ih / (w * h); };
try {
  const page = await browser.newPage(); const perr = []; page.on('pageerror', e => perr.push(e.message));
  await page.goto(`${server.url}/engine/episode.html?spec=${encodeURIComponent(specPath)}&aa=0`);
  await page.waitForFunction(() => window.__episode || document.title === 'error', null, {timeout: 240000});
  if (perr.length) throw Error(perr.join('; '));
  const G = (n, o = {}) => page.evaluate(([n, o]) => { const r = window.__episode.gateMeasure(n, o); if (!o.keepLuma) delete r.luma; return r; }, [n, {w: W, h: H, ...o}]);
  const meanDiff = (a, b) => { let d = 0; for (let i = 0; i < a.length; i++) d += Math.abs(a[i] - b[i]); return d / a.length / 255; };
  if (only.has('p1')) {
    const f0 = await G(0), f15 = await G(Math.round(1.5 * FPS)), s3 = shots.find(s => s.id.startsWith('T03')), f3 = await G(s3.start + Math.floor(s3.frames / 2));
    const kid = f15.actors.kidc, head = kid?.face?.h ?? 0;
    res.p1 = {frame0Bg: +f0.bgLuma.toFixed(3), headAt1_5: +head.toFixed(3), kartAt1_5: f15.props.kart02 ? +clip(f15.props.kart02).toFixed(3) : null, blasterAt1_5: f15.tools.kidc ? +clip(f15.tools.kidc).toFixed(3) : null, t03Bg: +f3.bgLuma.toFixed(3), t03Kids: Object.keys(f3.actors)};
    if (f0.bgLuma < .35 || f0.bgLuma > .55) E('P1', `frame 0 bg luma ${f0.bgLuma.toFixed(3)} (.35–.55)`);
    if (head < .25) E('P1', `kid head ${(head * 100).toFixed(1)} % at 1.5 s (≥ 25)`);
    // "kart + blaster in frame": a face ≥ 25 % and a whole kart cannot share a 9:16 frame (kart ≥ 2.7 frame widths there), so: each covers ≥ 10 % of the frame
    const cover = b => b && b.front ? Math.max(0, Math.min(1, b.x1) - Math.max(0, b.x0)) * Math.max(0, Math.min(1, b.y1) - Math.max(0, b.y0)) : 0;
    res.p1.kartCover = +cover(f15.props.kart02).toFixed(3); res.p1.blasterCover = +cover(f15.tools.kidc).toFixed(3);
    if (res.p1.kartCover < .10) E('P1', `kart at 1.5 s covers ${(res.p1.kartCover * 100).toFixed(1)} % of the frame (≥ 10)`);
    if (res.p1.blasterCover < .10) E('P1', `blaster at 1.5 s covers ${(res.p1.blasterCover * 100).toFixed(1)} % of the frame (≥ 10)`);
    if (f3.bgLuma < .35 || f3.bgLuma > .55) E('P1', `T03 bg luma ${f3.bgLuma.toFixed(3)} (.35–.55)`);
  }
  const rows = [];
  if (['p2', 'p3', 'p6', 'p7'].some(k => only.has(k))) for (const s of shots) {
    const ids = [s.start, s.start + Math.floor(s.frames / 2), s.start + s.frames - 1], m = [];
    for (const n of ids) m.push(await G(n, {keepLuma: true}));
    const win = Math.round(1.5 * FPS), extra = [];   // P6: no 1.5 s window looks still (frames 1.5 s apart, every 0.75 s)
    if (only.has('p6') && s.frames > win + 4) for (let a = s.start; a + win < s.start + s.frames; a += Math.round(.75 * FPS)) extra.push([a, a + win]);
    const row = {id: s.id, t: +(s.start / FPS).toFixed(2)};
    const who = s.subject ?? null, split = s.move === 'splitScreen';
    if (only.has('p3') && !split) {
      const items = [], see = s.see ?? [];
      if (s.size !== 'insert') { if (who) items.push(['actor', who]); for (const x of see) if (spec.cast[x] && x !== who) items.push(['actor', x]); }   // inserts: judged on the object (hands, a tool, a prop)
      if (s.prop?.startsWith('prop_')) items.push(['prop', s.prop.slice(5)]); if (s.prop?.startsWith('tool_')) items.push(['tool', see[0]]);
      let worst = 0, worstWhat = '';
      const hs = ['medium', 'close'].includes(s.size);   // people in medium/close/insert: head + shoulders; wide/action: full body
      const abox = a => { if (!a?.box) return null; if (!hs) return {...a.box, front: a.front};   // head + shoulders: the head box, shoulders = 2 head widths, down to the shoulder line
        const f = a.face, t = a.torso; if (!f || !t) return {...a.box, front: a.front};
        return {x0: Math.min(f.x0, t.x0), x1: Math.max(f.x1, t.x1), y0: f.y0, y1: Math.max(f.y1, Math.min(t.y1, t.y0 + .25 * (t.y1 - t.y0))), front: a.front}; };   // head + the top quarter of the torso (shoulders)
      const exempt = s.id.startsWith('T02');   // P1 (higher priority): face ≥ 25 % at 1.5 s — the torso is wider than the 9:16 frame there
      if (!exempt) for (const r of m) for (const [k, id] of items) { const b = k === 'actor' ? abox(r.actors[id]) : k === 'prop' ? r.props[id] : r.tools[id];
        if (!b) continue; const c = clip(b); if (c > worst) { worst = c; worstWhat = id; } }
      row.clip = +worst.toFixed(3); if (worst > .05) E('P3', `${s.id} ${worstWhat} clipped ${(worst * 100).toFixed(1)} %`);
      if (s.size === 'insert' && s.prop?.startsWith('prop_')) { const b = m[1].props[s.prop.slice(5)]; if (b) { const h = b.y1 - b.y0, mg = Math.min(b.x0, b.y0, 1 - b.x1, 1 - b.y1); row.insert = {h: +h.toFixed(3), margin: +mg.toFixed(3)};
        if (h < .35 || h > .60) E('P3', `${s.id} insert height ${(h * 100).toFixed(1)} % (35–60)`); if (mg < .06) E('P3', `${s.id} insert margin ${(mg * 100).toFixed(1)} % (≥ 6)`); } }
      if (who && ['medium', 'close'].includes(s.size) && !s.back) { const f = m[1].actors[who]?.face; if (f) { row.face = +f.h.toFixed(3); if (f.h < .12 || f.h > .35) E('P3', `${s.id} face ${(f.h * 100).toFixed(1)} % (12–35)`); } }
    }
    if (only.has('p6')) { const d = meanDiff(m[0].luma, m[2].luma), lim = s.frames / FPS <= 1.5 ? .015 : .03; row.motion = +d.toFixed(4); if (d < lim) E('P6', `${s.id} first-vs-last ${(d * 100).toFixed(2)} % (≥ ${lim * 100})`);
      let wmin = Infinity; for (const [a, b] of extra) { const la = (await G(a, {keepLuma: true})).luma, lb = (await G(b, {keepLuma: true})).luma; wmin = Math.min(wmin, meanDiff(la, lb)); }
      if (extra.length) { row.window = +wmin.toFixed(4); if (wmin < .03) E('P6', `${s.id} a 1.5 s window changes ${(wmin * 100).toFixed(2)} % (≥ 3)`); } }
    if (only.has('p7')) { row.bg = +m[1].bgLuma.toFixed(3); const t = s.start / FPS; if (t >= 2 && t < 38.6 && m[1].bgLuma < .30) E('P7', `${s.id} bg luma ${m[1].bgLuma.toFixed(3)} (≥ .30)`); }
    if (only.has('p2') && s.id.startsWith('T12')) {   // each half with its own camera (270 × 240): the blaster of that half's kid, ≥ 12 % of the half's height, whole
      const sp = spec.shots.find(x => x.id === s.id), lerp = (a, b, u) => a.map((v, i) => v + (b[i] - v) * u), half = (c, u) => ({position: lerp(c.from.position, c.to.position, u), target: lerp(c.from.target, c.to.target, u), fov: c.from.fov});
      row.blasters = {};
      for (const [k, kid] of [['a', 'kidb'], ['b', 'kidc']]) for (const u of [.2, .5, .8]) { const n = s.start + Math.floor(s.frames * u);
        const r = await page.evaluate(([n, cam]) => { const E = window.__episode; E.renderFrame(n, 270, 240); E.renderCamera(cam, n / E.FPS, 270, 240, 'toyParty2'); const g = E.gateMeasure(n, {w: 270, h: 240, render: false}); return g.tools; }, [n, half(sp[k], u)]);
        const b = r[kid], h = b ? b.y1 - b.y0 : 0, c = clip(b); row.blasters[`${kid}@${u}`] = {h: +h.toFixed(3), clip: +c.toFixed(3)};
        if (h < .12) E('P2', `T12 ${kid} blaster ${(h * 100).toFixed(1)} % of its half at ${u} (≥ 12)`); if (c > .05) E('P2', `T12 ${kid} blaster clipped ${(c * 100).toFixed(1)} %`); } }
    rows.push(row);
  }
  res.shots = rows;
  if (only.has('p5')) {
    let minD = Infinity, minAt = null, overlaps = [];
    for (let n = 0; n < Math.round(spec.end * FPS); n += 2) {
      const {places, prints} = await page.evaluate(n => window.__episode.placesAt(n), n);
      const cast = places.filter(p => spec.cast[p.name]), crowd = places.filter(p => !spec.cast[p.name]);
      for (let i = 0; i < cast.length; i++) for (const q of [...cast.slice(i + 1), ...crowd]) { const a = cast[i], d = Math.hypot(a.x - q.x, a.z - q.z) / (2 * Math.max(a.r, q.r)); if (d < minD) { minD = d; minAt = {n, a: a.name, b: q.name}; } }
      for (const a of cast) for (const p of prints) { if (NOPRINT.test(p.id) || TOUCH[a.name]?.includes(p.id)) continue; const r = a.r * .8, dx = Math.max(p.x0 - a.x, 0, a.x - p.x1), dz = Math.max(p.z0 - a.z, 0, a.z - p.z1);
        if (Math.hypot(dx, dz) < r && p.y0 < a.y + 5 && p.y1 > a.y + .1) overlaps.push({n, actor: a.name, prop: p.id}); }
    }
    const ov = [...new Map(overlaps.map(o => [o.actor + o.prop, o])).values()];
    res.p5 = {minPairBodyWidths: +minD.toFixed(3), at: minAt, overlaps: ov};
    if (minD < 1.0) E('P5', `min pair distance ${minD.toFixed(2)} body widths at frame ${minAt.n} (${minAt.a}–${minAt.b}) (≥ 1.0)`);
    if (ov.length) E('P5', `actor-prop overlap ${ov.map(o => `${o.actor}/${o.prop}@${o.n}`).join(' ')}`);
  }
  if (only.has('p4')) {
    // motion-compensated: each floor pixel of frame b is traced to the floor plane (y = 0) with b's camera, projected into
    // frame a with a's camera, and compared with a's luma in a ±2 px window; it flickers when no pixel there is within 25/255
    const list = ['T01', 'T04', 'T08', 'T11', 'T39'], p4 = {};
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
        for (let n = n0; n < n0 + cnt; n++) { const r = E.gateMeasure(n, {w: W, h: H, floor: true}); cam.updateMatrixWorld(true);
          const PV = cam.projectionMatrix.clone().multiply(cam.matrixWorldInverse), IPV = PV.clone().invert();
          const L = Uint8Array.from(r.luma), M = Uint8Array.from(r.floor); let c = 0; for (const v of M) c += v; cov = Math.max(cov, c / M.length);
          const movers = [...prev?.movers ?? [], ...r.places.map(m => [m.x - m.r - 2.5, m.x + m.r + 2.5, m.z - m.r - 2.5, m.z + m.r + 2.5]), ...r.prints.map(q => [q.x0 - 2.5, q.x1 + 2.5, q.z0 - 2.5, q.z1 + 2.5])];   // moving things and their shadows (this frame + the last)
          const near = (X, Z) => movers.some(m => X > m[0] && X < m[1] && Z > m[2] && Z < m[3]);
          if (prev) { const f = flick(prev.L, L, M, prev.M, prev.PV, IPV, near); fr.push(+(f * 100).toFixed(3)); worst = Math.max(worst, f); } prev = {L, M, PV, movers: [...r.places.map(m => [m.x - m.r - 2.5, m.x + m.r + 2.5, m.z - m.r - 2.5, m.z + m.r + 2.5]), ...r.prints.map(q => [q.x0 - 2.5, q.x1 + 2.5, q.z0 - 2.5, q.z1 + 2.5])]}; }
        return {from: n0, frames: cnt, worstPct: +(worst * 100).toFixed(3), floorCover: +cov.toFixed(3), perFrame: fr}; }, [n0, 12]);
      if (p4[id].worstPct > 2) E('P4', `${id} floor flicker ${p4[id].worstPct} % (≤ 2)`); console.log(id, JSON.stringify(p4[id])); }
    res.p4 = p4;
  }
} finally { await browser.close(); await server.close(); }
res.errors = errors; res.result = errors.length ? 'FAIL' : 'PASS';
await mkdir('review/toyhouse', {recursive: true});
await writeFile(arg('out', `review/toyhouse/gates${only.has('p4') && only.size === 1 ? '-p4' : ''}.json`), JSON.stringify(res, null, 1));
for (const e of errors) console.log('ERROR', e);
console.log(JSON.stringify({p1: res.p1, p5: res.p5 && {min: res.p5.minPairBodyWidths, overlaps: res.p5.overlaps.length}, errors: errors.length, result: res.result}));
process.exitCode = errors.length ? 1 : 0;
