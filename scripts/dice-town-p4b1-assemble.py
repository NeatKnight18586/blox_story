"""Upgrade only D25-D32; packet-copy all unchanged committed P4A footage."""
from pathlib import Path
import json,subprocess,time,resource,hashlib,copy,os,sys
ROOT=Path(__file__).resolve().parent.parent;OUT=ROOT/'evidence/dice-town-p4b1';TMP=ROOT/'renders/dice-town-p4b1';BASE='evidence/dice-town-p4a/working-edit.mp4';ARCHIVE='evidence/dice-town-p4b1/motion-sources.mp4'
COUNTS={'D27':54,'D29':36,'D30':42,'D31':42};OFFSETS={'D27':0,'D29':54,'D30':90,'D31':132};PRE={'D27':20,'D29':3,'D30':8,'D31':0}
def run(args):subprocess.run(args,check=True,cwd=ROOT)
def sha(p):return hashlib.sha256((ROOT/p).read_bytes()).hexdigest()
def codec():return ['-c:v','libx264','-threads','2','-preset','medium','-crf','20','-profile:v','main','-level:v','3.1','-pix_fmt','yuv420p','-color_primaries','bt709','-color_trc','bt709','-colorspace','bt709','-color_range','tv','-video_track_timescale','15360','-g','60','-an']
NORM='scale=360:640:flags=lanczos:out_color_matrix=bt709:out_range=tv,setsar=1,format=yuv420p'
def build_map():
 base=json.loads((ROOT/'evidence/dice-town-p4a/edit-map.json').read_text());m=copy.deepcopy(base);m['parent_edit']=BASE;m['inherited_proxy_mapping']=m['proxy_mapping'];m['proxy_mapping']='Compiled labeled proxy regions copied at1x from committed30fps parent; original15fps mapping retained only in provenance.';m['source_clock']='All38 original end-exclusive slots unchanged; D25-D32 are the only replacements.';m['inherited_die_limitation']='Required D28 still has5 adjacent2; complete new die uses correct opposite pairs. D28 preserved, not silently repaired.'
 for s in m['shots']:
  sid=s['id'];a=s['start_frame'];b=s['end_frame'];n=b-a
  if not 25<=int(sid[1:])<=32:
   for p in s['spans']:
    old=copy.deepcopy(p);p.clear();p.update(output_start_frame=old['output_start_frame'],output_end_frame=old['output_end_frame'],kind='motion'if old['kind']=='proof_motion'else old['kind'],source=BASE,source_start_frame=old['output_start_frame'],source_end_frame=old['output_end_frame'],sampling='direct_30fps',source_fps=30,provenance=old)
   s['immediate_selection']='unchanged_committed_working_edit';continue
  s['spans']=[];s['final_approved']=False
  def span(lo,hi,kind,source,x,y,sampling='hold'):
   s['spans'].append({'output_start_frame':lo,'output_end_frame':hi,'kind':kind,'source':source,'source_start_frame':x,'source_end_frame':y,'sampling':sampling})
  if sid in ['D25','D26']:
   values=[1,2]if sid=='D25'else[4,3,5];lengths=[57,58]if sid=='D25'else[38,38,39];at=a
   for value,length in zip(values,lengths):span(at,at+length,'still',f'evidence/dice-town-p4b1/face-{value}.png',0,1);at+=length
   s['selection']='native_orientation_match_cuts';s['note']='Same complete die/camera, real orientations, no top-number substitution.'
  elif sid in COUNTS:
   count=COUNTS[sid];offset=OFFSETS[sid];pre=PRE[sid];post=n-pre-count
   if pre:span(a,a+pre,'endpoint_hold',ARCHIVE,offset,offset+1)
   span(a+pre,a+pre+count,'motion',ARCHIVE,offset,offset+count,'direct_30fps')
   if post:span(b-post,b,'endpoint_hold',ARCHIVE,offset+count-1,offset+count)
   s['selection']='bounded_motion_and_endpoint_holds';s['note']='Explicit authored motion at1x; no generated in-between or time stretch.'
  elif sid=='D28':
   span(a,b,'still',BASE,a,b,'direct_30fps');s['selection']='unchanged_sixth_sunrise_still';s['note']='Exactly reuse encoded P3B4 five-up still from committed P4A; inherited adjacent-face inconsistency disclosed.'
  else:
   span(a,b,'still','evidence/dice-town-p4b1/six-settled.png',0,1);s['selection']='native_six_payoff_hold';s['note']='Real six upper face; no text overlay.'
  s['immediate_selection']=s['selection']
 sources={p['source']for s in m['shots']for p in s['spans']};m['sources']={p:{'sha256':sha(p)}for p in sorted(sources)};m['runtime_by_kind']={k:{'frames':sum(p['output_end_frame']-p['output_start_frame']for s in m['shots']for p in s['spans']if p['kind']==k)}for k in ['proxy','still','endpoint_hold','motion']}
 for v in m['runtime_by_kind'].values():v.update(seconds=v['frames']/30,percent=v['frames']/3513*100)
 return m

