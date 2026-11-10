"""Bounded evidence edit. No WebGL, new animation, audio or native master."""
from pathlib import Path
import json,subprocess,time,hashlib,resource,sys
ROOT=Path(__file__).resolve().parent.parent
OUT=ROOT/'evidence/dice-town-p4a';TMP=ROOT/'renders/dice-town-p4a'
PROXY='evidence/dice-town-animatic/dice-town-animatic.mp4'

def run(args):
 subprocess.run(args,check=True,cwd=ROOT)

def digest(path):return hashlib.sha256((ROOT/path).read_bytes()).hexdigest()

def build_map():
 timeline=json.loads((ROOT/'evidence/dice-town-animatic/shot-timing-manifest.json').read_text())
 plan=json.loads((ROOT/'stories/dice-town/Dice_Town_117s_Animatic_Plan.json').read_text())
 assert [(s['id'],s['start_frame'],s['end_frame'])for s in timeline['shots']]==[(s['id'],s['start_frame'],s['end_frame'])for s in plan['storyboard_shots']]
 motion={'D03':('dice-town-p3b3/baker.mp4',0,57,6),'D04':('dice-town-p3b3/baker.mp4',57,96,0),'D15':('dice-town-p3b1/mechanism.mp4',0,48,16),'D23':('dice-town-p3b1/handoff.mp4',0,72,18),'D35':('dice-town-p3b2b/recognition.mp4',0,105,10)}
 stills={'D01':'dice-town-p3b4/after-D01.png','D28':'dice-town-p3b4/after-D28.png','D36':'dice-town-p3b2b/chair.png','D38':'dice-town-p3b4/after-D38.png'}
 boundary_file=OUT/'proxy-boundaries.json'
 if not boundary_file.exists():run([sys.executable,'scripts/dice-town-p4a-proxy-boundaries.py'])
 boundary_receipt=json.loads(boundary_file.read_text());assert boundary_receipt['input_sha256']==digest(PROXY),'Proxy changed: remeasure boundaries'
 decoded={r['id']:r for r in boundary_receipt['shots']}
 shots=[];cursor=0
 for s in timeline['shots']:
  sid=s['id'];a=s['start_frame'];b=s['end_frame'];n=b-a;assert a==cursor;cursor=b
  row={'id':sid,'start_frame':a,'end_frame':b,'frame_count':n,'original_intent':s['visual_action'],'final_approved':False,'spans':[]}
  def span(lo,hi,kind,source,start,end,**extra):
   assert hi>lo
   row['spans'].append({'output_start_frame':lo,'output_end_frame':hi,'kind':kind,'source':source,'source_start_frame':start,'source_end_frame':end,**extra})
  if sid in motion:
   source,lo,hi,pre=motion[sid];source='evidence/'+source;post=n-pre-(hi-lo);assert post>=0
   row['selection']='proof_motion_with_endpoint_holds';row['note']='Unretimed original30fps proof; real endpoints held, no generated motion.'
   if pre:span(a,a+pre,'endpoint_hold',source,lo,lo+1)
   span(a+pre,a+pre+hi-lo,'proof_motion',source,lo,hi)
   if post:span(b-post,b,'endpoint_hold',source,hi-1,hi)
  elif sid in stills:
   row['selection']='native_still_hold';row['note']={'D01':'Rule3 readable, but no new opening animation.','D28':'Environment/anticipation view; tighter final storytelling may be needed.','D36':'Chair continuity insert, static.','D38':'Location continuity only: notebook-closing action is absent.'}[sid]
   span(a,b,'still','evidence/'+stills[sid],0,1)
  elif sid=='D33':
   row['selection']='two_static_gate_states';row['note']='Hard cut closed→open at2928, not a hinge/lighting animation.'
   span(a,a+30,'still','evidence/dice-town-p3b4/after-closed.png',0,1)
   span(a+30,b,'still','evidence/dice-town-p3b4/after-open.png',0,1)
  else:
   lo=decoded[sid]['decoded_start'];hi=decoded[sid]['decoded_end'];row['selection']='unfinished_proxy';row['note']='Original15fps labeled storyboard proxy, NOT FINAL. No missing action invented.'
   span(a,b,'proxy',PROXY,lo,hi,declared_proxy_start=s['proxy_start_frame'],declared_proxy_end=s['proxy_end_frame'],source_fps=15,output_fps=30,formula='source_start_frame + min(floor(local_output_frame/2), source_count-1)',boundary_shift_frames30=2*lo-a,expanded_source_frames=2*(hi-lo),tail_adjustment_frames=n-2*(hi-lo))
  at=a
  for part in row['spans']:assert part['output_start_frame']==at;at=part['output_end_frame']
  assert at==b
  shots.append(row)
 assert cursor==3513 and len(shots)==38
 totals={k:sum(p['output_end_frame']-p['output_start_frame']for s in shots for p in s['spans']if p['kind']==k)for k in ['proxy','still','endpoint_hold','proof_motion']}
 sources={p['source']for s in shots for p in s['spans']}
 return {'fps':30,'width':360,'height':640,'frame_count':3513,'duration_seconds':117.1,'silent':True,'audio_touched':False,'private_audio_reference_seconds':117.098231,'audio_delta_seconds':117.1-117.098231,'source_clock':'Original end-exclusive30fps frame indices; never cumulative segment durations.','proxy_mapping':'Use measured Dxx header-verified shot ranges; the inherited proxy switches one15fps frame before declared boundaries. Duplicate each original15fps frame twice, then trim/last-frame-pad to authoritative30fps slot. Explicit per-shot source offsets; output clocks unchanged.','sources':{s:{'sha256':digest(s)}for s in sorted(sources)},'runtime_by_kind':{k:{'frames':v,'seconds':v/30,'percent':100*v/3513}for k,v in totals.items()},'shots':shots}

