from pathlib import Path
import sys,json,hashlib
sys.dont_write_bytecode=True
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'scripts'))
from importlib.util import spec_from_file_location,module_from_spec
spec=spec_from_file_location('assembly','scripts/dice-town-p4a-assemble.py');module=module_from_spec(spec);spec.loader.exec_module(module)
m=module.build_map();assert len(m['shots'])==38 and m['frame_count']==3513
assert sum(x['frames']for x in m['runtime_by_kind'].values())==3513
assert m['runtime_by_kind']['proof_motion']['frames']==321
assert m['runtime_by_kind']['proxy']['frames']==2486
s={s['id']:s for s in m['shots']};assert s['D03']['end_frame']==s['D04']['start_frame']==255
assert next(p for p in s['D03']['spans']if p['kind']=='proof_motion')['source_end_frame']==57
assert s['D04']['spans'][0]['source_start_frame']==57
assert all('p3b2b' in p['source']for p in s['D35']['spans'])
assert s['D02']['selection']==s['D34']['selection']=='unfinished_proxy'
assert all(p['kind']=='still'for p in s['D33']['spans']) and s['D38']['selection']=='native_still_hold'
assert not m['audio_touched'] and m['silent'] and all(not x['final_approved']for x in m['shots'])
for source,value in m['sources'].items():assert hashlib.sha256(Path(source).read_bytes()).hexdigest()==value['sha256']
print('PASS38-source map,3513 frame coverage, baker255 cut/source57 split, newest mother proof, declared placeholders, silent/audio untouched, source hashes')
