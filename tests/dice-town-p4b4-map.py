from pathlib import Path
import json,hashlib
out=Path('evidence/dice-town-p4b4');m=json.loads((out/'edit-map.json').read_text());old=json.loads(Path('evidence/dice-town-p4b3/edit-map.json').read_text());changed={'D17','D18','D19','D20','D21','D22','D24'}
assert [(s['id'],s['start_frame'],s['end_frame'])for s in m['shots']]==[(s['id'],s['start_frame'],s['end_frame'])for s in old['shots']]
counts={k:0 for k in ['proxy','still','endpoint_hold','motion']}
for s in m['shots']:
 cursor=s['start_frame']
 for p in s['spans']:
  assert p['output_start_frame']==cursor;cursor=p['output_end_frame'];counts[p['kind']]+=p['output_end_frame']-p['output_start_frame']
  if p['sampling']=='direct_30fps':assert p['source_end_frame']-p['source_start_frame']==p['output_end_frame']-p['output_start_frame']
 assert cursor==s['end_frame']
 if s['id']not in changed:assert s['immediate_selection']=='unchanged_committed_P4B3'
assert counts=={'proxy':784,'still':812,'endpoint_hold':1128,'motion':789} and sum(counts.values())==3513
s={s['id']:s for s in m['shots']};assert all(s[k]['immediate_selection']=='unchanged_committed_P4B3'for k in ['D15','D16','D23']+[f'D{n}'for n in range(25,39)])
assert not m['audio_touched'] and m['silent'];assert m['private_audio_reference_seconds']==old['private_audio_reference_seconds']==117.098231
assert m['backstory_recipes']['source_archive']['frames']==90
assert m['backstory_recipes']['source_archive']['size']==[720,1280]
assert m['backstory_recipes']['no_unrelated_substitutions'] and m['backstory_recipes']['no_proxy_upscaling']
for sid in changed:assert not any(p['kind']=='proxy'for p in s[sid]['spans'])
from PIL import Image
for path in m['native_inputs']:
 im=Image.open(path);assert im.width>=720 and im.height>=1280 or im.size==(1024,1024)
for path in m['native_inputs']:assert hashlib.sha256(Path(path).read_bytes()).hexdigest()==m['native_inputs'][path]['sha256']
for p,j in m['sources'].items():assert hashlib.sha256(Path(p).read_bytes()).hexdigest()==j['sha256']
print('PASS38 locked cuts,3513 categorized frames;784proxy;90 native motion samples; all7 repaired slots scene-specific; D23/D25-D38 preserved; native source hashes/voice reference')