def assemble():
 start=time.monotonic();TMP.mkdir(exist_ok=True,parents=True);OUT.mkdir(exist_ok=True,parents=True);commands=[]
 # Compact reusable captured-source archive; the delivered film is the full edit.
 reuse_archive=(ROOT/ARCHIVE).exists() and '--rebuild-motion' not in sys.argv
 if not reuse_archive:
  seq=TMP/'motion-frames';seq.mkdir(exist_ok=True);i=0
  for sid,count in COUNTS.items():
   for f in range(count):
    src=TMP/sid/f'frame-{f:05}.png';dst=seq/f'frame-{i:05}.png'
    if dst.exists():dst.unlink()
    os.link(src,dst);i+=1
  assert i==174
  args=['ffmpeg','-y','-v','error','-framerate','30','-i',str(seq/'frame-%05d.png'),'-vf',NORM,'-frames:v','174',*codec(),'-movflags','+faststart',str(ROOT/ARCHIVE)];run(args);commands.append(args)
 m=build_map();(OUT/'edit-map.json').write_text(json.dumps(m,indent=2));segments=[]
 def packet(name,a,b):
  path=TMP/(name+'.mp4');args=['ffmpeg','-y','-v','error','-ss',format(a/30,'.12f'),'-i',str(ROOT/BASE),'-map','0:v:0','-frames:v',str(b-a),'-c:v','copy','-an','-video_track_timescale','15360',str(path)];run(args);commands.append(args);segments.append((path,b-a))
 packet('unchanged-prefix',0,2224)
 for s in m['shots'][24:32]:
  sid=s['id'];a=s['start_frame'];b=s['end_frame'];n=b-a;spans=s['spans'];dest=TMP/(sid+'-edit.mp4')
  if sid=='D28':packet('D28-unchanged',a,b);continue
  if sid in COUNTS:
   count=COUNTS[sid];offset=OFFSETS[sid];pre=PRE[sid];post=n-pre-count
   inp=['-i',str(ROOT/ARCHIVE)];filt=['-vf',f'trim=start_frame={offset}:end_frame={offset+count},setpts=PTS-STARTPTS,tpad=start={pre}:stop={post}:start_mode=clone:stop_mode=clone,{NORM},setpts=N/(30*TB)']
  else:
   inp=[];parts=[];labels=[]
   for i,p in enumerate(spans):
    length=p['output_end_frame']-p['output_start_frame'];inp+=['-loop','1','-framerate','30','-i',str(ROOT/p['source'])];parts.append(f'[{i}:v]trim=end_frame={length},setpts=PTS-STARTPTS,{NORM}[v{i}]');labels.append(f'[v{i}]')
   parts.append(''.join(labels)+f'concat=n={len(labels)}:v=1:a=0,setpts=N/(30*TB)[v]');filt=['-filter_complex',';'.join(parts),'-map','[v]']
  args=['ffmpeg','-y','-v','error',*inp,*filt,'-frames:v',str(n),'-r','30',*codec(),str(dest)];run(args);commands.append(args);segments.append((dest,n))
 packet('unchanged-suffix',2898,3513)
 concat=TMP/'edit.ffconcat';concat.write_text('ffconcat version 1.0\n'+''.join(f"file '{p}'\nduration {n/30:.12f}\n"for p,n in segments));assert sum(n for _,n in segments)==3513
 partial=TMP/'working-edit.partial.mp4';args=['ffmpeg','-y','-v','error','-f','concat','-safe','0','-i',str(concat),'-c','copy','-an','-movflags','+faststart',str(partial)];run(args);commands.append(args);partial.replace(OUT/'working-edit.mp4');r=resource.getrusage(resource.RUSAGE_CHILDREN)
 (OUT/'assembly-receipt.json').write_text(json.dumps({'wallSeconds':time.monotonic()-start,'childUserCpuSeconds':r.ru_utime,'childSystemCpuSeconds':r.ru_stime,'maxChildRssKiB':r.ru_maxrss,'scope':'FFmpeg children totals/max process RSS, not summed tree peak','commands':commands,'motionFramesCaptured':174,'motionArchiveReused':reuse_archive,'unchangedFramesPacketCopied':2224+615+84,'newShotEncodes':7,'mp4Sha256':sha(str((OUT/'working-edit.mp4').relative_to(ROOT)))},indent=2))
if __name__=='__main__':assemble()
