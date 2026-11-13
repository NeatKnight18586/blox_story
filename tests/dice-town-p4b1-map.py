from pathlib import Path
import json,hashlib
out=Path('evidence/dice-town-p4b1');m=json.loads((out/'edit-map.json').read_text());base=json.loads(Path('evidence/dice-town-p4a/edit-map.json').read_text())
assert [(s['id'],s['start_frame'],s['end_frame'])for s in m['shots']]==[(s['id'],s['start_frame'],s['end_frame'])for s in base['shots']]
counts={k:0 for k in ['proxy','still','endpoint_hold','motion']}
for s in m['shots']:
 cursor=s['start_frame']
 for p in s['spans']:
  assert p['output_start_frame']==cursor;cursor=p['output_end_frame'];counts[p['kind']]+=p['output_end_frame']-p['output_start_frame']
  if p['sampling']=='direct_30fps':assert p['source_end_frame']-p['source_start_frame']==p['output_end_frame']-p['output_start_frame']
 assert cursor==s['end_frame']
assert sum(counts.values())==3513 and counts=={'proxy':1896,'still':753,'endpoint_hold':369,'motion':495}
assert all(counts[k]==m['runtime_by_kind'][k]['frames']for k in counts)
s={s['id']:s for s in m['shots']};assert s['D28']['spans'][0]['source']=='evidence/dice-town-p4a/working-edit.mp4'
assert [p['source'].split('face-')[-1].split('.')[0]for p in s['D25']['spans']]==['1','2']
assert [p['source'].split('face-')[-1].split('.')[0]for p in s['D26']['spans']]==['4','3','5']
assert s['D33']['selection']=='two_static_gate_states' and not m['audio_touched']
for source,j in m['sources'].items():assert hashlib.sha256(Path(source).read_bytes()).hexdigest()==j['sha256']
print('PASS38 unchanged boundaries,3513 categorized frames,1896proxy, exact montage1/2/4/3/5,D28 and gate preserved, source hashes')
