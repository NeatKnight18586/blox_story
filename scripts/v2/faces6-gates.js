// scripts/v2/faces6-gates.js — P2 / P2b Faces v6 gates → review/faces6/gates.json (node + PIL raster, no browser):
//   colours       P2b owner rule: DISTINCT fill colours (skin and ink excluded; white is one colour wherever it appears) ≤ 3 per face,
//                 per talk shape (4 per face) and while blinking, every colour from PALETTE6 (PASS/FAIL per face)
//   talk          each expression in exactly one of the 4 families; mouth corners: happy up, neutral level, sad down, angry level/down;
//                 rage's teeth band ≥ the faces5 angry mouth's height
//   readability   at the 390 px medium shot (SHOTS5.medium: d 7, fov 35; 1 head unit = 1.2 studs ≈ 188 px) each eye and the mouth
//                 measure (max of bbox w, h incl. stroke) ≥ the smallest the 48 faces5 faces have
//   distinctness  every pair of the 24 faces: IoU of the drawn marks (ink + fills, 256 px) < 0.80 — face5-gates.js's match threshold
//                 (≥ 0.80 = "the same face")
//   bounds        no stroke or fill outside the head front (|x|, |y| ≤ 0.5 head units, stroke half-width included)
//   node scripts/v2/faces6-gates.js
import {writeFileSync, mkdirSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {FACE_NAMES6, faceItems6, faceRoles6, faceColours6, fillColours6, PALETTE6, MAX_COLOURS, TALK6, TALK_NAMES6, mouthTurn, family6, FACES6, RAGE_TEETH_CU, H5_CU} from '../../avatar-style/faces6.js';
import {faceItems5, SHOTS5, bbox} from '../../avatar-style/faces5.js';
import {CELL_NAMES} from '../../avatar-style/faces5-data.js';

const PX = 1.2 * 693 / (2 * SHOTS5.medium.d * Math.tan(SHOTS5.medium.fov / 2 * Math.PI / 180)), fails = [];
const ext = it => { const b = bbox(it.line ?? it.pts), h = ((it.w ?? 0) + 2 * (it.outline ?? 0)) / 2; return [b[0] - h, b[1] - h, b[2] + h, b[3] + h]; };
const union = bs => [Math.min(...bs.map(b => b[0])), Math.min(...bs.map(b => b[1])), Math.max(...bs.map(b => b[2])), Math.max(...bs.map(b => b[3]))];
const size = b => Math.max(b[2] - b[0], b[3] - b[1]) * PX;
function measure(items) {   // px: each eye (left / right of the centre line) and the mouth
  const eyes = items.filter(i => i.kind === 'eye').map(ext), mouth = items.filter(i => i.kind === 'mouth').map(ext);
  const side = s => eyes.filter(b => Math.sign(b[0] + b[2]) === s);
  return {eyeL: side(-1).length ? size(union(side(-1))) : null, eyeR: side(1).length ? size(union(side(1))) : null, mouth: mouth.length ? size(union(mouth)) : null};
}
const m5 = CELL_NAMES.map(n => measure(faceItems5(n))), min5 = k => Math.min(...m5.map(m => m[k]).filter(v => v !== null));
const MIN = {eye: Math.min(min5('eyeL'), min5('eyeR')), mouth: min5('mouth')};
const allowed = new Set(Object.values(PALETTE6).map(c => c.toUpperCase()));
const faces = {};
for (const n of FACE_NAMES6) {
  const it = faceItems6(n), roles = faceRoles6(n), cols = faceColours6(n).filter(c => !allowed.has(c)), m = measure(it);
  const shapes = [{}, {blink: true}, {talk: 0}, {talk: 1}, {talk: 2}, {talk: 3}], counts = shapes.map(o => fillColours6(n, o).length);
  const out = shapes.some(o => faceItems6(n, o).some(i => { const b = ext(i); return b[0] < -.5 || b[2] > .5 || b[1] < -.5 || b[3] > .5; }));
  const read = ['eyeL', 'eyeR'].every(k => m[k] === null || m[k] >= MIN.eye - 1e-9) && (m.mouth === null || m.mouth >= MIN.mouth - 1e-9);
  faces[n] = {roles, fillColours: fillColours6(n), colourCountByShape: Object.fromEntries(shapes.map((o, k) => [JSON.stringify(o), counts[k]])), family: family6(n), colours: Math.max(...counts) <= MAX_COLOURS && !cols.length ? 'PASS' : 'FAIL', offPalette: cols, px: Object.fromEntries(Object.entries(m).map(([k, v]) => [k, v === null ? null : +v.toFixed(1)])), readability: read ? 'PASS' : 'FAIL', bounds: out ? 'FAIL' : 'PASS'};
  if (faces[n].colours === 'FAIL') fails.push(`${n}: ${counts} distinct fill colours ${cols.length ? 'off-palette ' + cols : ''}`);
  if (!read) fails.push(`${n}: readability ${JSON.stringify(faces[n].px)} < min ${JSON.stringify(MIN)}`); if (out) fails.push(`${n}: outside the head front`);
}
// distinctness: rasterise every face's marks (pure items → PIL), pairwise IoU
mkdirSync('renders/faces6', {recursive: true}); writeFileSync('renders/faces6/items.json', JSON.stringify(Object.fromEntries(FACE_NAMES6.map(n => [n, faceItems6(n)]))));
const pairs = JSON.parse(execFileSync('python3', ['-c', `
import json, sys
import numpy as np
from PIL import Image, ImageDraw
F = json.load(open(sys.argv[1])); S = 256
P = lambda p: [((x + .5) * S, (.5 - y) * S) for x, y in p]
masks = {}
for n, items in F.items():
    im = Image.new('L', (S, S), 0); d = ImageDraw.Draw(im)
    for it in items:
        if 'pts' in it and it['pts']: d.polygon(P(it['pts']), fill=255)
        if 'line' in it and it['line']:
            pts = P(it['line'] + ([it['line'][0]] if it.get('closed') else [])); w = max(1, int(round(it['w'] * S)))
            d.line(pts, fill=255, width=w, joint='curve')
            for x, y in (pts[0], pts[-1]): d.ellipse((x - w / 2, y - w / 2, x + w / 2, y + w / 2), fill=255)
    masks[n] = np.asarray(im) > 0
names = list(masks); out = []
for i in range(len(names)):
    for j in range(i + 1, len(names)):
        a, b = masks[names[i]], masks[names[j]]; out.append([names[i], names[j], float((a & b).sum() / max(1, (a | b).sum()))])
print(json.dumps(out))`, 'renders/faces6/items.json']).toString());
pairs.sort((a, b) => b[2] - a[2]); const close = pairs.filter(p => p[2] >= .8);
for (const p of close) fails.push(`distinct ${p[0]} vs ${p[1]}: IoU ${p[2].toFixed(3)} ≥ 0.80`);
const talk = {}; for (const fam of TALK_NAMES6) { const turns = TALK6[fam].map(sh => mouthTurn(sh.mouth)), ok = fam === 'happy' ? turns.every(t => t > 0) : fam === 'neutral' ? turns.every(t => Math.abs(t) < .01) : fam === 'sad' ? turns.every(t => t < -.01) : turns.every(t => t <= .01);
  talk[fam] = {turns, ok}; if (!ok) fails.push(`talk family ${fam}: mouth turns ${turns}`); }
const famOf = FACE_NAMES6.map(n => family6(n)); if (famOf.some(f => !f)) fails.push('an expression has no talk family');
const rageTeeth = {facesAngryMouthHeightCu: +H5_CU.toFixed(3), rageTeethBandCu: +RAGE_TEETH_CU.toFixed(3), pass: RAGE_TEETH_CU >= H5_CU - 1e-9}; if (!rageTeeth.pass) fails.push('rage teeth band thinner than the faces5 angry mouth');
const rep = {talkFamilies: talk, rageTeeth, pxPerHeadUnit390Medium: +PX.toFixed(1), faces5Minimum: {eye: +MIN.eye.toFixed(1), mouth: +MIN.mouth.toFixed(1)}, distinct: {threshold: .8, mostSimilar: pairs.slice(0, 5).map(p => [p[0], p[1], +p[2].toFixed(3)]), failing: close.length},
  faces, failures: fails, result: fails.length ? 'FAIL' : 'PASS'};
mkdirSync('review/faces6', {recursive: true}); writeFileSync('review/faces6/gates.json', JSON.stringify(rep, null, 1));
console.log(JSON.stringify({result: rep.result, min5: rep.faces5Minimum, mostSimilar: rep.distinct.mostSimilar[0], maxColours: Math.max(...Object.values(faces).flatMap(f => Object.values(f.colourCountByShape))), fails}));
process.exitCode = fails.length ? 1 : 0;
