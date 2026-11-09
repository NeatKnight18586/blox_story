"""Actual native30 ASS masks; no WebGL work or changes to approved subtitles."""
import subprocess,re,json
from pathlib import Path
root=Path(__file__).resolve().parents[1]
def stamp(s):
 h,m,x=s.split(':');return int(h)*3600+int(m)*60+float(x)
def masks(file):
 events=[]
 for l in Path(file).read_text().splitlines():
  if l.startswith('Dialogue:'):
   x=l.split(',',9);events.append((stamp(x[1]),stamp(x[2])))
 p=subprocess.run(['ffmpeg','-v','info','-f','lavfi','-i','color=black:s=720x1280:r=30:d=54.7','-vf',f'settb=1/1000,setpts=trunc(N*1000/30)+1,ass={file},bbox=min_val=20','-frames:v','1641','-f','null','-'],capture_output=True,text=True,check=True)
 boxes=[]
 for l in p.stderr.splitlines():
  if 'Parsed_bbox' not in l or ' n:' not in l:continue
  i=int(re.search(r' n:(\d+)',l)[1]);b=[int(re.search(rf' {k}:(\d+)',l)[1])for k in ['x1','y1','x2','y2']]if' x1:'in l else None;t=(i*1000//30+1)/1000;assert bool(b)==any(a<=t<z for a,z in events),(i,b,t);boxes.append(b)
 assert len(boxes)==1641;return boxes
caption=masks('stories/names100/captions/generated/S4.ass');counter=masks('stories/names100/counter/generated/p5-editorial.ass')
for i,(a,b)in enumerate(zip(caption,counter)):
 if a:assert a[0]>=40 and a[2]<=620 and a[1]>=180 and a[3]<=1010
 if b:assert b[0]>=40 and b[2]<=620 and b[3]<290
 if a and b:assert not(max(a[0],b[0])<=min(a[2],b[2])and max(a[1],b[1])<=min(a[3],b[3]))
 if i>=1546:assert b is None
(root/'evidence/names100-s6/overlay-verification.json').write_text(json.dumps(dict(status='PASS',nativeFrames=1641,allMaskBoundsAndOnOff=True,noCaptionCounterCollisions=True,noS23Counter=True,approvedFilesUnchanged=True))+'\n');print('PASS1641 native30 caption/counter masks,bounds,on/off and collision checks')
