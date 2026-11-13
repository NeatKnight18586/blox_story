from pathlib import Path
import json,hashlib
out=Path('evidence/dice-town-p4b2');m=json.loads((out/'edit-map.json').read_text());old=json.loads(Path('evidence/dice-town-p4b1/edit-map.json').read_text());changed={'D11','D13','D16','D28'}
assert [(s['id'],s['start_frame'],s['end_frame'])for s in m['shots']]==[(s['id'],s['start_frame'],s['end_frame'])for s in old['shots']]
counts={k:0 for k in ['proxy','still','endpoint_hold','motion']}
for s in m['shots']:
 cursor=s['start_frame']
 for p in s['spans']:
  assert p['output_start_frame']==cursor;cursor=p['output_end_frame'];counts[p['kind']]+=p['output_end_frame']-p['output_start_frame']
  if p['sampling']=='direct_30fps':assert p['source_end_frame']-p['source_start_frame']==p['output_end_frame']-p['output_start_frame']
 assert cursor==s['end_frame']
 if s['id']not in changed:assert s['immediate_selection']=='unchanged_committed_P4B1'
assert counts=={'proxy':1584,'still':753,'endpoint_hold':561,'motion':615} and sum(counts.values())==3513
assert m['media_recipes']['evidence/dice-town-p4b2/wobble-insert.mp4']['source']=='evidence/dice-town-p4b2/wobble-source.mp4'
s={s['id']:s for s in m['shots']};assert s['D15']['immediate_selection']=='unchanged_committed_P4B1';assert s['D28']['spans'][0]['source'].endswith('D28-five.png');assert not m['audio_touched'] and m['silent']
for p,j in m['sources'].items():assert hashlib.sha256(Path(p).read_bytes()).hexdigest()==j['sha256']
print('PASS38 locked cuts/3513 categorized frames; onlyfour slots replaced;1584proxy; one reused wobble; D15/voice preserved; source hashes')
