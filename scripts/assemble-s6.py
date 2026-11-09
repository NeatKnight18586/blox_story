"""FFmpeg-only S4 review assembly. Never invokes WebGL or changes narration."""
import argparse,json,subprocess,hashlib,time,os
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
def run(args):return subprocess.run(args,check=True,capture_output=True).stdout
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def probe(p):return json.loads(run(['ffprobe','-v','error','-count_frames','-show_streams','-show_format','-of','json',str(p)]))
def main():
 p=argparse.ArgumentParser();p.add_argument('--wav',type=Path);a=p.parse_args();started=time.monotonic()
 r=json.loads((ROOT/'renders/names100-s6/last-run.json').read_text());assert r['status']=='PASS' and r['frameCount']==1641
 source=ROOT/'renders/names100-s6'/r['result']/'movie.mp4';assert sha(source)==r['mp4Sha256']
 out=ROOT/'renders/names100-s6-review'
 for parent in [out,*out.parents]:assert not parent.is_symlink()
 out.mkdir(exist_ok=True)
 cuts=[s['start']/30 for s in r['shots'][1:]];silent=out/'silent-captioned.mp4';pending=out/'silent.pending.mp4'
 filters="settb=1/1000,setpts=trunc(N*1000/30)+1,ass=stories/names100/counter/generated/p5-editorial.ass,ass=stories/names100/captions/generated/S4.ass,settb=1/30,setpts=N,setsar=1"
 cmd=['ffmpeg','-y','-v','error','-i',str(source),'-vf',filters,'-frames:v','1641','-r','30','-c:v','libx264','-threads','2','-preset','medium','-crf','20','-profile:v','main','-level:v','3.1','-pix_fmt','yuv420p','-g','30','-force_key_frames',','.join(map(str,cuts)),'-movflags','+faststart','-an',str(pending)]
 run(cmd);os.replace(pending,silent);result={'status':'ENCODED_PENDING_PLAYBACK','cleanSourceSha256':sha(source),'new3dRenders':0,'silent':{'file':str(silent.relative_to(ROOT)),'sha256':sha(silent),'probe':probe(silent)},'sourceResolution':[720,1280],'reviewResolution':[720,1280],'upscaled3d':False,'commands':[cmd],'narration':'AUDIO BLOCKED: not supplied'}
 if a.wav:
  assert sha(a.wav)=='3d5e0a116971d3d17a7c3adac79423e443d63040b2120be7562a0660f22b4ae4'
  voiced=out/'narrated-captioned.mp4';pending=out/'narrated.pending.mp4'
  command=['ffmpeg','-y','-v','error','-i',str(silent),'-i',str(a.wav),'-map','0:v:0','-map','1:a:0','-c:v','copy','-c:a','aac','-b:a','192k','-movflags','+faststart',str(pending)]
  run(command);os.replace(pending,voiced);result['voiced']={'file':str(voiced.relative_to(ROOT)),'sha256':sha(voiced),'probe':probe(voiced)};result['commands'].append([*command[:command.index(str(a.wav))],'<private original WAV>',*command[command.index(str(a.wav))+1:]])
  result['narration']='Original WAV at t=0, unchanged source; AAC encode only, no trim/stretch/regeneration. Human listening pending.';result['wavSha256']=sha(a.wav)
 for item in [result['silent'],*([result['voiced']] if 'voiced' in result else [])]:
  pr=item['probe'];v=next(s for s in pr['streams'] if s['codec_type']=='video');assert v['codec_name']=='h264' and v['pix_fmt']=='yuv420p' and v['width']==720 and v['height']==1280 and int(v['nb_read_frames'])==1641
  run(['ffmpeg','-v','error','-i',str(ROOT/item['file']),'-f','null','-']);item['fullDecodePass']=True
 result['wallSeconds']=time.monotonic()-started;(ROOT/'evidence/names100-s6/assembly.json').write_text(json.dumps(result,indent=2)+'\n');print('PASS FFmpeg-only silent and original-narration assembly; pending real playback/creative review')
if __name__=='__main__':main()
