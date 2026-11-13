from pathlib import Path
import json,shutil,subprocess
from PIL import Image,ImageDraw
out=Path('evidence/dice-town-p2a-polish');root=Path('renders/dice-town-p2a-polish-native');r=json.loads((root/'last-run.json').read_text());assert r['status']=='PASS';result=root/r['result'];shutil.copyfile(result/'movie.mp4',out/'movie.mp4');shutil.copyfile(result/'manifest.json',out/'export-manifest.json')
subprocess.run(['python3','scripts/dice-town-p2a-polish-sheet.py'],check=True)
b=Image.new('RGB',(1080,1330),'#17232b');d=ImageDraw.Draw(b)
for row,folder in enumerate(['dice-town-p2a','dice-town-p2a-polish']):
 for col,i in enumerate([0,55,90]):
  im=Image.open(f'evidence/{folder}/native-{i:03}.png').resize((360,640));b.paste(im,(col*360,row*665+25));d.text((col*360+4,row*665+5),f'{"PR28" if row==0 else "Revised"} frame {i}',fill='white')
b=b.resize((1080,1330));b.save(out/'comparison.jpg',quality=90)
q=json.loads((out/'geometry-qc.json').read_text());assert not [x for x in q['edgeViolations'] if x['frame']<75]
c=json.loads((out/'cost.json').read_text())
(out/'REPORT.md').write_text(f'''# Bounded motion polish — technical PASS; creative review pending

[Actual four-second MP4](movie.mp4) · [comparison](comparison.jpg) · [all120 frames](all-120-frames.jpg) · [larger motion sheet](motion-sheet.jpg).

## Review of PR28

Three highest-impact weaknesses: clipped/crowded wide-shot silhouettes; nearly uniform floating with weak anticipation and recovery; Leo's surprise-to-irritation lacked a held thought. Reviewed original native frames, complete sheet, motion source and report. Its encoding/contact PASS did not resolve the documented arm crop.

## One bounded correction

Reframed the wide camera, moved the two right-hand residents inward and redirected the blue actor's raised arm forward. Strengthened staggered preparation, leg counterposes, torso lean and a small vertical overshoot. The die remains6.3 units and settles at the same time; lift preparation still follows its settle. Leo now holds surprise longer, then makes a stronger head/shoulder release into irritation. Environment, characters, face geometry, wardrobe and renderer are reused. No new decorative assets or frameworks.

## Actual verification

Existing source suite and targeted motion tests PASS. Low-resolution full motion preflight preceded native export; selected native0/55/74/82/119 frames inspected after staging correction. Independent real-browser actual-vertex checks over120 states: **zero wide-shot frame-edge violations**, max foot error{q['maxFootError']:.3g}, minimum clearance{q['minClearance']}, die contact error{q['maxDieContactError']:.3g}. Portrait shoulder crops remain intentional. Persistent geometry and world sky checks PASS. Final native export verifies all120 forward/reverse pixel hashes, H.264/yuv420p720×1280/30fps,4.000s,120 decoded frames, continuous timestamps, cut75, full decode and actual browser playback. No audio. See export-manifest.json and geometry-qc.json.

Final native job{c['wallSeconds']:.2f}s wall, sampled CPU{c['sampledTreeCpuSeconds']:.2f}s, summed process-tree peak{c['sampledTreeRssMiB']:.1f}MiB; shared pages counted per process. Low-res preflight/native sample/QC costs additional. One revised native film export. Raw frames stay in ignored renders/. Previous PR28 evidence is unchanged.

## Honest creative assessment

The crop is corrected and movement has clearer pose changes and settling. This is an improvement in readability, not a claim of finished cinematic quality. The rigid six-part rig still limits weight shifts and joint articulation; floating remains stylized, shadows are hard, and the foreground resident partly overlaps the die/plaque silhouette. Leo's eyes use existing simple oval features rather than articulated pupils. Shot-specific visibility still removes floating extras from the close-up to avoid foreground occlusion. Human creative approval is pending.

Reproduce with `python3 scripts/dice-town-p2a-polish-cost.py`; the existing exporter/checkpoints are reused. Review/QC/sheet scripts share that prefix. Source changes are limited to existing P2A motion, placements, camera JSON and validation/documentation; no prior history is rewritten. Stop here: no merge or next phase.
''')
