"""One concise S5 comparison sheet: reduced native scenes + four 1:1 mouth crops."""
import sys,importlib.util,json
from pathlib import Path
from PIL import Image,ImageDraw,ImageChops
sys.dont_write_bytecode=True
ROOT=Path(__file__).resolve().parents[1];s=importlib.util.spec_from_file_location('counter',ROOT/'scripts/counter-overlay.py');m=importlib.util.module_from_spec(s);s.loader.exec_module(m)
raw=ROOT/'renders/names100-s5-stills';out=ROOT/'evidence/names100-s5';gs=[30,780,1115,1232,1248,1392,1600]
b=Image.new('RGB',(1260,1050),(20,28,35));d=ImageDraw.Draw(b);d.text((8,5),'S5 native720x1280 WebGL — scenes reduced above; bottom crops at1:1. Same cameras/environment.',fill='white')
for col,g in enumerate(gs):
 for row,kind in enumerate(['before','after']):
  dest=raw/f'{kind}-text-{g}.png';m.composite(raw/f'{kind}-{g}.png',dest,g,ROOT/'stories/names100/counter/generated/p5-editorial.ass',True,0,'S4')
  with Image.open(dest) as im:b.paste(im.convert('RGB').resize((180,320),Image.Resampling.LANCZOS),(col*180,row*348+50))
  d.text((col*180+5,row*348+31),f'{kind} g{g}',fill='white')
for i,(g,kind,box) in enumerate([(780,'before',(120,590,420,890)),(780,'after',(120,590,420,890)),(1232,'before',(220,410,520,710)),(1232,'after',(220,410,520,710))]):
 with Image.open(raw/f'{kind}-{g}.png') as im:b.paste(im.convert('RGB').crop(box),(i*315,750))
 d.text((i*315+5,731),f'g{g} {kind}:native1:1 crop',fill='white')
checks=[]
for g in gs:
 a=Image.open(raw/f'before-{g}.png').convert('RGB');z=Image.open(raw/f'after-{g}.png').convert('RGB');box=ImageChops.difference(a,z).getbbox()
 if g==780:assert box and box[1]>700 and box[3]<850
 elif g==1232:assert box and box[1]>550 and box[3]<650
 else:assert box is None
 checks.append({'globalFrame':g,'changedPixelBounds':box,'sameCamera':True})
(out/'pixel-checks.json').write_text(json.dumps({'status':'PASS','checks':checks,'scope':'Full-image differences confined to mouth; all five inactive/environment controls pixel-identical'},indent=2)+'\n')
b.save(out/'comparison.png');print('PASS single native before/after sheet, identical text/style; native1:1 detail crops')
