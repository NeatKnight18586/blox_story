"""Coarse PCM sync diagnostic; not perceptual listening or word alignment."""
import argparse,json,subprocess,array,math,wave
from pathlib import Path
p=argparse.ArgumentParser();p.add_argument('--wav',type=Path,required=True);a=p.parse_args();root=Path(__file__).resolve().parents[1];r=json.loads((root/'evidence/names100-s4/assembly.json').read_text())
with wave.open(str(a.wav)) as w:assert w.getframerate()==44100 and w.getnchannels()==2;source=array.array('h',w.readframes(w.getnframes()));duration=w.getnframes()/44100
pcm=subprocess.check_output(['ffmpeg','-v','error','-i',str(root/r['voiced']['file']),'-map','0:a:0','-f','s16le','-ac','2','-ar','44100','-']);decoded=array.array('h',pcm)
x=source[::882];y=decoded[::882];scores=[]
for lag in range(-5,6):
 pairs=[(x[i],y[i+lag])for i in range(max(0,-lag),min(len(x),len(y)-lag))];dot=sum(a*b for a,b in pairs);norm=math.sqrt(sum(a*a for a,b in pairs)*sum(b*b for a,b in pairs));scores.append((lag,dot/norm))
best=max(scores,key=lambda v:v[1]);assert best[0]==0 and best[1]>.95
v=next(s for s in r['voiced']['probe']['streams'] if s['codec_type']=='video');au=next(s for s in r['voiced']['probe']['streams'] if s['codec_type']=='audio');assert float(v['start_time'])==float(au['start_time'])==0
out={'status':'TECHNICAL_PASS_HUMAN_LISTENING_PENDING','originalSeconds':duration,'videoSeconds':821/15,'trailingVideoMinusOriginalSeconds':821/15-duration,'audioCodec':au['codec_name'],'audioSeconds':float(au['duration']),'startSeconds':0,'coarsePcmCorrelation':best[1],'peakLagMilliseconds':best[0]*10,'diagnosticResolutionMilliseconds':10,'scope':'100Hz sample diagnostic comparing original PCM and AAC decode; no trim/stretch, not a substitute for listening.'}
(root/'evidence/names100-s4/audio-verification.json').write_text(json.dumps(out,indent=2)+'\n');print('PASS t=0,unchanged narration input,coarse PCM sync correlation',best)
