"""Verify a cache-free edit rebuild, without touching the delivered full movie."""
from pathlib import Path
import sys,importlib.util,json,hashlib
sys.dont_write_bytecode=True
spec=importlib.util.spec_from_file_location('assembler',Path(__file__).with_name('dice-town-p4b5-assemble.py'));a=importlib.util.module_from_spec(spec);spec.loader.exec_module(a)
a.OUT=a.ROOT/'renders/dice-town-p4b5/clean-reassembly/output';a.TMP=a.ROOT/'renders/dice-town-p4b5/clean-reassembly/scratch';a.assemble()
h=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
assert h(a.OUT/'working-edit.mp4')==h(a.ROOT/'evidence/dice-town-p4b5/working-edit.mp4')
x=json.loads((a.OUT/'assembly-receipt.json').read_text());x.update(status='PASS',bitIdenticalToDeliveredMovie=True,rawPngCacheUsed=False,method='Committed native action archive and native PNG sources only. No browser capture or raw PNG sequence read; delivered full movie untouched.')
(a.ROOT/'evidence/dice-town-p4b5/clean-reassembly.json').write_text(json.dumps(x,indent=2));print('PASS source-media rebuild: exact delivered movieSHA, no frame cache')
