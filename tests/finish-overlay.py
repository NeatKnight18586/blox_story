import sys,importlib.util,json,re,tempfile,statistics
from pathlib import Path
from PIL import Image,ImageChops
sys.dont_write_bytecode=True
ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('counter',ROOT/'scripts/counter-overlay.py');m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
p4=ROOT/'evidence/names100-p4';out=ROOT/'evidence/names100-p5';raw=ROOT/'renders/names100-p5-stills'
clock=json.loads((p4/'counter-clock.json').read_text());old=json.loads((ROOT/'stories/names100/counter/minimal-editorial.json').read_text());new=json.loads((ROOT/'stories/names100/counter/p5-editorial.json').read_text())
for key in old:
 if key not in ['name','note']:assert old[key]==new[key],key
with tempfile.TemporaryDirectory() as d:
 p=Path(d)/'old.ass';m.generate(old,clock,p);assert p.read_bytes()==(ROOT/'stories/names100/counter/generated/minimal-editorial.ass').read_bytes()
 p=Path(d)/'new.ass';m.generate(new,clock,p);assert p.read_bytes()==(ROOT/'stories/names100/counter/generated/p5-editorial.ass').read_bytes()
 text=p.read_text();stripped=re.sub(r'\\[13]c&H[0-9A-Fa-f]+&','',text)
 assert stripped==(ROOT/'stories/names100/counter/generated/minimal-editorial.ass').read_text()
 # This equality preserves every event boundary/value/position/fade, including
 # native1 at1528,0 at1529 and hiddenS23, already tested by counter-overlay.py.
checks=[]
def lum(rgb):
 v=[c/255 for c in rgb];v=[c/12.92 if c<=.04045 else ((c+.055)/1.055)**2.4 for c in v];return sum(c*w for c,w in zip(v,[.2126,.7152,.0722]))
def contrast(a,b):
 a,b=sorted([lum(a),lum(b)]);return (b+.05)/(a+.05)
for g in [1528,1529]:
 im=Image.open(out/f'after-{g}.png').convert('RGB');clean=Image.open(p4/f'clean-{g}.png').convert('RGB');assert im.size==clean.size==(720,1280)
 # Restrict the counter-only mask to the known top typography band.
 # The cap below y250 has deliberately different P5 shadow pixels.
 local=ImageChops.difference(im,clean).crop((0,120,720,250)).getbbox();assert local
 box=(local[0],local[1]+120,local[2],local[3]+120);assert box[0]>=40 and box[2]<620 and box[3]<250
 ratios=[]
 for y in range(box[1],box[3]):
  for x in range(box[0],box[2]):
   c=im.getpixel((x,y))
   if max(abs(c[i]-[24,32,40][i]) for i in range(3))<=2:ratios.append(contrast(c,clean.getpixel((x,y))))
 assert len(ratios)>100 and min(ratios)>=3
 checks.append({'globalFrame':g,'glyphInteriorPixels':len(ratios),'minimumFillContrast':min(ratios),'medianFillContrast':statistics.median(ratios),'inkBounds':box})
# One declared fixed ground-edge scan in1392, not a whole-frame quality score.
profiles=[]
for root in [p4,out]:
 im=Image.open(root/('clean-1392.png' if root==p4 else 'after-1392.png')).convert('RGB');v=[sum(im.getpixel((415,y)))/3 for y in range(980,996)];lo,hi=min(v),max(v)
 crossings=[next(i for i,x in enumerate(v) if x>=lo+(hi-lo)*fraction) for fraction in [.1,.9]]
 profiles.append({'source':str(root.relative_to(ROOT)),'x':415,'yRange':[980,996],'edge10To90WidthPixels':crossings[1]-crossings[0],'maximumAdjacentRgbMeanStep':max(abs(b-a) for a,b in zip(v,v[1:]))})
assert profiles[1]['edge10To90WidthPixels']>profiles[0]['edge10To90WidthPixels']
assert profiles[1]['maximumAdjacentRgbMeanStep']<profiles[0]['maximumAdjacentRgbMeanStep']
(out/'finish-metrics.json').write_text(json.dumps({'status':'PASS','counterTimingAndLayoutIdentical':True,'p4AssByteIdentical':True,'sourceNativeSamples':1641,'counterContrast':checks,'groundEdge':profiles,'scope':'Local samples support visual review, not a universal contrast/shadow certification.'},indent=2)+'\n')
print('PASS P5 legacy ASS exact, native counter events/layout unchanged, actual dark fill contrast>=3:1, declared ground edge softer')
