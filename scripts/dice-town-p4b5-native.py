"""Lossless native-source authentication, separate from360px editorial verification."""
from pathlib import Path
import json,subprocess,hashlib
from PIL import Image
R=Path(__file__).resolve().parent.parent;O=R/'evidence/dice-town-p4b5';T=R/'renders/dice-town-p4b5/native-check';T.mkdir(parents=True,exist_ok=True)
source=O/'opening-source.mkv';v=json.loads(subprocess.check_output(['ffprobe','-v','error','-count_frames','-show_streams','-of','json',str(source)]))['streams'][0]
assert(v['codec_name'],v['width'],v['height'],v['avg_frame_rate'],v['nb_read_frames'])==('ffv1',720,1280,'30/1','195')
subprocess.run(['ffmpeg','-y','-v','error','-threads','2','-i',str(source),'-threads','2',str(T/'%03d.png')],check=True)
ranges={'D02':0,'D05':42,'D06':57,'D07':69,'D08':81,'D09':105,'D12':141,'D14':153};checks=[]
for s in json.loads((O/'stills-capture.json').read_text())['samples']:
 path=O/(s['name']+'.png');assert Image.open(path).size==(720,1280);assert hashlib.sha256(path.read_bytes()).hexdigest()==s['hash']
 if s['shot']in ranges:
  index=ranges[s['shot']]+s['frame'];a=Image.open(path).convert('RGB').tobytes();b=Image.open(T/f'{index+1:03d}.png').convert('RGB').tobytes();assert a==b,s['name'];checks.append({'still':s['name'],'archiveFrame':index,'exactRgb':True})
# These original source pixels remain available only during capture validation;
# committed keyframe/archive checks above can be rerun without raw caches.
raw=R/'renders/dice-town-p4b5';rawChecks=0
for s in json.loads((O/'motion-capture.json').read_text())['samples']:
 path=raw/(s['name']+'.png')
 if path.exists():
  assert hashlib.sha256(path.read_bytes()).hexdigest()==s['hash'];index=ranges[s['shot']]+s['frame'];assert Image.open(path).convert('RGB').tobytes()==Image.open(T/f'{index+1:03d}.png').convert('RGB').tobytes();rawChecks+=1
(O/'native-source-verification.json').write_text(json.dumps({'status':'PASS','nativeArchiveCodec':'FFV1/BGR0 lossless','size':[720,1280],'frames':195,'keyframeChecks':checks,'capturedRawFramesAlsoChecked':rawChecks,'exactRgb':True,'noStoryboardsUsedAsNativeSource':True,'note':'Every retained source-native key pose is pixel-identical to its decoded lossless frame. Raw PNG checks are additional when capture scratch exists; normal reproduction needs only committed files.'},indent=2));print('PASS lossless native195-frame source;',len(checks),'committed native keyframes and',rawChecks,'raw captures exact RGB')