def assemble():
 OUT.mkdir(exist_ok=True,parents=True);TMP.mkdir(exist_ok=True,parents=True)
 start=time.monotonic();m=build_map();(OUT/'edit-map.json').write_text(json.dumps(m,indent=2));commands=[];segments=[]
 for s in m['shots']:
  spans=s['spans'];n=s['frame_count'];first=spans[0];source=ROOT/first['source'];kind=s['selection'];filters=[]
  if '--repair-proxy' in sys.argv and kind!='unfinished_proxy':
   dest=TMP/(s['id']+'.mp4');assert dest.exists();segments.append(dest);continue
  if kind=='proof_motion_with_endpoint_holds':
   actual=next(x for x in spans if x['kind']=='proof_motion');lo=actual['source_start_frame'];hi=actual['source_end_frame'];pre=actual['output_start_frame']-s['start_frame'];post=s['end_frame']-actual['output_end_frame']
   inp=['-i',str(source)];filters=[f'trim=start_frame={lo}:end_frame={hi}','setpts=PTS-STARTPTS',f'tpad=start={pre}:stop={post}:start_mode=clone:stop_mode=clone']
  elif kind=='unfinished_proxy':
   lo=first['source_start_frame'];hi=first['source_end_frame'];inp=['-i',str(source)];filters=[f'trim=start_frame={lo}:end_frame={hi}','setpts=PTS-STARTPTS','tpad=stop=1:stop_mode=clone','fps=30:round=near','tpad=stop=2:stop_mode=clone']
  elif kind=='two_static_gate_states':
   inp=['-loop','1','-framerate','30','-i',str(source),'-loop','1','-framerate','30','-i',str(ROOT/spans[1]['source'])]
  else:inp=['-loop','1','-framerate','30','-i',str(source)]
  dest=TMP/(s['id']+'.mp4');segments.append(dest)
  norm='scale=360:640:flags=lanczos:out_color_matrix=bt709:out_range=tv,setsar=1,format=yuv420p'
  if kind=='two_static_gate_states':
   a=spans[0]['output_end_frame']-spans[0]['output_start_frame'];b=n-a
   filt=['-filter_complex',f'[0:v]trim=end_frame={a},setpts=PTS-STARTPTS,{norm}[a];[1:v]trim=end_frame={b},setpts=PTS-STARTPTS,{norm}[b];[a][b]concat=n=2:v=1:a=0,trim=end_frame={n},setpts=N/(30*TB)[v]','-map','[v]']
  else:filt=['-vf',','.join(filters+[norm,f'trim=end_frame={n}','setpts=N/(30*TB)'])]
  args=['ffmpeg','-y','-v','error','-threads','2',*inp,*filt,'-frames:v',str(n),'-r','30','-c:v','libx264','-threads','2','-preset','medium','-crf','20','-profile:v','main','-level:v','3.1','-pix_fmt','yuv420p','-color_primaries','bt709','-color_trc','bt709','-colorspace','bt709','-color_range','tv','-video_track_timescale','15360','-g','60','-an',str(dest)]
  before=time.monotonic();run(args);commands.append({'shot':s['id'],'wallSeconds':time.monotonic()-before,'args':args});print(s['id'],n,kind,flush=True)
 concat=TMP/'segments.ffconcat';concat.write_text('ffconcat version 1.0\n'+''.join("file '"+str(p)+"'\nduration "+format(s['frame_count']/30,'.12f')+"\n"for p,s in zip(segments,m['shots'])))
 partial=TMP/'working-edit.partial.mp4';args=['ffmpeg','-y','-v','error','-f','concat','-safe','0','-i',str(concat),'-c','copy','-an','-movflags','+faststart',str(partial)];run(args)
 # Stream copy keeps one encode per source segment, no second full movie encode.
 partial.replace(OUT/'working-edit.mp4');r=resource.getrusage(resource.RUSAGE_CHILDREN)
 (OUT/'assembly-receipt.json').write_text(json.dumps({'status':'ASSEMBLED_PENDING_VERIFICATION','assemblyWallSeconds':time.monotonic()-start,'childUserCpuSeconds':r.ru_utime,'childSystemCpuSeconds':r.ru_stime,'maxChildRssKiB':r.ru_maxrss,'resourceScope':'FFmpeg subprocess child totals/max child RSS; not summed process-tree peak','sourcesChecked':len(m['sources']),'proxyOnlyRepair':'--repair-proxy' in sys.argv,'segmentCommands':commands,'concatArgs':args,'outputSha256':digest('evidence/dice-town-p4a/working-edit.mp4')},indent=2))
if __name__=='__main__':assemble()
