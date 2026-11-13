from pathlib import Path
import json,subprocess,time,resource,hashlib
from PIL import Image,ImageChops,ImageStat,ImageDraw,ImageFont
ROOT=Path(__file__).resolve().parent.parent;OUT=ROOT/'evidence/dice-town-p4b4';TMP=ROOT/'renders/dice-town-p4b4/verify';TMP.mkdir(exist_ok=True,parents=True)
start=time.monotonic();m=json.loads((OUT/'edit-map.json').read_text());shots=m['shots'];indices=set()
for s in shots:
 a,b=s['start_frame'],s['end_frame'];indices.update([a,(a+b-1)//2,b-1])
 for p in s['spans']:indices.update([p['output_start_frame'],p['output_end_frame']-1])
indices=sorted(indices)
def extract(source,frames,folder):
 folder.mkdir(exist_ok=True,parents=True);terms=[f'eq(n,{f})'for f in sorted(frames)]
 while len(terms)>1:terms=[f'({terms[i]}+{terms[i+1]})'if i+1<len(terms)else terms[i]for i in range(0,len(terms),2)]
 selection=terms[0];args=['ffmpeg','-y','-v','error','-threads','2','-i',str(ROOT/source),'-vf',f"select='{selection}',scale=360:640:flags=lanczos",'-fps_mode','vfr','-threads','2',str(folder/'%04d.png')];subprocess.run(args,check=True);files=sorted(folder.glob('*.png'));assert len(files)==len(frames),(source,len(files),len(frames));return dict(zip(sorted(frames),files))
output=extract('evidence/dice-town-p4b4/working-edit.mp4',indices,TMP/'output')
def source_at(frame):
 s=next(s for s in shots if s['start_frame']<=frame<s['end_frame']);p=next(p for p in s['spans']if p['output_start_frame']<=frame<p['output_end_frame']);local=frame-p['output_start_frame'];kind=p['kind'];lo=p['source_start_frame'];hi=p['source_end_frame'];f=lo+local if p.get('sampling')=='direct_30fps' else lo+min(local//2,hi-lo-1) if kind=='proxy' else lo
 return s,p,f
wanted={}
for f in indices:
 s,p,src=source_at(f);wanted.setdefault(p['source'],set()).add(src)
expected={}
for i,(source,frames)in enumerate(sorted(wanted.items())):expected[source]=extract(source,frames,TMP/f'source-{i:02d}')
checks=[]
for f in indices:
 s,p,src=source_at(f);a=Image.open(output[f]).convert('RGB');b=Image.open(expected[p['source']][src]).convert('RGB');error=sum(ImageStat.Stat(ImageChops.difference(a,b)).mean)/3;checks.append({'frame':f,'shot':s['id'],'kind':p['kind'],'source':p['source'],'source_frame':src,'meanRgbError':error});assert error<6,(f,s['id'],src,error)
# Complete decode, packet/PTS/frame-count checks are also performed by existing JS verifier.
probe=json.loads(subprocess.check_output(['ffprobe','-v','error','-count_frames','-show_streams','-show_format','-of','json',str(OUT/'working-edit.mp4')]))
assert len(probe['streams'])==1;v=probe['streams'][0];assert v['codec_type']=='video' and v['codec_name']=='h264' and v['pix_fmt']=='yuv420p';assert(v['width'],v['height'])==(360,640);assert v['nb_read_frames']=='3513' and v['avg_frame_rate']=='30/1';assert abs(float(probe['format']['duration'])-117.1)<1e-6
font=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',12);proof=[s for s in shots if s['id']in['D17','D18','D19','D20','D21','D22','D24']];board=Image.new('RGB',(1080,720),'#15212a');draw=ImageDraw.Draw(board)
for i,s in enumerate(proof):
 x=i%3*360;y=i//3*240;draw.text((x+4,y+3),s['id']+' / begin, middle, end',font=font,fill='white')
 for col,f in enumerate([s['start_frame'],(s['start_frame']+s['end_frame']-1)//2,s['end_frame']-1]):
  im=Image.open(output[f]);board.paste(im.resize((120,213),Image.Resampling.LANCZOS),(x+col*120,y+23))
board.save(OUT/'editorial-contact.jpg',quality=93)
r=resource.getrusage(resource.RUSAGE_CHILDREN)
(OUT/'source-verification.json').write_text(json.dumps({'status':'PASS','probe':probe,'selectedFrameChecks':checks,'checksCount':len(checks),'all38CutStartsAndEndsChecked':True,'substitutionSpanBoundariesChecked':True,'maxMeanRgbError':max(x['meanRgbError']for x in checks),'toleranceMeanRgbError':6,'method':'Decode final film and compare expected source-frame pixels at every shot start/mid/end plus all substituted span boundaries; tolerate H264 re-encode/color conversion. No regenerated3D.','wallSeconds':time.monotonic()-start,'childUserCpuSeconds':r.ru_utime,'childSystemCpuSeconds':r.ru_stime,'maxChildRssKiB':r.ru_maxrss},indent=2))
print('PASS',len(checks),'source-frame comparisons, all38 shot boundaries, maxMeanRgbError',max(x['meanRgbError']for x in checks))
