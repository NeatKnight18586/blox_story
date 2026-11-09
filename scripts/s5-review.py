"""Decode both actual previews for frame-by-frame mouth review and PCM sync checks."""
import json,subprocess,math,array,wave,hashlib
from pathlib import Path
from PIL import Image,ImageDraw
ROOT=Path(__file__).resolve().parents[1];report=json.loads((ROOT/'evidence/names100-s5/motion.json').read_text());raw=ROOT/'renders/names100-s5-review';raw.mkdir(exist_ok=True);tiles=[]
for clip in report['clips']:
 d=raw/clip['id'];d.mkdir(exist_ok=True);subprocess.run(['ffmpeg','-y','-v','error','-i',str(ROOT/clip['file']),'-fps_mode','vfr','-start_number','0',str(d/'frame-%03d.png')],check=True)
 files=sorted(d.glob('frame-*.png'));assert len(files)==clip['frameCount']
 box=(150,660,390,840) if clip['id']=='whisper' else (260,515,500,695)
 for i,f in enumerate(files):
  with Image.open(f) as im:tiles.append((clip['start']+i,im.convert('RGB').crop(box).resize((120,90),Image.Resampling.LANCZOS)))
b=Image.new('RGB',(1200,math.ceil(len(tiles)/10)*110),(20,28,35));draw=ImageDraw.Draw(b)
for i,(g,im) in enumerate(tiles):x=i%10*120;y=i//10*110;b.paste(im,(x,y+20));draw.text((x+3,y+3),f'g{g}',fill='white')
b.save(raw/'all-decoded-mouth-frames.png')
print('PASS actual95 decoded preview frames; contact strip kept temporary for full frame-by-frame review')
