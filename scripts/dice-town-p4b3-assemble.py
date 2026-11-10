"""Ending-only incremental edit:84 captured frames, two native plates, four locked slots."""
from pathlib import Path
import json,subprocess,time,resource,hashlib,copy,sys
ROOT=Path(__file__).resolve().parent.parent;OUT=ROOT/'evidence/dice-town-p4b3';TMP=ROOT/'renders/dice-town-p4b3';BASE='evidence/dice-town-p4b2/working-edit.mp4'
SOURCE='evidence/dice-town-p4b3/ending-source.mp4'
MOTHER='evidence/dice-town-p4b3/mother-close.png';HOME='evidence/dice-town-p4b3/home.png'
def run(args):subprocess.run(args,check=True,cwd=ROOT)
def sha(path):return hashlib.sha256((ROOT/path).read_bytes()).hexdigest()
def codec():return ['-c:v','libx264','-threads','2','-preset','medium','-crf','18','-profile:v','main','-level:v','3.1','-pix_fmt','yuv420p','-color_primaries','bt709','-color_trc','bt709','-colorspace','bt709','-color_range','tv','-video_track_timescale','15360','-g','60','-an']
def norm(w=360,h=640):return f'scale={w}:{h}:flags=lanczos:out_color_matrix=bt709:out_range=tv,setsar=1,format=yuv420p'
def build_map():
 m=copy.deepcopy(json.loads((ROOT/'evidence/dice-town-p4b2/edit-map.json').read_text()));m['parent_edit']=BASE;m['source_clock']='All38 end-exclusive slots unchanged; onlyD33,D34,D37,D38 replaced.';m['proxy_mapping']='Unchanged proxy packet copied from P4B2; nested provenance retained.'
 m.pop('media_recipes',None);m['ending_recipes']={'source_archive':{'path':SOURCE,'frames':84,'ranges':{'D33':[0,27],'D34':[27,57],'D38':[57,84]}},'mother':{'source':'evidence/dice-town-p3b2b/response.png','crop_xywh':[120,240,450,800],'output':MOTHER,'newWebGLFrames':0}}
 for s in m['shots']:
  sid=s['id'];a=s['start_frame'];b=s['end_frame']
  if sid not in ['D33','D34','D37','D38']:
   for p in s['spans']:
    old=copy.deepcopy(p);p.clear();p.update(output_start_frame=old['output_start_frame'],output_end_frame=old['output_end_frame'],kind=old['kind'],source=BASE,source_start_frame=old['output_start_frame'],source_end_frame=old['output_end_frame'],sampling='direct_30fps',source_fps=30,provenance=old)
   s['immediate_selection']='unchanged_committed_P4B2';continue
  s['spans']=[];s['final_approved']=False;cursor=a
  def add(length,kind,source,lo,hi):
   nonlocal cursor
   s['spans'].append({'output_start_frame':cursor,'output_end_frame':cursor+length,'kind':kind,'source':source,'source_start_frame':lo,'source_end_frame':hi,'sampling':'direct_30fps'if kind=='motion'else'hold'});cursor+=length
  if sid=='D33':
   add(10,'endpoint_hold',SOURCE,0,1);add(27,'motion',SOURCE,0,27);add(50,'endpoint_hold',SOURCE,26,27);s['selection']='installed_leaves_eased_open';s['note']='10f anticipation,27f hinge movement,50f open hold; waiting child matches next shot.'
  elif sid=='D34':
   add(6,'endpoint_hold',SOURCE,27,28);add(30,'motion',SOURCE,27,57);add(9,'endpoint_hold',SOURCE,56,57);add(60,'still',HOME,0,1);s['selection']='child_crossing_then_same_house_plate';s['note']='Readable walk samples gait seconds0-3 over30frames (~3.10x between samples), child scale.65; only threshold crossing shown; destination insert implies rest of journey.'
  elif sid=='D37':
   add(45,'still',MOTHER,0,1);s['selection']='native_latest_mother_welcome_crop';s['note']='Source PR37 response.png/frame95; exact same hair/creamV/purple appearance, no newly generated mouth/recognition footage.'
  else:
   add(16,'endpoint_hold',SOURCE,57,58);add(27,'motion',SOURCE,57,84);add(81,'endpoint_hold',SOURCE,83,84);s['selection']='actual_notebook_cover_closure';s['note']='Single inherited notebook body; hinged front cover closes in27f, subtle existing shoulder/head pivots, reflective endpoint hold.'
  s['immediate_selection']=s['selection'];assert cursor==b
 sources={p['source']for s in m['shots']for p in s['spans']};m['sources']={p:{'sha256':sha(p)}for p in sorted(sources)};m['runtime_by_kind']={k:{'frames':sum(p['output_end_frame']-p['output_start_frame']for s in m['shots']for p in s['spans']if p['kind']==k)}for k in ['proxy','still','endpoint_hold','motion']}
 for v in m['runtime_by_kind'].values():v.update(seconds=v['frames']/30,percent=v['frames']/3513*100)
 return m

