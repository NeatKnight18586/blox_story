"""23-shot board decoded from the newly assembled silent review movie."""
import json,subprocess
from pathlib import Path
from PIL import Image,ImageDraw
ROOT=Path(__file__).resolve().parents[1];out=ROOT/'evidence/names100-s6';raw=ROOT/'renders/names100-s6-review';r=json.loads((out/'assembly.json').read_text());story=json.loads((ROOT/'stories/names100/roughcut.json').read_text());selected=[s['keyframe'] for s in story['shots']]
selection='+'.join(f'eq(n,{i})' for i in selected)
subprocess.run(['ffmpeg','-y','-v','error','-i',str(ROOT/r['silent']['file']),'-vf',f"select='{selection}'",'-fps_mode','vfr','-start_number','0',str(raw/'contact-%02d.png')],check=True)
b=Image.new('RGB',(4*180,6*348),(20,28,35));d=ImageDraw.Draw(b)
for n,(shot,i) in enumerate(zip(story['shots'],selected)):
 im=Image.open(raw/f'contact-{n:02}.png').convert('RGB').resize((180,320),Image.Resampling.LANCZOS);x=n%4*180;y=n//4*348;b.paste(im,(x,y+28));d.text((x+4,y+8),f"{shot['id']} g{i} / {i/30:.2f}s",fill='white')
b.save(out/'23-shot-contact.png');(out/'contact-frames.json').write_text(json.dumps({'source':r['silent']['file'],'sha256':r['silent']['sha256'],'upscaled3d':False,'frames':[{'shot':s['id'],'outputFrame':i,'globalFrame':i}for s,i in zip(story['shots'],selected)]},indent=2)+'\n');print('PASS23-shot contact sheet from new integrated review movie, not archived S2')
