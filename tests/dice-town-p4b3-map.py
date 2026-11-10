from pathlib import Path
import json,hashlib
out=Path('evidence/dice-town-p4b3');m=json.loads((out/'edit-map.json').read_text());old=json.loads(Path('evidence/dice-town-p4b2/edit-map.json').read_text());changed={'D33','D34','D37','D38'}
assert [(s['id'],s['start_frame'],s['end_frame'])for s in m['shots']]==[(s['id'],s['start_frame'],s['end_frame'])for s in old['shots']]
counts={k:0 for k in ['proxy','still','endpoint_hold','motion']}
for s in m['shots']:
 cursor=s['start_frame']
 for p in s['spans']:
  assert p['output_start_frame']==cursor;cursor=p['output_end_frame'];counts[p['kind']]+=p['output_end_frame']-p['output_start_frame']
  if p['sampling']=='direct_30fps':assert p['source_end_frame']-p['source_start_frame']==p['output_end_frame']-p['output_start_frame']
 assert cursor==s['end_frame']
 if s['id']not in changed:assert s['immediate_selection']=='unchanged_committed_P4B2'
assert counts=={'proxy':1434,'still':647,'endpoint_hold':733,'motion':699} and sum(counts.values())==3513
s={s['id']:s for s in m['shots']};assert all(s[k]['immediate_selection']=='unchanged_committed_P4B2' for k in ['D35','D36']);assert s['D37']['spans'][0]['source'].endswith('mother-close.png');assert not m['audio_touched'] and m['silent']
assert m['ending_recipes']['source_archive']['frames']==84
assert m['ending_recipes']['source_archive']['ranges']=={'D33':[0,27],'D34':[27,57],'D38':[57,84]}
assert s['D33']['spans'][1]['output_end_frame']-s['D33']['spans'][1]['output_start_frame']==27
assert s['D34']['spans'][1]['output_end_frame']-s['D34']['spans'][1]['output_start_frame']==30
assert s['D38']['spans'][1]['output_end_frame']-s['D38']['spans'][1]['output_start_frame']==27
for p,j in m['sources'].items():assert hashlib.sha256(Path(p).read_bytes()).hexdigest()==j['sha256']
print('PASS38 locked cuts/3513 categorized frames;84 new motion frames; D35/D36 preserved;1434proxy; native recent mother crop; silent/source hashes')
