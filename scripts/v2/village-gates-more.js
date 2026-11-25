// scripts/v2/village-gates-more.js — tuft P3 gate sections for scripts/v2/village-gates.js (imported; each {sec, run(ctx)}).
//   fx     breath reach ≥ 1.5 NIGHTFANG body lengths (pure, engine/powers.js BREATH) + ground glow drawn · lightning runner readable
//          (LEAD's mask ≥ 1 % of the frame and fully inside it at the pick frame, ribbon + forks drawn) · BLINK glow area ≥ 0.3 % of
//          the frame in the MS of LITTLE (frame with BLINK − frame with BLINK hidden: Δ luma ≥ .05)
//   decal  hero ball: face decal width ≈ 45 % of the ball width (0.40–0.50) at the hero ball / room frames
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import * as B from '../../engine/beast.js';
import * as PW from '../../engine/powers.js';

const L = f => JSON.parse(readFileSync(f, 'utf8')), pick = (set, label) => L('engine/fixtures/beasts2/picks.json').find(p => p.set === set && (p.label === label || p.beast === label) && (p.look ?? 'night') === 'night');
const diffArea = (a, b) => +execFileSync('python3', ['-c', `import sys, numpy as np; from PIL import Image
L = lambda f: (np.asarray(Image.open(f).convert('RGB'), dtype=float) / 255) @ [.2126, .7152, .0722]
print(float(((L(sys.argv[1]) - L(sys.argv[2])) >= .05).mean()))`, a, b]).toString();
export const SECTIONS = [
  {sec: 'fx', async run({open, png, masks, gate, raw}) {
    const NF = L('beasts/NIGHTFANG.json'), g = B.buildGeometry(NF), v = B.worldVerts(B.sampleBeast(NF, [{t: 0, state: 'idle'}], 0, {geo: g}), g); let z0 = 1e9, z1 = -1e9; for (let i = 2; i < v.length; i += 3) { z0 = Math.min(z0, v[i]); z1 = Math.max(z1, v[i]); }
    const reach = PW.breathReach() * (NF.scale ?? 1) * .9, bodyL = z1 - z0;
    const p = await open('engine/fixtures/beasts2/powers.json'), fb = pick('powers', 'breathe').frame;
    await png(p, fb, 270, 480, `${raw}/fx-breath.png`); const st = await p.evaluate(() => { const sc = window.__episode.debug.scene; let n = 0, f = 0; sc.traverse(o => { if (o.name === 'fxGroundGlow') n = o.count; if (o.name === 'fxFire') f = o.count; }); return {ground: n, cards: f}; });
    gate('fx', 'NIGHTFANG breath = long cyan jet (≥ 1.5 body lengths) that lights the ground', reach >= 1.5 * bodyL && st.ground > 0, `jet reach ${reach.toFixed(1)} studs = ${(reach / bodyL).toFixed(2)} × body length ${bodyL.toFixed(1)} (≥ 1.5); ${st.cards} flame cards + ${st.ground} ground-glow discs at frame ${fb}`);
    const fl = pick('powers', 'lightning').frame, rows = [];
    for (const f of [fl - 6, fl, fl + 6]) { const fr = await png(p, f, 270, 480, `${raw}/fx-bolt-${f}.png`), mk = await masks(p, ['lead'], 270, 480, `${raw}/fx-bolt-${f}`);
      const bb = JSON.parse(execFileSync('python3', ['-c', `import sys, json, numpy as np; from PIL import Image
m = np.asarray(Image.open(sys.argv[1]).convert('L')) > 127; ys, xs = np.nonzero(m)
print(json.dumps({'share': float(m.mean()), 'inside': bool(len(xs) and xs.min() > 0 and xs.max() < m.shape[1] - 1 and ys.min() > 0 and ys.max() < m.shape[0] - 1)}))`, mk.lead]).toString());
      const segs = await p.evaluate(() => { let n = 0; window.__episode.debug.scene.traverse(o => { if (o.name === 'fxBolts') n = o.count; }); return n; }); rows.push({f, ...bb, segs}); void fr; }
    const okL = rows.every(r => r.share >= .01 && r.inside && r.segs > 10);
    gate('fx', 'lightning: the runner reads (R6 body in frame) + ribbon + forks', okL, rows.map(r => `f${r.f}: body ${(100 * r.share).toFixed(1)} % of frame (≥ 1 %), ${r.inside ? 'inside' : 'CUT by the frame edge'}, ${r.segs} bolt/ribbon segments`).join(' · '));
    await p.close();
    const area = [], BL = ['engine/fixtures/beasts2/heroes-night.json', 'engine/fixtures/village/moon-heroes.json'], f0 = pick('heroes', 'BLINK').frame;
    for (const spec of BL) { const q = await open(spec), tag = spec.split('/').pop().replace('.json', '');
      for (const ff of [f0 - 8, f0, f0 + 8]) area.push({spec: tag, f: ff, a: await png(q, ff, 540, 960, `${raw}/blink-on-${tag}-${ff}.png`)});
      await q.evaluate(() => { const E = window.__episode; E.beasts.actors.blink.root.traverse(o => o.layers.set(31)); E.debug.scene.traverse(o => { if (o.name === 'blinkTrail') o.layers.set(31); }); });   // BLINK off: camera layer 0 never sees it
      for (const r of area.filter(x => x.spec === tag)) r.b = await png(q, r.f, 540, 960, `${raw}/blink-off-${tag}-${r.f}.png`); await q.close(); }
    for (const r of area) r.area = diffArea(r.a, r.b);
    const mn = Math.min(...area.map(r => r.area));
    gate('fx', "BLINK readable at 390 px: glow area ≥ 0.3 % of the frame (MS of LITTLE)", mn >= .003, `${area.map(r => `${r.spec === 'heroes-night' ? 'mystery' : 'moonlit'} f${r.f} ${(100 * r.area).toFixed(2)} %`).join(', ')} (min ${(100 * mn).toFixed(2)} %); wings ${L('beasts/BLINK.json').wingCards.w}×${L('beasts/BLINK.json').wingCards.h} × size, flutter ${B.BLINK.flap} Hz, trail ${L('beasts/BLINK.json').trail.n}`, {area}); } },
  {sec: 'decal', async run({open, gate}) {
    const p = await open('engine/fixtures/beasts2/tuft.json'), fr = ['hero ball', 'hero room'].map(l => pick('tuft', l).frame);
    const r = await p.evaluate(async ([fr]) => { const T = await import('three'), E = window.__episode, out = []; for (const f of fr) { E.renderFrame(f, 90, 160); let ball = null; E.debug.scene.traverse(o => { if (o.name === 'puffBall' && o.visible) ball = o; }); if (!ball) { out.push({f, ball: false}); continue; }
      let dec = null; ball.parent.traverse(o => { if (o.name === 'face_decal') dec = o; }); const root = ball.parent, yaw = root.rotation.y, bb = new T.Box3().setFromObject(dec, true), bw = new T.Box3().setFromObject(ball, true);
      const right = new T.Vector3(Math.cos(yaw), 0, -Math.sin(yaw)), w = c => Math.abs(c.max.clone().sub(c.min).dot(right)) || Math.max(c.max.x - c.min.x, c.max.z - c.min.z);
      const ext = b => { const pts = []; for (const x of [b.min.x, b.max.x]) for (const z of [b.min.z, b.max.z]) pts.push(x * right.x + z * right.z); return Math.max(...pts) - Math.min(...pts); };
      out.push({f, ball: true, D: ext(bw), face: ext(bb), ratio: ext(bb) / ext(bw)}); } return out; }, [fr]);
    await p.close(); const ok = r.every(x => x.ball && x.ratio >= .40 && x.ratio <= .50);
    gate('decal', 'hero ball: face decal ≈ 45 % of the ball width (0.40–0.50)', ok, r.map(x => x.ball ? `f${x.f}: face ${x.face.toFixed(2)} / ball ${x.D.toFixed(2)} = ${(100 * x.ratio).toFixed(0)} %` : `f${x.f}: no ball`).join(' · ')); } },
  // loc: every village fixture (parts/locations/*.json via engine/fixtures/village/<loc>-<look>.json), both views:
  //   tris ≤ 90k (whole scene, instances counted) · draw calls (report) · est. final s/frame ≤ 3.0 (1440×2560 MSAA, both views) ·
  //   night: windows lit ≥ 60 %, darkest-10 % 0.012–0.03, every beast / actor in frame separates ≥ 0.06 · exteriors: mountain ≥ 1 % of the
  //   establishing frame · festivalPlaza wide ≥ 40 distinct rooftops · colossal Tuft top ≥ 1.2 × tallest roof in frame · room puff ≥ 70 % +
  //   legs through the round window. groundY / LAYER: tests/village.js (pure).
  {sec: 'loc', async run({open, png, masks, nightGates, gate, raw}) {
    const fx = (await import('node:fs')).readdirSync('engine/fixtures/village').filter(f => /^(beastYard|beastClass|homeDining|homeBedroom|villageStreet|festivalPlaza|titanCave)-(day|night|dusk)\.json$/.test(f)).sort();
    const EXT = ['beastYard', 'villageStreet', 'festivalPlaza', 'titanCave'], cost = [], rows = [];
    for (const file of fx) { const spec = `engine/fixtures/village/${file}`, S = L(spec), loc = S.location, look = file.replace(/^.*-|\.json$/g, ''), p = await open(spec), r = {loc, look};
      const views = [[6, 'establish'], [30, 'hero']], names = Object.keys(S.cast ?? {});
      for (const [f, v] of views) { const fr = await png(p, f, 270, 480, `${raw}/loc-${loc}-${look}-${v}.png`);
        const m = await p.evaluate(([f]) => { const E = window.__episode, V = window.__village, q = E.renderFrame(f, 270, 480); return {calls: q.calls, frustum: q.triangles, tris: V.tris(), win: V.windows, mountain: V.mountain ? V.maskShare(E.debug.renderer, E.debug.camera, 270, 480, 'mountain') : null}; }, [f]);
        r[v] = m;
        if (S.look4 === 'moonlit') { const mk = await masks(p, names, 270, 480, `${raw}/loc-${loc}-${look}-${v}`); r[v].nightRow = JSON.parse((await import('node:child_process')).execFileSync('python3', ['scripts/v2/nightstats.py', fr, ...Object.entries(mk).map(([n, f2]) => `${n}=${f2}`)]).toString()); } }
      await p.close();
      if (!rows.some(x => x.loc === loc)) { const q = await open(spec, '&aa=1'); r.final = await q.evaluate(() => { const E = window.__episode; E.renderFrame(6, 1440, 2560); return [6, 30].map(f => E.renderFrame(f, 1440, 2560).ms / 1000); }); await q.close(); cost.push(...r.final); } else r.final = [];   // final cost once per location (its first look)
      rows.push(r); console.log('loc', loc, look, r.establish.tris, r.establish.calls, r.final.map(x => x.toFixed(2)).join('/')); }
    const tmax = Math.max(...rows.flatMap(r => [r.establish.tris, r.hero.tris]));
    gate('loc', 'per location tris ≤ 90k (whole scene, instances counted)', tmax <= 90000, rows.map(r => `${r.loc}/${r.look} ${(Math.max(r.establish.tris, r.hero.tris) / 1000).toFixed(1)}k`).join(', '), {rows});
    gate('loc', 'draw calls (report)', true, rows.map(r => `${r.loc}/${r.look} ${r.establish.calls}/${r.hero.calls}`).join(', '));
    gate('loc', 'est. final s/frame ≤ 3.0 (1440×2560, MSAA, measured range)', Math.max(...cost) <= 3.0, `${Math.min(...cost).toFixed(2)}–${Math.max(...cost).toFixed(2)} s/frame (${rows.filter(r => r.final.length).map(r => `${r.loc} ${r.final.map(x => x.toFixed(2)).join('/')}`).join(', ')})`);
    const nights = rows.filter(r => r.establish.nightRow), win = nights.map(r => ({n: `${r.loc}`, s: r.establish.win.total ? r.establish.win.lit / r.establish.win.total : 1, t: r.establish.win.total}));
    gate('loc', 'night windows lit ≥ 60 %', win.every(w => w.s >= .6), win.map(w => `${w.n} ${(100 * w.s).toFixed(0)} % of ${w.t}`).join(', '));
    nightGates('loc', 'night locations', nights.flatMap(r => [r.establish.nightRow, r.hero.nightRow]));
    const mt = rows.filter(r => EXT.includes(r.loc)).map(r => ({n: `${r.loc}/${r.look}`, s: r.establish.mountain}));
    gate('loc', 'the mountain visible in every exterior establishing view (≥ 1 % of frame)', mt.every(m => m.s >= .01), mt.map(m => `${m.n} ${(100 * m.s).toFixed(1)} %`).join(', '));
    // rooftops + colossal (festivalPlaza-colossal) and room puff (homeBedroom)
    { const p = await open('engine/fixtures/village/festivalPlaza-colossal.json');
      const rr = await p.evaluate(() => { const E = window.__episode, V = window.__village, out = {}; for (const [f, k] of [[40, 'wide'], [80, 'low']]) { E.renderFrame(f, 540, 960); const ids = V.roofIdPass(E.debug.renderer, E.debug.camera, 540, 960).filter(x => x.n >= 4);
          const tops = ids.map(x => V.roofs.get(x.id)?.top).filter(v => v !== undefined); let tuft = null; const a = E.beasts.actors.tuft; if (a) { const T = a.root; T.updateMatrixWorld(true); let y1 = -1e9; T.traverse(o => { if (o.isMesh && o.geometry) { o.geometry.computeBoundingBox(); } });
            y1 = a.sample ? Math.max(...Array.from({length: 1}, () => 0)) : 0; tuft = a; }
          out[k] = {roofs: ids.length, unknown: ids.filter(x => !V.roofs.has(x.id)).length, maxTop: Math.max(...tops)}; } return out; });
      const tuftTop = await p.evaluate(async () => { const T = await import('three'), E = window.__episode; E.renderFrame(40, 270, 480); const a = E.beasts.actors.tuft; const m = []; E.debug.scene.updateMatrixWorld(true);
        // Tuft's world top: its live mesh is shader-skinned; use the beast mask render's highest pixel row back-projected is fragile, so use the pure sample: puff scale × rest height
        return {k: a.root.scale.x, y: a.root.position.y, rest: a.restTop ?? null, sample: a.sample ? {k: a.sample.root.k ?? 1} : null}; });
      await p.close();
      const B2 = await import('../../engine/beast.js'), TU = L('beasts/TUFT.json'), g = B2.buildGeometry(TU), sv = B2.worldVerts(B2.sampleBeast(TU, [{t: 0, state: 'idle'}], 0, {geo: g}), g); let h0 = 0; for (let i = 1; i < sv.length; i += 3) h0 = Math.max(h0, sv[i]);
      const top = h0 * (tuftTop.sample?.k ?? tuftTop.k), ratio = top / rr.wide.maxTop;
      gate('loc', 'festivalPlaza wide: ≥ 40 distinct rooftops in frame (town reads big)', rr.wide.roofs >= 40, `wide ${rr.wide.roofs} rooftops (≥ 4 px each at 540×960; ${rr.wide.unknown} unmapped ids), low angle ${rr.low.roofs}`);
      gate('loc', 'colossal Tuft top ≥ 1.2 × the tallest roof in frame', ratio >= 1.2, `Tuft top ${top.toFixed(1)} studs (puff k ${(tuftTop.sample?.k ?? tuftTop.k).toFixed(2)}) vs tallest visible roof ${rr.wide.maxTop.toFixed(1)} → × ${ratio.toFixed(2)}`); }
    { const p = await open('engine/fixtures/village/homeBedroom-night.json');
      const r = await p.evaluate(async () => { const T = await import('three'), E = window.__episode; E.renderFrame(12, 270, 480); let ball = null, legs = []; E.debug.scene.traverse(o => { if (o.name === 'puffBall' && o.visible) ball = o; });
        const root = ball.parent, a = []; root.traverse(o => { if (/leg/i.test(o.name) && o.isMesh) a.push(o); });
        const b = new T.Box3().setFromObject(ball, true), D = b.max.x - b.min.x, feet = a.map(o => { const bb = new T.Box3().setFromObject(o, true); return [+(bb.max.x + bb.min.x).toFixed(2) / 2, +((bb.max.y + bb.min.y) / 2).toFixed(2), +bb.max.z.toFixed(2)]; });
        return {D, feet, names: a.map(o => o.name)}; });
      await p.close(); const W = L('parts/locations/homeBedroom.json'), room = W.rooms[0], win = W.discs[0], wallZ = room.d / 2, inner = win.r - win.t / 2;
      const legsOut = r.feet.filter(f => f[2] > wallZ + .25 && Math.hypot(f[0] - win.at[0], f[1] - win.at[1]) <= inner);
      gate('loc', 'room puff: hero ball ≥ 70 % of homeBedroom floor width, legs through the round window', r.D / room.w >= .7 && legsOut.length >= 2, `ball Ø ${r.D.toFixed(2)} / floor ${room.w} = ${(100 * r.D / room.w).toFixed(0)} %; legs past the wall (z > ${(wallZ + .25).toFixed(2)}) inside the window (r ${inner.toFixed(2)}): ${legsOut.length}/${r.feet.length} (${r.names.join(', ')})`); } } }];

