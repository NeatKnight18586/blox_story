"""Native opening/investigation repair:195 lossless source frames, D10 reuses D02."""
from pathlib import Path
import json,subprocess,time,resource,hashlib,copy,sys
ROOT=Path(__file__).resolve().parent.parent;OUT=ROOT/'evidence/dice-town-p4b5';TMP=ROOT/'renders/dice-town-p4b5';BASE='evidence/dice-town-p4b4/working-edit.mp4'
SOURCE='evidence/dice-town-p4b5/opening-source.mkv'
CHANGED=['D02','D05','D06','D07','D08','D09','D10','D12','D14']
RANGES={'D02':[0,42],'D05':[42,57],'D06':[57,69],'D07':[69,81],'D08':[81,105],'D09':[105,141],'D12':[141,153],'D14':[153,195]}
def run(args):subprocess.run(args,check=True,cwd=ROOT)
def sha(path):return hashlib.sha256((ROOT/path).read_bytes()).hexdigest()
def codec():return ['-c:v','libx264','-threads','2','-preset','medium','-crf','18','-profile:v','main','-level:v','3.1','-pix_fmt','yuv420p','-color_primaries','bt709','-color_trc','bt709','-colorspace','bt709','-color_range','tv','-video_track_timescale','15360','-g','60','-an']
def norm(w=360,h=640):return f'scale={w}:{h}:flags=lanczos:out_color_matrix=bt709:out_range=tv,setsar=1,format=yuv420p'
def build_map():
 m=copy.deepcopy(json.loads((ROOT/'evidence/dice-town-p4b4/edit-map.json').read_text()));m['parent_edit']=BASE;m['source_clock']='All38 original end-exclusive cuts unchanged; onlythe9 final proxy slots replaced with their actual directed actions.';m['proxy_mapping']='No original storyboard proxy remains; prior mapping retained in nested provenance for unchanged shots.'
 capture=json.loads((ROOT/'evidence/dice-town-p4b5/motion-capture.json').read_text())
 m['opening_recipes']={'capture_accounting':{'retained_source_samples':195,'generated_forward_samples':capture.get('generatedForwardMotionFramesAcrossRuns',195),'repair_note':'evidence/dice-town-p4b5/D09_REPAIR_NOTE.md'},'source_archive':{'path':SOURCE,'codec':'FFV1 level3 BGR0 lossless','size':[720,1280],'frames':195,'ranges':RANGES},'D10':{'source_action':'D02','source_frames':[12,36],'newWebGLFrames':0,'note':'Different temporal endpoint35, not41; full silhouettes retained, no extra camera/crowd capture.'},'D14':{'reclip_source_frames':[153,171],'descent_source_frames':[171,195],'note':'A held reclip and cut imply moving into the aperture; no whole trip or physically continuous rope-length claim.'},'native_for_future_HD':True,'no_storyboard_upscaling':True}
 for s in m['shots']:
  sid=s['id'];a=s['start_frame'];b=s['end_frame']
  if sid not in CHANGED:
   for p in s['spans']:
    old=copy.deepcopy(p);p.clear();p.update(output_start_frame=old['output_start_frame'],output_end_frame=old['output_end_frame'],kind=old['kind'],source=BASE,source_start_frame=old['output_start_frame'],source_end_frame=old['output_end_frame'],sampling='direct_30fps',source_fps=30,provenance=old)
   s['immediate_selection']='unchanged_committed_P4B4';continue
  s['spans']=[];s['final_approved']=False;cursor=a
  def add(length,kind,source,lo,hi):
   nonlocal cursor
   s['spans'].append({'output_start_frame':cursor,'output_end_frame':cursor+length,'kind':kind,'source':source,'source_start_frame':lo,'source_end_frame':hi,'sampling':'direct_30fps'if kind=='motion'else'hold'});cursor+=length
  if sid=='D02':
   add(6,'endpoint_hold',SOURCE,0,1);add(42,'motion',SOURCE,0,42);add(55,'endpoint_hold',SOURCE,41,42);s['selection']='two_staggered_actual_resident_lifts';s['note']='Existing P2A lifts on grounded plaza; short anticipation then full rise and real apex hold; physical die3.'
  elif sid=='D08':
   add(10,'still','evidence/dice-town-p4b5/one-0.png',0,1);add(12,'endpoint_hold',SOURCE,81,82);add(24,'motion',SOURCE,81,105);add(16,'endpoint_hold',SOURCE,104,105);s['selection']='native_one_then_cup_lift_planted_baker';s['note']='Actual complete die1 insert; native cup rises over real stall while actual human feet remain grounded.'
  elif sid=='D09':
   add(9,'still','evidence/dice-town-p4b5/two-0.png',0,1);add(36,'motion',SOURCE,105,141);add(4,'endpoint_hold',SOURCE,140,141);s['selection']='native_two_then_true_backward_walk';s['note']='Existing readable gait: rootZ and leg/arm pitch mirrored, explicit forward clock, material contact anchors reflected; no reverse-video sliding.'
  elif sid=='D10':
   add(24,'motion',SOURCE,12,36);add(27,'endpoint_hold',SOURCE,35,36);s['selection']='D02_lift_reprise_different_endpoint';s['note']='Same characters/die3; source12-35 reused, with a different endpoint fromD02. No additional native capture.'
  elif sid=='D14':
   add(12,'endpoint_hold',SOURCE,153,154);add(18,'motion',SOURCE,153,171);add(16,'endpoint_hold',SOURCE,170,171);add(24,'motion',SOURCE,171,195);add(51,'endpoint_hold',SOURCE,194,195);s['selection']='same_tether_reclip_then_lower_into_real_aperture';s['note']='Actual clip approaches installed post ring; held contact, then cut implies step into opening, actual legs descend through real cut ground. Remaining trip offscreen beforeD15.'
  else:
   lo,pre,n,post={'D05':(42,8,15,22),'D06':(57,35,12,75),'D07':(69,15,12,100),'D12':(141,18,12,74)}[sid]
   add(pre,'endpoint_hold',SOURCE,lo,lo+1);add(n,'motion',SOURCE,lo,lo+n);add(post,'endpoint_hold',SOURCE,lo+n-1,lo+n)
   s['selection']={'D05':'anchored_leo_against_floating_resident','D06':'real_harness_rope_tower_contact_insert','D07':'open_notebook_gravity_plan','D12':'open_notebook_tallies_three_near_sixes'}[sid]
   s['note']={'D05':'Leo pulled.12units but restrained by constant-length diagonal tether to installed tower post; background resident rises independently.','D06':'Both real connections in frame, slight tension settle, no neck/face crossing.','D07':'Small original notebook on forearm, native ink gravity-contingency diagram; open cover.','D12':'Different real page, repeated six-dot wobble sketches/tallies and tiny indication gesture; no floating text board or early closure.'}[sid]
  s['immediate_selection']=s['selection'];assert cursor==b
 sources={p['source']for s in m['shots']for p in s['spans']};m['sources']={p:{'sha256':sha(p)}for p in sorted(sources)}
 m['opening_native_inputs']={p:{'sha256':sha(p)}for p in ['evidence/dice-town-p4b5/one-0.png','evidence/dice-town-p4b5/two-0.png']}
 m['runtime_by_kind']={k:{'frames':sum(p['output_end_frame']-p['output_start_frame']for s in m['shots']for p in s['spans']if p['kind']==k)}for k in ['proxy','still','endpoint_hold','motion']}
 for v in m['runtime_by_kind'].values():v.update(seconds=v['frames']/30,percent=v['frames']/3513*100)
 return m

