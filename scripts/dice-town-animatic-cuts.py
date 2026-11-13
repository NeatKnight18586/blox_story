from pathlib import Path
from PIL import Image,ImageChops,ImageStat
import json,subprocess
out=Path('evidence/dice-town-animatic');m=json.load(open(out/'shot-timing-manifest.json'));tmp=Path('renders/dice-town-animatic/cuts');tmp.mkdir(exist_ok=True)
indices=[s['proxy_start_frame'] for s in m['shots']];selection='+'.join(f'eq(n,{i})'for i in indices)
subprocess.run(['ffmpeg','-y','-v','error','-i',str(out/'dice-town-animatic.mp4'),'-vf',f"select='{selection}'",'-fps_mode','vfr',str(tmp/'%03d.png')],check=True)
checks=[]
for j,s in enumerate(m['shots'],1):
 a=Image.open(tmp/f'{j:03}.png').convert('RGB');b=Image.open('renders/dice-town-animatic/hold-'+s['id']+'-0.png').convert('RGB');error=sum(ImageStat.Stat(ImageChops.difference(a,b)).mean)/3;checks.append({'shot':s['id'],'proxyFrame':indices[j-1],'meanRgbError':error});assert error<5,(s['id'],error)
(out/'cut-verification.json').write_text(json.dumps({'status':'PASS','all38CutStartsMatchExpectedBoards':True,'checks':checks},indent=2))
