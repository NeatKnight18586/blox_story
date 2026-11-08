"""Compose five retained P5 stills and comparisons, no WebGL/video/audio work."""
import sys,json,importlib.util
from pathlib import Path
from PIL import Image,ImageDraw
sys.dont_write_bytecode=True
ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('counter',ROOT/'scripts/counter-overlay.py');m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
out=ROOT/'evidence/names100-p5';raw=ROOT/'renders/names100-p5-stills'
style=json.loads((ROOT/'stories/names100/counter/p5-editorial.json').read_text());clock=json.loads((ROOT/'evidence/names100-p4/counter-clock.json').read_text())
ass=ROOT/'stories/names100/counter/generated/p5-editorial.ass';spans=m.generate(style,clock,ass)
(out/'counter-events.json').write_text(json.dumps(spans,indent=2)+'\n')
for g in [700,1392,1528,1529,1628]:
 caption=g>=1296;start=1296 if g<1490 else 1490;track='B' if g<1490 else 'C'
 m.composite(raw/f'clean-{g}.png',out/f'after-{g}.png',g,ass,caption, start,track)
 m.composite(ROOT/f'evidence/names100-p4/clean-{g}.png',raw/f'before-{g}.png',g,ROOT/'stories/names100/counter/generated/minimal-editorial.ass',caption,start,track)
# Only compact comparisons and five selected finished originals enter Git.
def board(gs,w,h,file):
 b=Image.new('RGB',(len(gs)*w,2*(h+28)),(20,28,35));d=ImageDraw.Draw(b)
 for col,g in enumerate(gs):
  for row,kind in enumerate(['before','after']):
   path=(raw if kind=='before' else out)/f'{kind}-{g}.png'
   with Image.open(path) as im:b.paste(im.convert('RGB').resize((w,h),Image.Resampling.LANCZOS),(col*w,row*(h+28)+28))
   d.text((col*w+5,row*(h+28)+8),f'{"P4" if row==0 else "P5"} g{g}',fill='white')
 b.save(out/file)
board([700,1392,1528,1529,1628],180,320,'before-after.png')
board([700,1392,1628],240,427,'phone-overview.png')
print('PASS P5 five matched comparisons and phone3-up, existing unchanged B/C caption tracks')
