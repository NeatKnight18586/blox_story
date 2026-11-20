#!/usr/bin/env python3
"""Pass C measurements (B2 void, B3 depth, B4 density, luma per shot, hero S1/S40 hill share, quiet-night bright patch, TC-01…07)
+ the retention linter (tools/qa_episode.py). Writes <ep>/qa/passc.json and prints a summary."""
import sys, json, subprocess
import numpy as np
from PIL import Image
D, EP, SEQ = sys.argv[1:4]; R = json.load(open(f'{D}/raw.json')); M7 = json.load(open('engine/moods7.json'))
BASE = {'dawnHope': 'dawnHope', 'quietNight': 'nightMystery', 'rainNight': 'nightMystery', 'golden': 'goldenBittersweet'}
def rgba(x): return np.frombuffer(open(f"{D}/ids/{x['file']}", 'rb').read(), 'uint8').reshape(x['h'], x['w'], 4)[::-1, :, :3].astype(int)
LC = {'fg': [255, 0, 0], 'mid': [0, 255, 0], 'bg': [0, 0, 255], 'far': [255, 255, 0], 'cloud': [255, 0, 255]}
cues = json.load(open('stories/tapcap-ep01-rarity/build/cues.json')); words = [w for l in cues['lines'] for w in l['words']]
out = {'shots': []}
for s in R['shots']:
    c = np.asarray(Image.open(f"{D}/panels/{s['id']}.png").convert('RGB')).astype(float) / 255; lum = c @ np.array([.2126, .7152, .0722])
    g = M7[BASE[s['mood']]]['gate']['luma']; e = {k: s[k] for k in ('id', 'mood', 'start', 'frames', 'move', 'size', 'ms', 'travel')}
    e['dur'] = round(s['frames'] / 24, 3); e['luma'] = round(float(lum.mean()), 4); e['gate'] = g; e['lumaPass'] = g[0] <= e['luma'] <= g[1]
    e['void'] = int(sum((np.abs(rgba(s['ids'][k]) - [255, 0, 255]).sum(2) == 0).sum() for k in ('void0', 'void0.5', 'void1')))
    tr = s['travel']; e['lockedOff'] = tr['move'] < .05 and tr['turnDeg'] < 1 and abs(tr['zoom'] - 1) < .05
    if 'layers' in s['ids']:
        a = rgba(s['ids']['layers']); tot = a.shape[0] * a.shape[1]; cov = {k: round(float((np.abs(a - v).sum(2) == 0).sum()) / tot * 100, 2) for k, v in LC.items()}
        cov['far'] = round(cov['far'] + cov.pop('cloud'), 2); e['layers'] = cov; need = ['mid', 'bg', 'far'] if s['id'] == 'S22' else ['fg', 'mid', 'bg', 'far']; e['depthPass'] = all(cov[k] >= 1 for k in need)
    if 'buildings' in s['ids']:
        a = rgba(s['ids']['buildings']); ok = a[..., 2] == 255; idv = (a[..., 0] + a[..., 1] * 256 - 1)[ok]; u, n = np.unique(idv, return_counts=True)
        e['buildings'] = int(sum(1 for i, k in zip(u, n) if k >= 40 and i >= 0)); e['densityPass'] = 15 <= e['buildings'] <= 30
    if 'hill' in s['ids']: e['hillPlinthPct'] = round(float((rgba(s['ids']['hill']).sum(2) == 765).mean()) * 100, 2); e['hillPass'] = e['hillPlinthPct'] >= 8
    if 'slimeMask' in s['ids']:   # S30 macros: subject >= 40 % of the frame, target hue >= 25 % of subject pixels (purple / orange / blue)
        import colorsys
        m = (rgba(s['ids']['slimeMask']).sum(2) == 765); H = c.reshape(-1, 3); mk = m.reshape(-1)
        mx, mn = H.max(1), H.min(1); sat = np.where(mx > 0, (mx - mn) / np.maximum(mx, 1e-6), 0); d = np.maximum(mx - mn, 1e-6)
        hue = np.where(mx == H[:, 0], ((H[:, 1] - H[:, 2]) / d) % 6, np.where(mx == H[:, 1], (H[:, 2] - H[:, 0]) / d + 2, (H[:, 0] - H[:, 1]) / d + 4)) * 60
        band = {'S30a': (250, 295), 'S30b': (12, 48), 'S30c': (185, 232)}[s['id']]; ok = (sat > .22) & (mx > .12) & (hue >= band[0]) & (hue <= band[1])
        e['subjectPct'] = round(float(m.mean()) * 100, 1); e['huePct'] = round(float((ok & mk).sum() / max(1, mk.sum())) * 100, 1); e['macroPass'] = e['subjectPct'] >= 40 and e['huePct'] >= 25
    if 'slime0' in s['ids']: e['slimeCover0'] = round(float((rgba(s['ids']['slime0']).sum(2) == 765).mean()) * 100, 2); e['slimeCover1s'] = round(float((rgba(s['ids']['slime1s']).sum(2) == 765).mean()) * 100, 2)
    if s['mood'] == 'quietNight':
        h, w = lum.shape; b = lum[int(h * .8):]; bh, bw = max(1, int(h * .05)), max(1, int(w * .05)); m = lum.mean()
        blocks = [b[y:y + bh, x:x + bw].mean() for y in range(0, b.shape[0] - bh + 1, bh) for x in range(0, w - bw + 1, bw)]
        e['bottomPatchMax'] = round(float(max(blocks)), 3); e['brightPatch'] = bool(max(blocks) > max(.5, 2 * m))
    out['shots'].append(e)
S = out['shots']; byid = {s['id']: s for s in S}
out['summary'] = {'void': {'pass': all(s['void'] == 0 for s in S), 'failing': [s['id'] for s in S if s['void']]},
  'luma': {'pass': all(s['lumaPass'] for s in S), 'failing': {s['id']: [s['luma'], s['gate']] for s in S if not s['lumaPass']}},
  'macro': {s['id']: [s['subjectPct'], s['huePct'], s['macroPass']] for s in S if 'macroPass' in s},
  'depth': {i: [byid[i]['layers'], byid[i]['depthPass']] for i in R['WIDES']}, 'density': {i: byid[i]['buildings'] for i in R['STREET']},
  'lockedOff': [s['id'] for s in S if s['lockedOff']],
  **({'S1': {'hillPlinthPct': byid['S1']['hillPlinthPct'], 'hillPass': byid['S1']['hillPass'], 'TC-01 frame1': byid['S1']['slimeCover0'], 'at1s': byid['S1']['slimeCover1s']}} if 'S1' in byid else {})}
json.dump(out, open(f'{EP}/qa/pass-{SEQ}.json', 'w'), indent=1); print(json.dumps(out['summary']))
