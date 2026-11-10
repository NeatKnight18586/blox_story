from pathlib import Path
import json,hashlib
from PIL import Image
p=Path('evidence/dice-town-p4b5');m=json.loads((p/'edit-map.json').read_text());old=json.loads(Path('evidence/dice-town-p4b4/edit-map.json').read_text());changed={'D02','D05','D06','D07','D08','D09','D10','D12','D14'}
assert [(s['id'],s['start_frame'],s['end_frame'])for s in m['shots']]==[(s['id'],s['start_frame'],s['end_frame'])for s in old['shots']]
counts={k:0 for k in ['proxy','still','endpoint_hold','motion']}
for s in m['shots']:
 cursor=s['start_frame']
 for q in s['spans']:
  assert q['output_start_frame']==cursor;cursor=q['output_end_frame'];counts[q['kind']]+=q['output_end_frame']-q['output_start_frame']
  if q['sampling']=='direct_30fps':assert q['source_end_frame']-q['source_start_frame']==q['output_end_frame']-q['output_start_frame']
 assert cursor==s['end_frame']
 if s['id']not in changed:assert s['immediate_selection']=='unchanged_committed_P4B4'
assert counts=={'proxy':0,'still':831,'endpoint_hold':1674,'motion':1008} and sum(counts.values())==3513
r=m['opening_recipes'];assert r['capture_accounting']['retained_source_samples']==195
if r['capture_accounting']['generated_forward_samples']>210:assert Path(r['capture_accounting']['repair_note']).exists()
assert r['source_archive']['frames']==195 and r['source_archive']['size']==[720,1280] and 'lossless' in r['source_archive']['codec'];assert r['D10']['newWebGLFrames']==0 and r['D10']['source_frames']==[12,36]
shots={s['id']:s for s in m['shots']};assert shots['D10']['spans'][0]['source']==r['source_archive']['path'];assert shots['D14']['spans'][3]['source_start_frame']==171
assert m['private_audio_reference_seconds']==old['private_audio_reference_seconds']==117.098231 and m['silent'] and not m['audio_touched']
for name,record in m['sources'].items():assert hashlib.sha256(Path(name).read_bytes()).hexdigest()==record['sha256']
for name,record in m['opening_native_inputs'].items():assert Image.open(name).size==(720,1280);assert hashlib.sha256(Path(name).read_bytes()).hexdigest()==record['sha256']
print('PASS all38 locked boundaries,3513frames/0proxy,9 actual source-native repairs;195 unique frames+D10 reuse, lossless native archive, old shots and private audio reference preserved')
