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
    gate('decal', 'hero ball: face decal ≈ 45 % of the ball width (0.40–0.50)', ok, r.map(x => x.ball ? `f${x.f}: face ${x.face.toFixed(2)} / ball ${x.D.toFixed(2)} = ${(100 * x.ratio).toFixed(0)} %` : `f${x.f}: no ball`).join(' · ')); } }];
