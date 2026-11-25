// scripts/v2/fix3b-gates.js — tuft P3B gate sections for scripts/v2/village-gates.js (imported; each {sec, run(ctx)}); numbers via
//   scripts/v2/fixstats.py. Run: node scripts/v2/village-gates.js --only tuft,lantern,hill,door,cave,nightscope
//   tuft    colossal Tuft hook + payoff frames (festivalPlaza-colossal 40 / 80, demo-co 80): ≤ 3 % of Tuft's pixels clipped (luma ≥ .98),
//           two dark eye blobs measured (luma < .2, similar size), blue AND gold tip pixels present (≥ .2 % of the mask each)
//   lantern plaza wide frames: lantern pixels ≤ 18 % of the frame; 0 lantern pixels over a subject's face (top 35 % of each actor mask)
//           or Tuft's eyes (disc 2 × the eye blob radius); mountain pixels covered by lanterns reported
//   hill    festivalPlaza dusk: slate-roof hue pixels ≥ 25 % of the hillside region (the band above the plaza roofs); dusk mean hue in
//           the amber range (20–50°) and mean saturation ≥ the day plaza's (same view)
//   door    homeDining night: BOULDER separation (ring) ≥ .06 in both views (warm lantern backlight in the barn door)
//   cave    titanCave night: eyes ignite (eye px ≥ 0.05 % of the frame, warm) + the cave arch visible (rim px in the arch band)
//   nightscope  the owner's rulings: darkest-10 % on EXTERIOR night shots only (lit interiors exempt); separation on story subjects
//           only (actors, hero-tier beasts, Tuft, Titan; far low-tier crowds exempt)
import {readFileSync, readdirSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
const L = f => JSON.parse(readFileSync(f, 'utf8')), FS = (...a) => JSON.parse(execFileSync('python3', ['scripts/v2/fixstats.py', ...a.map(String)]).toString());
// a white mask of the objects whose name matches (instanced lanterns, the mountain …) for the frame left by the last renderFrame
async function objMask(page, name, W, H, file) {
  const url = await page.evaluate(async ([name, W, H]) => { const T = await import('three'), E = window.__episode, sc = E.debug.scene, r = E.debug.renderer, cam = E.debug.camera, hid = [], sw = [];
    const white = new T.MeshBasicMaterial({color: '#ffffff', fog: false, toneMapped: false});
    sc.traverse(o => { if (!(o.isMesh || o.isSprite || o.isPoints || o.isLine) || !o.visible) return; if (o.name === name) { sw.push([o, o.material]); o.material = white; } else { hid.push(o); o.visible = false; } });
    const bg = sc.background, fog = sc.fog, rt = new T.WebGLRenderTarget(W, H); sc.background = new T.Color('#000000'); sc.fog = null; r.setRenderTarget(rt); r.render(sc, cam);
    const px = new Uint8Array(W * H * 4); r.readRenderTargetPixels(rt, 0, 0, W, H, px); r.setRenderTarget(null); for (const [o, m] of sw) o.material = m; for (const o of hid) o.visible = true; sc.background = bg; sc.fog = fog; rt.dispose();
    const c = document.createElement('canvas'); c.width = W; c.height = H; const x = c.getContext('2d'), im = x.createImageData(W, H);
    for (let y = 0; y < H; y++) for (let q = 0; q < W; q++) { const v = Math.max(px[((H - 1 - y) * W + q) * 4], px[((H - 1 - y) * W + q) * 4 + 1]) > 8 ? 255 : 0; im.data.set([v, v, v, 255], (y * W + q) * 4); }
    x.putImageData(im, 0, 0); return c.toDataURL('image/png'); }, [name, W, H]);
  (await import('node:fs')).writeFileSync(file, Buffer.from(url.split(',')[1], 'base64')); return file; }
const PY_FACE = `import sys, numpy as np; from PIL import Image
m = np.asarray(Image.open(sys.argv[1]).convert('L')) > 127; o = np.zeros_like(m); ys, xs = np.nonzero(m)
if len(ys): y0, y1 = ys.min(), ys.max(); o[y0:int(y0 + .35 * (y1 - y0 + 1)) + 1] = m[y0:int(y0 + .35 * (y1 - y0 + 1)) + 1]
Image.fromarray((o * 255).astype(np.uint8)).save(sys.argv[2])`;
const PY_EYES = `import sys, json, numpy as np; from PIL import Image
m = np.asarray(Image.open(sys.argv[1]).convert('L')) > 127; o = np.zeros_like(m); H, W = m.shape; yy, xx = np.mgrid[0:H, 0:W]
for e in json.loads(sys.argv[3]): r = 2 * (e['px'] / np.pi) ** .5; o |= (xx - e['x']) ** 2 + (yy - e['y']) ** 2 <= r * r
Image.fromarray((o * 255).astype(np.uint8)).save(sys.argv[2])`;
export const SECTIONS = [
  {sec: 'tuft', async run({open, png, masks, gate, raw}) {
    const rows = [];
    for (const [spec, frames] of [['engine/fixtures/village/festivalPlaza-colossal.json', [[40, 'hook (wide)'], [80, 'payoff (low)']]], ['engine/fixtures/village/demo-co.json', [[80, 'demo reveal']]]]) { const p = await open(spec, '&aa=1');
      for (const [f, k] of frames) { const fr = await png(p, f, 540, 960, `${raw}/tuft-${f}-${spec.split('/').pop().replace('.json', '')}.png`), mk = await masks(p, ['tuft'], 540, 960, fr.replace('.png', ''));
        rows.push({k, f, ...FS('tuft', fr, mk.tuft)}); } await p.close(); }
    const line = rows.map(r => `${r.k}: clip ${(100 * r.clip).toFixed(1)} %, eyes ${r.eyes?.length ?? 0} (${(r.eyes ?? []).map(e => e.px).join('/')} px, pair ${r.eyePair}), blue ${(100 * r.blue).toFixed(2)} % gold ${(100 * r.gold).toFixed(2)} %`).join(' · ');
    gate('tuft', 'colossal Tuft: ≤ 3 % of its pixels clipped (luma ≥ .98)', rows.every(r => r.clip <= .03), line, {rows});
    gate('tuft', 'colossal Tuft: two dark eyes measured (2 blobs, luma < .2, similar size)', rows.every(r => r.eyePair), rows.map(r => `${r.k} ${r.eyes?.length ?? 0} blobs pair ${r.eyePair}`).join(', '));
    gate('tuft', 'colossal Tuft: blue-gold tips present (blue ≥ .2 % and gold ≥ .2 % of its pixels)', rows.every(r => r.blue >= .002 && r.gold >= .002), rows.map(r => `${r.k} blue ${(100 * r.blue).toFixed(2)} % gold ${(100 * r.gold).toFixed(2)} %`).join(', ')); } },
  {sec: 'lantern', async run({open, png, masks, gate, raw}) {
    const rows = [];
    for (const [spec, frames] of [['engine/fixtures/village/festivalPlaza-colossal.json', [40, 80]], ['engine/fixtures/village/demo-pl.json', [20, 80]], ['engine/fixtures/village/demo-co.json', [80]]]) { const S = L(spec), p = await open(spec, '&aa=1'), names = Object.keys(S.cast ?? {});
      for (const f of frames) { const tag = `${raw}/lan-${spec.split('/').pop().replace('.json', '')}-${f}`, fr = await png(p, f, 540, 960, `${tag}.png`), lm = await objMask(p, 'lanternSea', 540, 960, `${tag}-lan.png`), mt = await objMask(p, 'mountain', 540, 960, `${tag}-mtn.png`);
        const mk = await masks(p, names, 540, 960, tag), faces = [];
        for (const [n, file] of Object.entries(mk)) { if (n === 'tuft') { const t = FS('tuft', fr, file); if (t.eyes?.length) { execFileSync('python3', ['-c', PY_EYES, file, `${tag}-eyes.png`, JSON.stringify(t.eyes)]); faces.push(`tuftEyes=${tag}-eyes.png`); } continue; }
          if (L(spec).cast[n]?.style === 'beast') continue; execFileSync('python3', ['-c', PY_FACE, file, `${tag}-face-${n}.png`]); faces.push(`${n}=${tag}-face-${n}.png`); }
        const st = FS('lantern', fr, lm, ...faces), mtn = FS('lantern', fr, lm, `mountain=${mt}`).faces.mountain;
        rows.push({spec: spec.split('/').pop(), f, share: st.share, over: Object.entries(st.faces).filter(([, v]) => v.px > 0).map(([n, v]) => [n, v.over]), mtn: mtn.px ? mtn.over / mtn.px : 0}); } await p.close(); }
    gate('lantern', 'lantern pixels ≤ 18 % of the frame (plaza wides)', rows.every(r => r.share <= .18), rows.map(r => `${r.spec}@${r.f} ${(100 * r.share).toFixed(1)} %`).join(', '), {rows});
    const ov = rows.flatMap(r => r.over.map(([n, v]) => ({n, v, at: `${r.spec}@${r.f}`}))), bad = ov.filter(o => o.v > 0);
    gate('lantern', '0 lantern pixels over subject faces / Tuft\'s eyes', bad.length === 0, `${ov.length} face/eye regions checked; ${bad.length ? bad.map(o => `${o.n}@${o.at} ${o.v} px`).join(', ') : 'none covered'}; mountain covered ${rows.map(r => (100 * r.mtn).toFixed(1) + ' %').join(' / ')}`); } },
  {sec: 'hill', async run({open, png, gate, raw}) {
    const out = {};
    for (const look of ['day', 'dusk']) { const p = await open(`engine/fixtures/village/festivalPlaza-${look}.json`, '&aa=1'); out[look] = {};
      for (const [f, v] of [[6, 'establish'], [30, 'hero']]) { const fr = await png(p, f, 540, 960, `${raw}/hill-${look}-${v}.png`); out[look][v] = {all: FS('hue', fr), band: FS('hue', fr, ...(L('parts/locations/festivalPlaza.json').hillBand ?? [0, .2, 1, .45]))}; } await p.close(); }
    const d = out.dusk, y = out.day;
    gate('hill', 'hillside roofs read: slate-roof hue ≥ 25 % of the hillside region (dusk + day establishing)', d.establish.band.slate >= .25 && y.establish.band.slate >= .25, `dusk ${(100 * d.establish.band.slate).toFixed(1)} %, day ${(100 * y.establish.band.slate).toFixed(1)} % (region ${JSON.stringify(L('parts/locations/festivalPlaza.json').hillBand ?? [0, .2, 1, .45])})`, {out});
    gate('hill', 'dusk frame mean hue amber (20–50°) + saturation ≥ the day plaza', ['establish', 'hero'].every(v => d[v].all.hue >= 20 && d[v].all.hue <= 50 && d[v].all.sat >= y[v].all.sat), ['establish', 'hero'].map(v => `${v}: hue ${d[v].all.hue}°, sat ${d[v].all.sat.toFixed(3)} vs day ${y[v].all.sat.toFixed(3)}`).join(' · ')); } },
  {sec: 'door', async run({open, png, masks, gate, raw}) {
    const p = await open('engine/fixtures/village/homeDining-night.json', '&aa=1'), rows = [];
    for (const [f, v] of [[6, 'establish'], [30, 'hero']]) { const fr = await png(p, f, 270, 480, `${raw}/door-${v}.png`), mk = await masks(p, ['boulder'], 270, 480, `${raw}/door-${v}`);
      const st = JSON.parse(execFileSync('python3', ['scripts/v2/nightstats.py', fr, `boulder=${mk.boulder}`]).toString()).subjects.boulder; rows.push({v, ...st}); } await p.close();
    gate('door', 'homeDining: BOULDER separates in the barn door (≥ .06; views where it is in frame)', rows.some(r => r.px >= 20) && rows.filter(r => r.px >= 20).every(r => r.sep >= .06), rows.map(r => `${r.v} sep ${r.sep?.toFixed(3)} (ΔL ${r.dL?.toFixed(3)} ΔC ${r.dC?.toFixed(3)}, ${r.px} px)`).join(', ')); } },
  {sec: 'cave', async run({open, png, gate, raw}) {
    const p = await open('engine/fixtures/village/titanCave-night.json', '&aa=1'), rows = [];
    for (const [f, v] of [[6, 'establish'], [30, 'hero'], [46, 'hero-late']]) { const fr = await png(p, f, 540, 960, `${raw}/cave-${v}.png`), mt = await objMask(p, 'caveArch', 540, 960, `${raw}/cave-${v}-arch.png`);
      rows.push({v, ...JSON.parse(execFileSync('python3', ['-c', `import sys, json, numpy as np; from PIL import Image
a = np.asarray(Image.open(sys.argv[1]).convert('RGB'), dtype=float) / 255; m = np.asarray(Image.open(sys.argv[2]).convert('L')) > 127; L = a @ [.2126, .7152, .0722]
eye = (a[..., 0] > .8) & (a[..., 1] > .35) & (a[..., 2] < .45 * a[..., 0])
print(json.dumps({'eye': float(eye.mean()), 'arch': float(m.mean()), 'archL': float(L[m].mean()) if m.sum() else 0, 'frameL': float(L.mean())}))`, fr, mt]).toString())}); } await p.close();
    gate('cave', 'titanCave: Titan eyes ignite in the dark (warm eye px ≥ .05 % of the frame in the hero view)', rows.filter(r => /hero/.test(r.v)).every(r => r.eye >= .0005), rows.map(r => `${r.v} eyes ${(100 * r.eye).toFixed(2)} %`).join(', '), {rows});
    gate('cave', 'titanCave: the cave arch is visible (arch ≥ 2 % of frame, arch luma ≥ 1.5 × the frame mean)', rows.every(r => r.arch >= .02 && r.archL >= 1.5 * r.frameL), rows.map(r => `${r.v} arch ${(100 * r.arch).toFixed(1)} %, L ${r.archL.toFixed(3)} vs frame ${r.frameL.toFixed(3)}`).join(', ')); } },
  {sec: 'nightscope', async run({open, png, masks, nightGates, gate, raw}) {
    const EXT = ['beastYard', 'villageStreet', 'festivalPlaza', 'titanCave'], fx = readdirSync('engine/fixtures/village').filter(f => /^(beastYard|beastClass|homeDining|homeBedroom|villageStreet|festivalPlaza|titanCave)-night\.json$/.test(f)).sort(), rows = [], sub = [];
    for (const file of fx) { const spec = `engine/fixtures/village/${file}`, S = L(spec), loc = S.location, p = await open(spec);
      const names = Object.entries(S.cast ?? {}).filter(([, c]) => c.style !== 'beast' || (c.tier ?? 'hero') === 'hero').map(([n]) => n);   // story subjects: actors + hero-tier beasts (low-tier crowds are spec.beastCrowds, never cast)
      for (const [f, v] of [[6, 'establish'], [30, 'hero']]) { const fr = await png(p, f, 270, 480, `${raw}/ns-${loc}-${v}.png`), mk = await masks(p, names, 270, 480, `${raw}/ns-${loc}-${v}`);
        const st = JSON.parse(execFileSync('python3', ['scripts/v2/nightstats.py', fr, ...Object.entries(mk).map(([n, f2]) => `${n}=${f2}`)]).toString()); st.frame = `${loc}-${v}`;
        if (EXT.includes(loc)) rows.push(st); sub.push(st); } await p.close(); }
    const d10 = rows.map(r => `${r.frame} ${r.dark10.toFixed(3)}`), ok = rows.every(r => r.dark10 >= .012 && r.dark10 <= .03);
    gate('nightscope', 'night darkest-10 % in 0.012–0.03 — EXTERIOR night shots only (owner ruling; lit interiors exempt)', ok, d10.join(', '), {rows});
    const subs = sub.flatMap(r => Object.entries(r.subjects).filter(([, s]) => s.px >= 20).map(([n, s]) => ({n, at: r.frame, ...s}))).sort((a, b) => a.sep - b.sep);
    gate('nightscope', 'separation ≥ .06 — story subjects only (actors, hero-tier beasts, Tuft, Titan; far low-tier crowds exempt)', subs.length > 0 && subs[0].sep >= .06, `min ${subs[0]?.sep.toFixed(3)} (${subs.slice(0, 5).map(s => `${s.n}@${s.at} ${s.sep.toFixed(3)}`).join(', ')}); ${subs.length} subject-frames`, {subs}); } }];
