"""Authenticate the native action archive against committed WebGL keyframes."""
from pathlib import Path
import subprocess,json,hashlib
from PIL import Image,ImageChops,ImageStat
r=Path(__file__).resolve().parent.parent;p=r/'evidence/dice-town-p4b4';tmp=r/'renders/dice-town-p4b4/native-check';tmp.mkdir(exist_ok=True,parents=True)
v=json.loads(subprocess.check_output(['ffprobe','-v','error','-count_frames','-show_streams','-of','json',str(p/'backstory-source.mp4')]))['streams'][0]
assert(v['width'],v['height'],v['avg_frame_rate'],v['nb_read_frames'])==(720,1280,'30/1','90')
subprocess.run(['ffmpeg','-y','-v','error','-threads','2','-i',str(p/'backstory-source.mp4'),'-threads','2',str(tmp/'%03d.png')],check=True)
offsets={s:i*15 for i,s in enumerate(['D17','D18','D20','D21','D22','D24'])};checks=[]
for s in json.loads((p/'stills-capture.json').read_text())['samples']:
 f=p/(s['name']+'.png');assert Image.open(f).size==(720,1280);assert hashlib.sha256(f.read_bytes()).hexdigest()==s['hash']
 if s['shot']=='photo':continue
 index=offsets[s['shot']]+s['frame'];a=Image.open(f).convert('RGB');b=Image.open(tmp/f'{index+1:03d}.png').convert('RGB');error=sum(ImageStat.Stat(ImageChops.difference(a,b)).mean)/3;assert error<6,(s['name'],error);checks.append({'nativeStill':s['name'],'archiveFrame':index,'meanRgbError':error})
for n in ['D21-gate','D19-present']:assert Image.open(p/(n+'.png')).size==(720,1280)
assert Image.open(p/'historical-portrait.png').size==(1024,1024)
(p/'native-source-verification.json').write_text(json.dumps({'status':'PASS','archiveResolution':[720,1280],'archiveFrames':90,'archiveFps':30,'keyframeChecks':checks,'maxMeanRgbError':max(x['meanRgbError']for x in checks),'toleranceMeanRgbError':6,'method':'Decoded native H264 action source compared to actual committed native WebGL PNGs and their capture hashes, at every recorded matching timestamp. Gate/current mother native720, historical portrait1024. No360px image used as a native substitute.'},indent=2));print('PASS native720 archive/90frames and',len(checks),'native screenshot/source comparisons')
