#!/usr/bin/env python3
"""Pass B (revision) measurements from pass-b.js dumps → JSON (B1 luma, B2 void, B3 layers, B4 density, B5 archetypes, B6 plinth,
B7 sky + skyline, B9 font, B10 text, B11 timing). Gates are engine/moods7.json's, unchanged."""
import sys, json
import numpy as np
from PIL import Image
D = sys.argv[1]; R = json.load(open(f'{D}/raw.json')); M7 = json.load(open('engine/moods7.json'))
BASE = {'dawnHope': 'dawnHope', 'rainNight': 'nightMystery', 'quietNight': 'nightMystery', 'golden': 'goldenBittersweet'}
def rgba(x): return np.frombuffer(open(f"{D}/ids/{x['file']}", 'rb').read(), 'uint8').reshape(x['h'], x['w'], 4)[::-1, :, :3].astype(int)
def img(n): return np.asarray(Image.open(f'{D}/panels/{n}.png').convert('RGB')).astype(float) / 255
def lstar(c): y = c @ np.array([.2126, .7152, .0722]); y = np.where(c <= .04045, c / 12.92, ((c + .055) / 1.055) ** 2.4) @ np.array([.2126, .7152, .0722]); return np.where(y > .008856, 116 * np.cbrt(y) - 16, 903.3 * y)
LC = {'fg': [255, 0, 0], 'mid': [0, 255, 0], 'bg': [0, 0, 255], 'far': [255, 255, 0]}
def layers(x):
    a = rgba(x); tot = a.shape[0] * a.shape[1]; cov = {k: round(float((np.abs(a - v).sum(2) == 0).sum()) / tot * 100, 2) for k, v in LC.items()}
    sky = float((a.sum(2) == 0).sum()) / tot; hy = x['horizonY']; row = int(round((1 - (hy + 1) / 2) * (a.shape[0] - 1)))
    hz = None
    if 2 <= row < a.shape[0] - 2: band = a[row - 1:row + 2]; hz = round(float((band.sum(2) > 0).any(0).mean()) * 100, 1)
    return cov, round(sky * 100, 2), hz
def buildings(x, minpx=40):
    a = rgba(x); ok = a[..., 2] == 255; idv = (a[..., 0] + a[..., 1] * 256 - 1)[ok]; u, n = np.unique(idv, return_counts=True)
    vis = [int(i) for i, c in zip(u, n) if c >= minpx and i >= 0]; meta = {b['id']: b for b in x['ids']}
    return len(vis), sorted({meta[i]['arch'] for i in vis if i in meta})
out = {'stills': [], 'void': [], 'wides': [], 'density': [], 'summary': {}}
for s in R['stills']:
    c = img(s['id']); luma = float((c @ np.array([.2126, .7152, .0722])).mean()); g = M7[BASE[s['mood']]]['gate']['luma']
    cov, sky, hz = layers(R['ids'][s['id']]['layers']); feat = [x for x in s['signs'] if x['text'] == s['feature']]
    e = {'id': s['id'], 'label': s['label'], 'mood': s['mood'], 'luma': round(luma, 4), 'gate': g, 'lumaPass': g[0] <= luma <= g[1], 'skyPct': sky, 'skyMax': s['skyMax'],
         'skyPass': None if s['skyMax'] is None else sky <= s['skyMax'] * 100, 'horizonCover': hz, 'layers': cov, 'ms': s['ms'],
         'feature': s['feature'], 'featureCap': feat[0]['capFrac'] if feat else None, 'featurePass': None if not s['feature'] else bool(feat and feat[0]['capFrac'] >= .03)}
    if 'buildings' in R['ids'][s['id']]: e['buildings'], e['archetypes'] = buildings(R['ids'][s['id']]['buildings'])
    if 'hill' in R['ids'][s['id']]: e['hillPlinthPct'] = round(float((rgba(R['ids'][s['id']]['hill']).sum(2) == 765).mean()) * 100, 2)
    if s.get('golden'):   # §1c: clouds only in the top 45 %, rooftops fill the bottom 25 %, luma .44–.48
        a = rgba(R['ids'][s['id']]['layers']); H = a.shape[0]; cl = np.abs(a - [255, 0, 255]).sum(2) == 0; town = (a.sum(2) > 0) & ~cl
        e['golden'] = {'cloudBelowTop45': round(float(cl[int(H * .45):].sum()) / max(1, cl.sum()) * 100, 2), 'cloudPct': round(float(cl.mean()) * 100, 1),
                       'rooftopsBottom25': round(float(town[int(H * .75):].mean()) * 100, 1), 'lumaTarget': [.44, .48], 'lumaTargetPass': .44 <= luma <= .48}
    if 'plinth' in R['ids'][s['id']]:
        pa = rgba(R['ids'][s['id']]['plinth']); m = (pa.sum(2) == 765) | ((pa[..., 0] == 0) & (pa[..., 1] == 255) & (pa[..., 2] == 255)); t2 = (pa[..., 0] == 0) & (pa[..., 1] == 255) & (pa[..., 2] == 255); ys, xs = np.nonzero(m); L = lstar(c); Y = c @ np.array([.2126, .7152, .0722])
        y0, y1, x0, x1 = ys.min(), ys.max(), xs.min(), xs.max(); h, w = y1 - y0, x1 - x0
        ring = np.zeros_like(m); ring[max(0, y0 - h):min(m.shape[0], y1 + h), max(0, x0 - w):min(m.shape[1], x1 + w)] = True; ring &= ~m
        refl = np.zeros_like(m); refl[y1 + 2:min(m.shape[0], y1 + 2 + h), x0:x1] = True; refl &= ~m
        e['plinth'] = {'Lplinth': round(float(L[m].mean()), 1), 'Lbg': round(float(L[ring].mean()), 1), 'contrast': round(float(abs(L[m].mean() - L[ring].mean())), 1),
                       'reflection': round(float(Y[refl].mean() / Y[m].mean()), 3) if refl.any() else None, 'px': int(m.sum()),
                       'tier2SideMinRowL': round(float(min(L[r][t2[r]].mean() for r in range(L.shape[0]) if t2[r].sum() > 20)), 1) if t2.any() else None}
    out['stills'].append(e)
