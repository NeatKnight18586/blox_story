#!/usr/bin/env python3
"""Pass C measurements (B2 void, B3 depth, B4 density, luma per shot, hero S1/S40 hill share, quiet-night bright patch, TC-01…07)
+ the retention linter (tools/qa_episode.py). Writes <ep>/qa/passc.json and prints a summary."""
import sys, json, subprocess
import numpy as np
from PIL import Image
D, EP, SLUG = sys.argv[1:4]; R = json.load(open(f'{D}/raw.json')); M7 = json.load(open('engine/moods7.json'))
BASE = {'dawnHope': 'dawnHope', 'quietNight': 'nightMystery', 'rainNight': 'nightMystery', 'golden': 'goldenBittersweet'}
def rgba(x): return np.frombuffer(open(f"{D}/ids/{x['file']}", 'rb').read(), 'uint8').reshape(x['h'], x['w'], 4)[::-1, :, :3].astype(int)
LC = {'fg': [255, 0, 0], 'mid': [0, 255, 0], 'bg': [0, 0, 255], 'far': [255, 255, 0], 'cloud': [255, 0, 255]}
cues = json.load(open(f'stories/{SLUG}/build/cues.json')); words = [w for l in cues['lines'] for w in l['words']]
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
    if 'slime0' in s['ids']: e['slimeCover0'] = round(float((rgba(s['ids']['slime0']).sum(2) == 765).mean()) * 100, 2); e['slimeCover1s'] = round(float((rgba(s['ids']['slime1s']).sum(2) == 765).mean()) * 100, 2)
    if s['mood'] == 'quietNight':
        h, w = lum.shape; b = lum[int(h * .8):]; bh, bw = max(1, int(h * .05)), max(1, int(w * .05)); m = lum.mean()
        blocks = [b[y:y + bh, x:x + bw].mean() for y in range(0, b.shape[0] - bh + 1, bh) for x in range(0, w - bw + 1, bw)]
        e['bottomPatchMax'] = round(float(max(blocks)), 3); e['brightPatch'] = bool(max(blocks) > max(.5, 2 * m))
    out['shots'].append(e)
S = out['shots']; byid = {s['id']: s for s in S}; n = len(S); last_end = max(w['end'] for w in words)
gaps = [round(b['start'] - a['end'], 2) for a, b in zip(words, words[1:])]
proportions = json.load(open(f'{EP}/qa/proportions.json')); world = json.load(open(f'{EP}/qa/world.json'))['summary']
tc = {
  'TC-01': {'pass': byid['S1']['slimeCover0'] >= 15 and byid['S1']['slimeCover1s'] > 0, 'frame1CoverPct': byid['S1']['slimeCover0'], 'at1sPct': byid['S1']['slimeCover1s'], 'at': '0.00–1.00 s'},
  'TC-02': {'pass': proportions['pass'], 'bands': proportions['measured']['bands']},
  'TC-03': {'pass': all(t.startswith(('sign:', 'TapCap chest print', 'awning stripes')) for t in world['B10_text']), 'textures': world['B10_text'], 'captions': 'allowed'},
  'TC-04': {'pass': None, 'manual': 'Clix: plain satin colours only; textured meshes = face decal + plain chain (Pass A audit); watch = plain silver band, no marks'},
  'TC-05': {'pass': all(abs(t['err']) <= 1 for t in R['tc05']), 'presses': R['tc05']},
  'TC-06': {'pass': R['tc06']['diff'] == 0, 'diff': R['tc06']['diff'], 'at': '75.16 s (S40 last frame) vs 2.56 s (S1 last frame)'},
  'TC-07': {'pass': 1.5 <= 75.16 / n <= 2.2 and not any(s['lockedOff'] for s in S) and 75.16 - last_end <= .3, 'avgShot': round(75.16 / n, 3), 'shots': n,
            'lockedOff': [s['id'] for s in S if s['lockedOff']], 'tailS': round(75.16 - last_end, 3), 'longestVoGapS': max(gaps), 'firstWordS': words[0]['start']},
}
qa = subprocess.run(['python3', 'tools/qa_episode.py', '--story', SLUG, '--spec', f'{EP}/spec.yml', '--out', f'{D}/qa-retention.json', '--quiet'], capture_output=True, text=True)
try: ret = json.load(open(f'{D}/qa-retention.json'))
except Exception: ret = {'error': (qa.stdout + qa.stderr)[-1500:]}
summary = {
  'B2_void': {'pass': all(s['void'] == 0 for s in S), 'failing': [s['id'] for s in S if s['void']]},
  'B3_depth': {'pass': all(byid[i]['depthPass'] for i in R['WIDES']), 'perShot': {i: byid[i]['layers'] for i in R['WIDES']}},
  'B4_density': {'pass': all(byid[i]['densityPass'] for i in R['STREET']), 'perShot': {i: byid[i]['buildings'] for i in R['STREET']}},
  'luma': {'pass': all(s['lumaPass'] for s in S), 'failing': {s['id']: [s['luma'], s['gate']] for s in S if not s['lumaPass']}},
  'hero': {'S1hill': byid['S1']['hillPlinthPct'], 'S40hill': byid['S40']['hillPlinthPct'], 'pass': byid['S1']['hillPass'] and byid['S40']['hillPass']},
  'quietNight': {s['id']: {'luma': s['luma'], 'brightPatch': s['brightPatch'], 'bottomPatchMax': s['bottomPatchMax']} for s in S if s['mood'] == 'quietNight'},
  'TC': tc, 'timing': R['timing'], 'previzMsPerFrame288': round(float(np.mean([s['ms'] for s in S]))),
}
out['summary'] = summary; out['retention'] = ret
json.dump(out, open(f'{EP}/qa/passc.json', 'w'), indent=1); print(json.dumps(summary)[:6000])
