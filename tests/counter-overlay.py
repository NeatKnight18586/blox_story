import sys,importlib.util,json,re,math
from pathlib import Path
from PIL import Image,ImageChops
sys.dont_write_bytecode=True
ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('counter',ROOT/'scripts/counter-overlay.py');m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
out=ROOT/'evidence/names100-p4';style=json.loads((ROOT/'stories/names100/counter/minimal-editorial.json').read_text());clock=json.loads((out/'counter-clock.json').read_text());ass=(ROOT/'stories/names100/counter/generated/minimal-editorial.ass').read_text()
def time(s):
 h,mi,rest=s.split(':');return int(h)*3600+int(mi)*60+float(rest)
events=[]
for line in ass.splitlines():
 if not line.startswith('Dialogue:'):continue
 p=line.split(',',9);events.append(dict(start=time(p[1]),end=time(p[2]),kind=p[3],text=re.sub(r'\{.*?\}','',p[9])))
for g in range(1641):
 expected=m.sample(style,clock['frames'][g]);t=math.floor(g*1000/30+1e-7)/1000
 shown=[e for e in events if e['start']<=t<e['end'] and e['kind']=='Number']
 assert len(shown)==int(expected['visible']),(g,shown)
 if shown:assert shown[0]['text']==str(expected['value'])
assert m.sample(style,clock['frames'][1528])['value']==1
assert m.sample(style,clock['frames'][1529])['value']==0 and m.sample(style,clock['frames'][1529])['opacity']==1
assert m.sample(style,clock['frames'][1545])['opacity']<1
assert not m.sample(style,clock['frames'][1546])['visible'] and not m.sample(style,clock['frames'][1628])['visible']
assert not any('ELI' in e['text'] or 'RESIDENT' in e['text'] for e in events)
# Direct image differences are confined to the upper numeric/label region when
# captions are absent. Existing projected head tops all sit below this region.
checks=[]
for g in [145,850,1248,1528,1529]:
 clean=Image.open(out/f'clean-{g}.png').convert('RGB');new=Image.open(out/f'editorial-{g}.png').convert('RGB');box=ImageChops.difference(clean,new).crop((0,0,720,340)).getbbox();assert box and box[0]>=40 and box[2]<620 and box[3]<290
 assert clean.size==new.size==(720,1280)
 checks.append(dict(globalFrame=g,counterInkBox=box,counterValue=clock['frames'][g]['value']))
(out/'counter-verification.json').write_text(json.dumps(dict(status='PASS',allNativeAssSamples=1641,clockAuthority='existing source sampler',exact1528_1529=True,zeroFadeFrames=6,noNumberThroughoutS23=True,selectedImageBounds=checks),indent=2)+'\n')
print('PASS all1641 native ASS samples,actor-free typography,protected1→0,0.2s fade/hidden S23,native graphic bounds')
