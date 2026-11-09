from pathlib import Path
import json,subprocess,math,hashlib,time
from PIL import Image,ImageDraw,ImageFont
root=Path('renders/dice-town-animatic');out=Path('evidence/dice-town-animatic');p=json.load(open('stories/dice-town/Dice_Town_117s_Animatic_Plan.json'));capture=json.load(open(root/'capture.json'));assert len(capture['frames'])==76
font=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',13)
manifest=[];concat=['ffconcat version 1.0'];start=time.monotonic()
for shot in p['storyboard_shots']:
 a=math.ceil(shot['start_frame']/2);b=math.ceil(shot['end_frame']/2);mid=(a+b)//2
 entry={**shot,'proxy_start_frame':a,'proxy_end_frame':b,'boards':[]}
 for k,(lo,hi) in enumerate([(a,mid),(mid,b)]):
  file=f"{shot['id']}-{k}.png";im=Image.open(root/file).convert('RGB');d=ImageDraw.Draw(im);d.rectangle((0,0,360,39),fill='#15212a');d.text((6,4),f"{shot['id']}  {shot['camera_plan']}  [{k+1}/2]",font=font,fill='white');d.text((6,22),'STORYBOARD / PROXY PROPS',font=font,fill='#e4c184');im.save(root/('hold-'+file));concat += [f"file '{(root/('hold-'+file)).resolve()}'",'option framerate 15',f'duration {(hi-lo)/15:.12f}'];entry['boards'].append({'file':file,'proxy_start_frame':lo,'proxy_end_frame':hi,'placeholder':shot['scope'].startswith('NEW')})
 manifest.append(entry)
concat.append(concat[-3]);concat.append('option framerate 15');(root/'holds.ffconcat').write_text('\n'.join(concat)+'\n');video=out/'dice-town-animatic.mp4'
args=['ffmpeg','-y','-v','error','-f','concat','-safe','0','-i',str(root/'holds.ffconcat'),'-r','15','-frames:v','1757','-c:v','libx264','-threads','2','-pix_fmt','yuv420p','-vf','setsar=1','-crf','23','-movflags','+faststart','-an',str(video)];subprocess.run(args,check=True)
probe=json.loads(subprocess.check_output(['ffprobe','-v','error','-count_frames','-show_streams','-show_format','-of','json',str(video)]));s=probe['streams'];assert len(s)==1 and s[0]['codec_name']=='h264' and s[0]['nb_read_frames']=='1757' and s[0]['width']==360 and s[0]['height']==640;subprocess.run(['ffmpeg','-v','error','-i',str(video),'-f','null','-'],check=True)
board=Image.new('RGB',(720,1360),'#15212a');draw=ImageDraw.Draw(board)
for j,shot in enumerate(manifest):
 im=Image.open(root/f"hold-{shot['id']}-0.png").resize((120,213));x=j%6*120;y=j//6*194;board.paste(im.resize((100,178)),(x,y+15));draw.text((x,y),f"{shot['id']} {shot['start_frame']/30:.1f}s",fill='white')
board.save(out/'storyboard.jpg',quality=93)
(out/'shot-timing-manifest.json').write_text(json.dumps({'source30fpsFrames':3513,'proxyFrames':1757,'proxyFps':15,'proxyDuration':1757/15,'audioReferenceDuration':p['audio_duration_seconds'],'audioTouched':False,'rounding':'ceil(source frame / 2), max boundary shift 1/30s','shots':manifest},indent=2))
(out/'verification.json').write_text(json.dumps({'status':'PASS','probe':probe,'decode':'PASS','uniqueWebGLFrames':76,'reverseSamples':capture['reverseSamples'],'pageErrors':capture['errors'],'captureWallSeconds':capture['wallSeconds'],'encodeAndDecodeWallSeconds':time.monotonic()-start,'ffmpegArgs':args,'mp4Sha256':hashlib.sha256(video.read_bytes()).hexdigest()},indent=2))
(out/'capture.json').write_text(json.dumps(capture,indent=2))
