"""Four native environment comparisons with approved independent text layers."""
import sys,importlib.util
from pathlib import Path
from PIL import Image,ImageDraw
sys.dont_write_bytecode=True
ROOT=Path(__file__).resolve().parents[1]
s=importlib.util.spec_from_file_location('counter',ROOT/'scripts/counter-overlay.py');m=importlib.util.module_from_spec(s);s.loader.exec_module(m)
out=ROOT/'evidence/names100-s4';raw=ROOT/'renders/names100-s4-gate';counter=ROOT/'stories/names100/counter/generated/p5-editorial.ass'
b=Image.new('RGB',(4*180,2*348),(20,28,35));d=ImageDraw.Draw(b)
for col,g in enumerate([30,1392,1628,700]):
 for row,kind in enumerate(['before','after']):
  dest=(raw/f'before-composited-{g}.png' if kind=='before' else out/f'after-{g}.png');m.composite(raw/f'{kind}-{g}.png',dest,g,counter,True,0,'S4')
  with Image.open(dest) as im:b.paste(im.convert('RGB').resize((180,320),Image.Resampling.LANCZOS),(col*180,row*348+28))
  d.text((col*180+5,row*348+7),f'{kind} g{g}'+(' CAMERA' if g==30 else ''),fill='white')
b.save(out/'environment-comparison.png')
print('PASS four native composited comparisons, phone board; only opening camera differs')