def assemble():
 OUT.mkdir(parents=True,exist_ok=True);TMP.mkdir(parents=True,exist_ok=True);start=time.monotonic();commands=[]
 reuse=(ROOT/SOURCE).exists() and '--rebuild-source' not in sys.argv
 if not reuse:
  args=['ffmpeg','-y','-v','error','-framerate','30','-i',str(TMP/'frame-%05d.png'),'-vf',norm(540,960),'-frames:v','84',*codec(),'-movflags','+faststart',str(ROOT/SOURCE)];run(args);commands.append(args)
 m=build_map();(OUT/'edit-map.json').write_text(json.dumps(m,indent=2));segments=[]
 def packet(a,b):
  p=TMP/f'unchanged-{a}-{b}.mp4';args=['ffmpeg','-y','-v','error','-ss',f'{a/30:.12f}','-i',str(ROOT/BASE),'-map','0:v:0','-frames:v',str(b-a),'-c:v','copy','-an','-video_track_timescale','15360',str(p)];run(args);commands.append(args);segments.append((p,b-a))
 cursor=0
 for s in m['shots']:
  if s['id']not in ['D33','D34','D37','D38']:continue
  if s['start_frame']>cursor:packet(cursor,s['start_frame'])
  for i,p in enumerate(s['spans']):
   n=p['output_end_frame']-p['output_start_frame'];source=ROOT/p['source'];lo=p['source_start_frame'];hi=p['source_end_frame'];dest=TMP/f"{s['id']}-{i}.mp4"
   if source.suffix=='.png':inp=['-loop','1','-framerate','30','-i',str(source)];vf=norm()
   else:
    inp=['-i',str(source)];vf=f'trim=start_frame={lo}:end_frame={hi},setpts=PTS-STARTPTS'
    if p['kind']=='endpoint_hold':vf+=f',tpad=stop={n-1}:stop_mode=clone'
    vf+=','+norm()
   args=['ffmpeg','-y','-v','error',*inp,'-vf',vf+',setpts=N/(30*TB)','-frames:v',str(n),'-r','30',*codec(),str(dest)];run(args);commands.append(args);segments.append((dest,n))
  cursor=s['end_frame']
 if cursor<3513:packet(cursor,3513)
 assert sum(n for _,n in segments)==3513
 concat=TMP/'working.ffconcat';concat.write_text('ffconcat version 1.0\n'+''.join(f"file '{p}'\nduration {n/30:.12f}\n"for p,n in segments));partial=TMP/'working-edit.partial.mp4';args=['ffmpeg','-y','-v','error','-f','concat','-safe','0','-i',str(concat),'-c','copy','-an','-movflags','+faststart',str(partial)];run(args);commands.append(args);partial.replace(OUT/'working-edit.mp4');r=resource.getrusage(resource.RUSAGE_CHILDREN)
 (OUT/'assembly-receipt.json').write_text(json.dumps({'wallSeconds':time.monotonic()-start,'childUserCpuSeconds':r.ru_utime,'childSystemCpuSeconds':r.ru_stime,'maxChildRssKiB':r.ru_maxrss,'scope':'FFmpeg child totals/max individual RSS, not sum of tree peaks','uniqueNewWebGLFrames':84,'sourceArchiveReused':reuse,'unchangedFramesPacketCopied':3152,'commands':commands,'mp4Sha256':sha(str((OUT/'working-edit.mp4').relative_to(ROOT)))},indent=2))
if __name__=='__main__':assemble()
