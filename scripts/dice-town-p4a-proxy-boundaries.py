"""Measure inherited proxy shot runs from its existing Dxx header pixels, no OCR."""
from pathlib import Path
import subprocess,json,time,hashlib
from PIL import Image,ImageChops,ImageStat
root=Path(__file__).resolve().parent.parent;out=root/'evidence/dice-town-p4a';start=time.monotonic()
m=json.loads((root/'evidence/dice-town-animatic/shot-timing-manifest.json').read_text());shots=m['shots']
raw=subprocess.check_output(['ffmpeg','-v','error','-threads','2','-i',str(root/'evidence/dice-town-animatic/dice-town-animatic.mp4'),'-vf','crop=26:14:6:4,format=rgb24','-f','rawvideo','-'])
size=26*14*3;assert len(raw)==1757*size
frames=[Image.frombytes('RGB',(26,14),raw[i*size:(i+1)*size])for i in range(1757)]
references=[frames[s['proxy_start_frame']]for s in shots];labels=[];maxError=0
for f in frames:
 errors=[sum(ImageStat.Stat(ImageChops.difference(f,r)).mean)/3 for r in references];index=min(range(38),key=lambda i:errors[i]);labels.append(index);maxError=max(maxError,errors[index])
assert labels==sorted(labels) and set(labels)==set(range(38));runs=[]
for i,s in enumerate(shots):
 indices=[j for j,label in enumerate(labels)if label==i];a,b=indices[0],indices[-1]+1;assert b-a==len(indices)
 runs.append({'id':s['id'],'declared_start':s['proxy_start_frame'],'declared_end':s['proxy_end_frame'],'decoded_start':a,'decoded_end':b,'start_difference_proxy_frames':a-s['proxy_start_frame'],'end_difference_proxy_frames':b-s['proxy_end_frame']})
(out/'proxy-boundaries.json').write_text(json.dumps({'status':'PASS','input_sha256':hashlib.sha256((root/'evidence/dice-town-animatic/dice-town-animatic.mp4').read_bytes()).hexdigest(),'method':'All1757 decoded proxy frames classified by26×14 Dxx header crop against38 known cut-start references; contiguous monotonic38-run check. No new images/labels created.','maxHeaderMeanRgbError':maxError,'wallSeconds':time.monotonic()-start,'shots':runs},indent=2));print([(r['id'],r['start_difference_proxy_frames'],r['end_difference_proxy_frames'])for r in runs]);print('max header error',maxError)
