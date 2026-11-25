// scripts/v2/village-sheet.js — tuft P3: ONE sheet + phone read + demo → review/village/village.png (≤ 1600 px), village-390.png, demo.mp4.
//   row 1   Task 0 before / after: TITAN (roar, flee + silhouettes), VOLT night, breath, lightning, BLINK, hero ball (before = renders/village/before,
//           rendered from the 2B code by scripts/v2/frames-at.js with the working tree stashed)
//   rows 2–3 the seven locations: establishing + hero-angle view each (look per the colour script)
//   row 4   festivalPlaza night: lanternSea + colossal Tuft over the roofs (wide, low), the plaza + street at night with cast
//   demo.mp4 540×960 24 fps ~15 s: night street push, plaza fly-through, titanCave ignite → roar, colossal Tuft reveal.
// Usage: node scripts/v2/village-sheet.js [--no-demo]
import {mkdirSync, statSync, rmSync, readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';

const out = 'review/village', raw = 'renders/village/sheet', F = 'engine/fixtures/village', B2 = 'engine/fixtures/beasts2'; mkdirSync(out, {recursive: true}); rmSync(raw, {recursive: true, force: true}); mkdirSync(raw, {recursive: true});
const fa = (W, H, items, dir = raw) => execFileSync('node', ['scripts/v2/frames-at.js', dir, String(W), String(H), ...items], {stdio: ['ignore', 'ignore', 'inherit']});
// row 1 after (same frames as the before set)
fa(360, 640, [`${B2}/titan.json:60:titan-a`, `${B2}/titan.json:244:titan-b`, `${F}/moon-heroes.json:94:volt`, `${B2}/powers.json:185:breath`, `${B2}/powers.json:66:bolt`, `${F}/moon-heroes.json:209:blink`, `${B2}/tuft.json:349:ball`]);
// rows 2–3: locations (look per the colour script)
const LOC = [['beastYard', 'day'], ['beastClass', 'day'], ['homeDining', 'night'], ['homeBedroom', 'night'], ['villageStreet', 'night'], ['festivalPlaza', 'dusk'], ['titanCave', 'night']];
fa(360, 640, LOC.flatMap(([l, k]) => [`${F}/${l}-${k}.json:6:${l}-e`, `${F}/${l}-${k}.json:30:${l}-h`]));
// row 4
fa(540, 960, [`${F}/festivalPlaza-colossal.json:40:col-w`, `${F}/festivalPlaza-colossal.json:80:col-l`, `${F}/festivalPlaza-night.json:6:plaza-n`, `${F}/villageStreet-night.json:6:street-n`, `${F}/beastYard-day.json:30:yard-ph`, `${F}/homeBedroom-night.json:12:room-ph`]);
const T0 = [['titan-a', 'TITAN roar'], ['titan-b', 'TITAN flee'], ['volt', 'VOLT night'], ['breath', 'breath'], ['bolt', 'lightning'], ['blink', 'BLINK'], ['ball', 'hero ball']];
const tiles = {r1: T0.flatMap(([f, l]) => [{f: `../before/${f}.png`, label: `${l} · before`}, {f: `${f}.png`, label: 'after'}]),
  r23: LOC.flatMap(([l, k]) => [{f: `${l}-e.png`, label: `${l} · ${k}`}, {f: `${l}-h.png`, label: 'hero angle'}]),
  r4: [['col-w', 'colossal Tuft + lantern sea'], ['col-l', 'colossal, low'], ['plaza-n', 'festivalPlaza night'], ['street-n', 'villageStreet night']].map(([f, label]) => ({f: `${f}.png`, label})),
  phone: [['street-n', 'villageStreet night'], ['col-w', 'colossal Tuft'], ['room-ph', 'room puff'], ['yard-ph', 'beastYard day']].map(([f, label]) => ({f: `${f}.png`, label}))};
execFileSync('python3', ['-c', `
import sys, json
from PIL import Image, ImageDraw, ImageFont
raw, out, T = sys.argv[1], sys.argv[2], json.loads(sys.argv[3])
f = ImageFont.load_default(size=12); W = 1600
def row(tl, n, h):
    s = Image.new('RGB', (W, h), '#14161a'); d = ImageDraw.Draw(s); w = W // n
    for i, t in enumerate(tl[:n]):
        im = Image.open(raw + '/' + t['f']).convert('RGB'); im = im.resize((w, int(w * im.height / im.width))).crop((0, 0, w, h)); s.paste(im, (i * w, 0))
        d.rectangle([i * w, 0, i * w + min(w, len(t['label']) * 6 + 6), 15], fill='#000000'); d.text((i * w + 3, 1), t['label'], fill='#ffffff', font=f)
    return s
sil = Image.open('review/village/titan-sil.png').convert('RGB'); sil = sil.resize((W, int(W * sil.height / sil.width)))
parts = [('1 · Task 0 before / after: TITAN redesign, moonlit VOLT, breath jet, lightning runner, BLINK, hero ball face', None), (None, row(T['r1'][:7], 7, 400)), (None, row(T['r1'][7:], 7, 400)), (None, sil),
  ('2–3 · the seven locations: establishing + hero angle (colour script: day yard + class, storm-blue night home / street / cave, dusk plaza)', None), (None, row(T['r23'][:8], 8, 355)), (None, row(T['r23'][8:], 6, 474)),
  ('4 · festivalPlaza night: lantern sea + giant cage + colossal Tuft over the roofs; plaza + street at night', None), (None, row(T['r4'], 4, 711))]
H = sum(22 if im is None else im.height for _, im in parts); s = Image.new('RGB', (W, H), '#14161a'); d = ImageDraw.Draw(s); y = 0
for title, im in parts:
    if im is None: d.text((6, y + 5), title, fill='#f0f0f0', font=ImageFont.load_default(size=13)); y += 22
    else: s.paste(im, (0, y)); y += im.height
s.save(out + '/village.png'); print('village.png', s.size)
p = Image.new('RGB', (390, 2 * 347), '#14161a'); q = ImageDraw.Draw(p)
for i, t in enumerate(T['phone'][:4]):
    x, yy = (i % 2) * 195, (i // 2) * 347; p.paste(Image.open(raw + '/' + t['f']).convert('RGB').resize((195, 347)), (x, yy)); q.text((x + 4, yy + 3), t['label'], fill='#ffffff', font=ImageFont.load_default(size=11))
p.save(out + '/village-390.png'); print('village-390.png', p.size)
`, raw, out, JSON.stringify(tiles)], {stdio: 'inherit'});
if (!process.argv.includes('--no-demo')) { const d = `${raw}/demo`; mkdirSync(d, {recursive: true}); let k = 0;
  for (const name of ['demo-st', 'demo-pl', 'demo-cv', 'demo-co']) { const S = JSON.parse(readFileSync(`${F}/${name}.json`, 'utf8')), n = S.shots.reduce((a, s) => a + s.frames, 0), tmp = `${raw}/${name}`;
    fa(540, 960, Array.from({length: n}, (_, i) => `${F}/${name}.json:${i}:f${String(i).padStart(4, '0')}`), tmp);
    for (let i = 0; i < n; i++) execFileSync('cp', [`${tmp}/f${String(i).padStart(4, '0')}.png`, `${d}/f-${String(k++).padStart(4, '0')}.png`]); }
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-framerate', '24', '-i', `${d}/f-%04d.png`, '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '27', '-preset', 'slow', '-movflags', '+faststart', `${out}/demo.mp4`]);
  console.log('demo.mp4', (statSync(`${out}/demo.mp4`).size / 1e6).toFixed(2), 'MB', k, 'frames'); }