for v in R['void']: out['void'].append({'id': v['id'], 'mood': v['mood'], 'voidPx': v['voidPx'], 'ms': v['ms']})
for sid in R['WIDES']:
    x = R['ids'][sid]; cov, sky, hz = layers(x['layers']); w = {'id': sid, 'layers': cov, 'all4': all(v >= 1 for v in cov.values()), 'skyPct': sky, 'horizonCover': hz}
    if 'buildings' in x: w['buildings'], w['archetypes'] = buildings(x['buildings'])
    out['wides'].append(w)
st = {s['id']: s for s in out['stills']}; wd = {w['id']: w for w in out['wides']}
s5 = wd['S5']; streets = [wd[i] for i in R['STREET']] + [st['st1'], st['st3']]
pl = st['rainHill']['plinth']; hzs = [w['horizonCover'] for w in out['wides'] + [st['hillWide'], st['st1'], st['st3']] if w['horizonCover'] is not None]
setup = R['setup']['dawnHope']
out['summary'] = {
  'B1_luma': {'pass': all(s['lumaPass'] for s in out['stills']), 'values': {s['id']: [s['luma'], s['gate']] for s in out['stills']}},
  'B2_void': {'pass': all(v['voidPx'] == 0 for v in out['void']), 'failing': [v['id'] for v in out['void'] if v['voidPx']], 'n': len(out['void'])},
  'B3_depth': {'pass': all(w['all4'] for w in out['wides']), 'perShot': {w['id']: w['layers'] for w in out['wides']}},
  'B4_density': {'pass': 40 <= s5['buildings'] <= 80 and all(15 <= s.get('buildings', 0) <= 30 for s in streets), 'S5': s5['buildings'], 'streetWides': {s['id']: s.get('buildings') for s in streets}},
  'B5_variety': {'archetypesS5': s5['archetypes'], 'pass': len(s5['archetypes']) >= 4},
  'B6_plinth': {'pass': pl['contrast'] >= 20 and (pl['reflection'] or 0) <= .40, **pl},
  'B7_sky': {'hillWideSky': st['hillWide']['skyPct'], 'plinthCloseSky': st['st5']['skyPct'], 'skylineCoverMin': min(hzs) if hzs else None, 'skylineCover': hzs,
             'pass': st['hillWide']['skyPct'] <= 40 and st['st5']['skyPct'] <= 15 and (min(hzs) if hzs else 0) >= 70},
  'B9_font': setup['font'], 'B10_text': sorted(set(setup['text'])),
  'B11_ms': {'still540': round(np.mean([s['ms'] for s in out['stills']])), 'previz160': round(np.mean([v['ms'] for v in out['void']])), 'build': {k: v for k, v in R['timing'].items()}},
  'golden': st['st8'].get('golden'), 'boxStreet': st['st1'].get('buildings'), 'coreRowHill': st['st2'].get('hillPlinthPct'), 'plinthClose': st['st5'].get('plinth'),
  'counts': setup['counts'], 'crowd': setup['crowd']['n'],
}
print(json.dumps(out))