def assemble():
 OUT.mkdir(parents=True,exist_ok=True);TMP.mkdir(parents=True,exist_ok=True);start=time.monotonic();commands=[]
 reuse=(ROOT/SOURCE).exists() and '--rebuild-source' not in sys.argv
 if not reuse:
  # Lossless RGB archive retains every native motion frame; not a future-HD
  # source derived from the360px working movie. PNG sequence stays ignored.
  args=['ffmpeg','-y','-v','error','-framerate','30','-i',str(TMP/'frame-%05d.png'),'-frames:v','195','-c:v','ffv1','-level','3','-coder','1','-context','1','-g','1','-slicecrc','1','-threads','2','-pix_fmt','bgr0','-an',str(ROOT/SOURCE)];run(args);commands.append(args)
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
 (OUT/'assembly-receipt.json').write_text(json.dumps({'wallSeconds':time.monotonic()-start,'childUserCpuSeconds':r.ru_utime,'childSystemCpuSeconds':r.ru_stime,'maxChildRssKiB':r.ru_maxrss,'scope':'FFmpeg child totals/max individual RSS, not sum of tree peaks','retainedNativeMotionFrames':195,'generatedForwardMotionFrames':json.loads((ROOT/'evidence/dice-town-p4b5/motion-capture.json').read_text()).get('generatedForwardMotionFramesAcrossRuns',195),'reusedD02MotionFramesInD10':24,'sourceArchiveReused':reuse,'unchangedFramesPacketCopied':2729,'commands':commands,'mp4Sha256':sha(str((OUT/'working-edit.mp4').relative_to(ROOT)))},indent=2))
if __name__=='__main__':assemble()
