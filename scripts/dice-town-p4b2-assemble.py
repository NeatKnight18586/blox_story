"""Incremental mystery edit: one wobble capture, two edit crops, four shot repairs."""
from pathlib import Path
import json,subprocess,time,resource,hashlib,copy,sys
ROOT=Path(__file__).resolve().parent.parent;OUT=ROOT/'evidence/dice-town-p4b2';TMP=ROOT/'renders/dice-town-p4b2';BASE='evidence/dice-town-p4b1/working-edit.mp4'
WIDE='evidence/dice-town-p4b2/wobble-source.mp4';INSERT='evidence/dice-town-p4b2/wobble-insert.mp4';CRANK='evidence/dice-town-p4b2/crank-contact.mp4'
RECIPES={INSERT:{'source':WIDE,'frames':[0,24],'crop':[216,384,126,426]},CRANK:{'source':'evidence/dice-town-p3b1/mechanism.mp4','frames':[0,18],'crop':[144,256,40,320]}}
def run(args):subprocess.run(args,check=True,cwd=ROOT)
def sha(path):return hashlib.sha256((ROOT/path).read_bytes()).hexdigest()
def codec():return ['-c:v','libx264','-threads','2','-preset','medium','-crf','18','-profile:v','main','-level:v','3.1','-pix_fmt','yuv420p','-color_primaries','bt709','-color_trc','bt709','-colorspace','bt709','-color_range','tv','-video_track_timescale','15360','-g','60','-an']
def norm(w=360,h=640):return f'scale={w}:{h}:flags=lanczos:out_color_matrix=bt709:out_range=tv,setsar=1,format=yuv420p'
def build_map():
 m=copy.deepcopy(json.loads((ROOT/'evidence/dice-town-p4b1/edit-map.json').read_text()));m['parent_edit']=BASE;m['source_clock']='All38 original end-exclusive slots unchanged; onlyD11,D13,D16,D28 repaired.';m['inherited_die_limitation']='D28 impossible5/2 adjacency resolved with complete canonical die. Existing D15 footage unchanged; D16 only implies its connection to the new exterior contact.';m['proxy_mapping']='Unchanged proxy compiled material packet copied from committed P4B1; original mapping retained in span provenance.';m['media_recipes']=RECIPES
 for s in m['shots']:
  sid=s['id'];a=s['start_frame'];b=s['end_frame']
  if sid not in ['D11','D13','D16','D28']:
   for p in s['spans']:
    old=copy.deepcopy(p);p.clear();p.update(output_start_frame=old['output_start_frame'],output_end_frame=old['output_end_frame'],kind=old['kind'],source=BASE,source_start_frame=old['output_start_frame'],source_end_frame=old['output_end_frame'],sampling='direct_30fps',source_fps=30,provenance=old)
   s['immediate_selection']='unchanged_committed_P4B1';continue
  s['spans']=[];s['final_approved']=False;cursor=a
  def add(length,kind,source,lo,hi):
   nonlocal cursor
   s['spans'].append({'output_start_frame':cursor,'output_end_frame':cursor+length,'kind':kind,'source':source,'source_start_frame':lo,'source_end_frame':hi,'sampling':'direct_30fps'if kind=='motion'else'hold'});cursor+=length
  if sid=='D11':
   add(10,'endpoint_hold',WIDE,0,1);add(45,'motion',WIDE,0,45);add(38,'endpoint_hold',WIDE,44,45);s['selection']='single_supported_wobble';s['note']='One45-frame clockwise deflection with real endpoint holds; control system not shown.'
  elif sid=='D13':
   add(14,'endpoint_hold',INSERT,0,1);add(24,'motion',INSERT,0,24);add(71,'endpoint_hold','evidence/dice-town-p4b2/non-six.png',0,1);s['selection']='same_wobble_crop_then_native_outcome';s['note']='Same captured frames0-23 cropped, then native frame44 outcome. No second unique motion.'
  elif sid=='D16':
   add(8,'endpoint_hold',CRANK,0,1);add(18,'motion',CRANK,0,18);add(8,'endpoint_hold',CRANK,17,18);add(12,'motion',INSERT,12,24);add(21,'motion',WIDE,24,45);add(43,'endpoint_hold',WIDE,44,45);s['selection']='existing_drive_cutaway_then_same_contact_and_deflection';s['note']='Crank/coupling only; inherited far-tip geometry/whole-die trajectory intentionally offscreen and not claimed to match exactly.'
  else:
   add(84,'still','evidence/dice-town-p4b2/D28-five.png',0,1);s['selection']='corrected_native_five_up';s['note']='Legal5-up,1/4adjacent,2bottom; static Leo staging opens view of all4 side dots.'
  s['immediate_selection']=s['selection'];assert cursor==b
 sources={p['source']for s in m['shots']for p in s['spans']};m['sources']={p:{'sha256':sha(p)}for p in sorted(sources)};m['runtime_by_kind']={k:{'frames':sum(p['output_end_frame']-p['output_start_frame']for s in m['shots']for p in s['spans']if p['kind']==k)}for k in ['proxy','still','endpoint_hold','motion']}
 for v in m['runtime_by_kind'].values():v.update(seconds=v['frames']/30,percent=v['frames']/3513*100)
 return m

def assemble():
 OUT.mkdir(parents=True,exist_ok=True);TMP.mkdir(parents=True,exist_ok=True);start=time.monotonic();commands=[]
 reuse=(ROOT/WIDE).exists() and '--rebuild-source' not in sys.argv
 if not reuse:
  args=['ffmpeg','-y','-v','error','-framerate','30','-i',str(TMP/'frame-%05d.png'),'-vf',norm(540,960),'-frames:v','45',*codec(),'-movflags','+faststart',str(ROOT/WIDE)];run(args);commands.append(args)
 for path,recipe in RECIPES.items():
  lo,hi=recipe['frames'];crop=':'.join(map(str,recipe['crop']));args=['ffmpeg','-y','-v','error','-threads','2','-i',str(ROOT/recipe['source']),'-vf',f'trim=start_frame={lo}:end_frame={hi},setpts=PTS-STARTPTS,crop={crop},{norm()}','-frames:v',str(hi-lo),*codec(),str(ROOT/path)];run(args);commands.append(args)
 m=build_map();(OUT/'edit-map.json').write_text(json.dumps(m,indent=2));segments=[]
 def packet(a,b):
  p=TMP/f'unchanged-{a}-{b}.mp4';args=['ffmpeg','-y','-v','error','-ss',f'{a/30:.12f}','-i',str(ROOT/BASE),'-map','0:v:0','-frames:v',str(b-a),'-c:v','copy','-an','-video_track_timescale','15360',str(p)];run(args);commands.append(args);segments.append((p,b-a))
 cursor=0
 for s in m['shots']:
  if s['id']not in ['D11','D13','D16','D28']:continue
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
 (OUT/'assembly-receipt.json').write_text(json.dumps({'wallSeconds':time.monotonic()-start,'childUserCpuSeconds':r.ru_utime,'childSystemCpuSeconds':r.ru_stime,'maxChildRssKiB':r.ru_maxrss,'scope':'FFmpeg child totals/max individual RSS, not sum of tree peaks','uniqueNewWebGLFrames':45,'sourceArchiveReused':reuse,'unchangedFramesPacketCopied':3117,'commands':commands,'mp4Sha256':sha(str((OUT/'working-edit.mp4').relative_to(ROOT)))},indent=2))
if __name__=='__main__':assemble()
