"""Native-source backstory repair:90 bounded action frames, justified historical/current cutaway."""
from pathlib import Path
import json,subprocess,time,resource,hashlib,copy,sys
ROOT=Path(__file__).resolve().parent.parent;OUT=ROOT/'evidence/dice-town-p4b4';TMP=ROOT/'renders/dice-town-p4b4';BASE='evidence/dice-town-p4b3/working-edit.mp4'
SOURCE='evidence/dice-town-p4b4/backstory-source.mp4'
PAST='evidence/dice-town-p4b4/D19-past-edit.mp4';NOW='evidence/dice-town-p4b4/D19-now-edit.mp4';GATE='evidence/dice-town-p4b4/D21-gate.png'
RECIPES={PAST:{'source':'evidence/dice-town-p4b4/D19-history.png','frames':54},NOW:{'source':'evidence/dice-town-p4b4/D19-present.png','frames':66}}
CHANGED=['D17','D18','D19','D20','D21','D22','D24']
def run(args):subprocess.run(args,check=True,cwd=ROOT)
def sha(path):return hashlib.sha256((ROOT/path).read_bytes()).hexdigest()
def codec():return ['-c:v','libx264','-threads','2','-preset','medium','-crf','18','-profile:v','main','-level:v','3.1','-pix_fmt','yuv420p','-color_primaries','bt709','-color_trc','bt709','-colorspace','bt709','-color_range','tv','-video_track_timescale','15360','-g','60','-an']
def norm(w=360,h=640):return f'scale={w}:{h}:flags=lanczos:out_color_matrix=bt709:out_range=tv,setsar=1,format=yuv420p'
def build_map():
 m=copy.deepcopy(json.loads((ROOT/'evidence/dice-town-p4b3/edit-map.json').read_text()));m['parent_edit']=BASE;m['source_clock']='All38 original end-exclusive slots unchanged; onlyD17-D22 andD24 replaced with scene-specific native-source material.';m['proxy_mapping']='Unchanged proxy compiled material packet copied from committed P4B3; source provenance retained.'
 m['backstory_recipes']={'source_archive':{'path':SOURCE,'size':[720,1280],'frames':90,'ranges':{k:[i*15,(i+1)*15]for i,k in enumerate(['D17','D18','D20','D21','D22','D24'])}},'D19_editorial':RECIPES,'historical_photo':'Same mother/Pip native1024x1024 WebGL portrait; canonical mother-left/child-right/creamV/rust motif carefully derived. New source only; D27/D30 unchanged.','no_unrelated_substitutions':True,'no_proxy_upscaling':True}
 for s in m['shots']:
  sid=s['id'];a=s['start_frame'];b=s['end_frame']
  if sid not in CHANGED:
   for p in s['spans']:
    old=copy.deepcopy(p);p.clear();p.update(output_start_frame=old['output_start_frame'],output_end_frame=old['output_end_frame'],kind=old['kind'],source=BASE,source_start_frame=old['output_start_frame'],source_end_frame=old['output_end_frame'],sampling='direct_30fps',source_fps=30,provenance=old)
   s['immediate_selection']='unchanged_committed_P4B3';continue
  s['spans']=[];s['final_approved']=False;cursor=a
  def add(length,kind,source,lo,hi,sampling=None):
   nonlocal cursor
   s['spans'].append({'output_start_frame':cursor,'output_end_frame':cursor+length,'kind':kind,'source':source,'source_start_frame':lo,'source_end_frame':hi,'sampling':sampling or ('direct_30fps'if kind=='motion'else'hold')});cursor+=length
  if sid=='D19':
   add(54,'still',PAST,0,54,'direct_30fps');add(66,'still',NOW,0,66,'direct_30fps');s['selection']='native_historical_photo_to_present_mother';s['note']='2D2% push over native-source stills. Present mother is a specified editorial cutaway, never a photo held by Pip. No new mother motion or future photograph.'
  elif sid=='D21':
   add(18,'endpoint_hold',SOURCE,45,46);add(15,'motion',SOURCE,45,60);add(19,'endpoint_hold',SOURCE,59,60);add(45,'still',GATE,0,1);add(40,'endpoint_hold',SOURCE,59,60);s['selection']='worried_child_closed_gate_worried_return';s['note']='Established native grounded gate stays closed; fear insert not an opening or floating panel.'
  else:
   lo,pre,post={'D17':(0,8,30),'D18':(15,15,65),'D20':(30,8,35),'D22':(60,22,55),'D24':(75,15,65)}[sid]
   add(pre,'endpoint_hold',SOURCE,lo,lo+1);add(15,'motion',SOURCE,lo,lo+15);add(post,'endpoint_hold',SOURCE,lo+14,lo+15)
   s['selection']={'D17':'child_at_actual_crank_guilty_glance','D18':'child_studies_original_historical_photo','D20':'photo_insert_small_lift_and_tilt','D22':'uncertain_leo_lowers_open_notebook','D24':'received_pin_lowered_with_child_palm'}[sid]
   s['note']={'D17':'Existing child.65 scale on work step, rigid palm under existing grip. Same pin remains installed.','D18':'Same old photo below face, dark-haired younger mother plus unchanged child. No future-age transformation.','D20':'Tighter native camera shows child/photo; minimal tilt and eyeline, no new hand rig.','D22':'Existing notebook remains visibly open at fixed-2rad cover; final closure reserved forD38.','D24':'Exact D23-end pin world pose at first frame; same pin attached to same receiving palm. Leo departs offscreen by editorial implication; no walking track.'}[sid]
  s['immediate_selection']=s['selection'];assert cursor==b
 sources={p['source']for s in m['shots']for p in s['spans']};m['sources']={p:{'sha256':sha(p)}for p in sorted(sources)}
 m['native_inputs']={p:{'sha256':sha(p)}for p in ['evidence/dice-town-p4b4/historical-portrait.png','evidence/dice-town-p4b4/D19-history.png','evidence/dice-town-p4b4/D19-present.png',GATE]}
 m['runtime_by_kind']={k:{'frames':sum(p['output_end_frame']-p['output_start_frame']for s in m['shots']for p in s['spans']if p['kind']==k)}for k in ['proxy','still','endpoint_hold','motion']}
 for v in m['runtime_by_kind'].values():v.update(seconds=v['frames']/30,percent=v['frames']/3513*100)
 return m

def assemble():
 OUT.mkdir(parents=True,exist_ok=True);TMP.mkdir(parents=True,exist_ok=True);start=time.monotonic();commands=[]
 reuse=(ROOT/SOURCE).exists() and '--rebuild-source' not in sys.argv
 if not reuse:
  args=['ffmpeg','-y','-v','error','-framerate','30','-i',str(TMP/'frame-%05d.png'),'-vf',norm(720,1280),'-frames:v','90',*codec(),'-movflags','+faststart',str(ROOT/SOURCE)];run(args);commands.append(args)
 # Gentle image-plane editorial moves from native720px sources, never360px proxies.
 for path,recipe in RECIPES.items():
  n=recipe['frames'];vf=f"zoompan=z='1+0.02*on/{n-1}':x='(iw-iw/zoom)*0.4':y='(ih-ih/zoom)*0.35':d={n}:s=360x640:fps=30,"+norm()
  args=['ffmpeg','-y','-v','error','-i',str(ROOT/recipe['source']),'-vf',vf,'-frames:v',str(n),*codec(),str(ROOT/path)];run(args);commands.append(args)
 m=build_map();(OUT/'edit-map.json').write_text(json.dumps(m,indent=2));segments=[]
 def packet(a,b):
  p=TMP/f'unchanged-{a}-{b}.mp4';args=['ffmpeg','-y','-v','error','-ss',f'{a/30:.12f}','-i',str(ROOT/BASE),'-map','0:v:0','-frames:v',str(b-a),'-c:v','copy','-an','-video_track_timescale','15360',str(p)];run(args);commands.append(args);segments.append((p,b-a))
 cursor=0
 for s in m['shots']:
  if s['id']not in CHANGED:continue
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
 (OUT/'assembly-receipt.json').write_text(json.dumps({'wallSeconds':time.monotonic()-start,'childUserCpuSeconds':r.ru_utime,'childSystemCpuSeconds':r.ru_stime,'maxChildRssKiB':r.ru_maxrss,'scope':'FFmpeg child totals/max individual RSS, not sum of tree peaks','uniqueNewWebGLMotionFrames':90,'sourceArchiveReused':reuse,'unchangedFramesPacketCopied':2863,'commands':commands,'mp4Sha256':sha(str((OUT/'working-edit.mp4').relative_to(ROOT)))},indent=2))
if __name__=='__main__':assemble()
