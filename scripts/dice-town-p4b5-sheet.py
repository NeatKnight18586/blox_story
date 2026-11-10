from pathlib import Path
import subprocess,json
from PIL import Image,ImageDraw,ImageFont
R=Path(__file__).resolve().parent.parent;O=R/'evidence/dice-town-p4b5';T=R/'renders/dice-town-p4b5/sheet';T.mkdir(parents=True,exist_ok=True);frames=R/'renders/dice-town-p4b5/native-check'
if len(list(frames.glob('*.png')))!=195:
 frames=T/'frames';frames.mkdir(parents=True,exist_ok=True);subprocess.run(['ffmpeg','-y','-v','error','-threads','2','-i',str(O/'opening-source.mkv'),'-threads','2',str(frames/'%03d.png')],check=True)
# This is a native captured D02 frame reused by D10, never a new camera render.
Image.open(frames/'036.png').save(O/'D10-reuse-35.png')
font=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',15);small=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',10)
ranges=[('D02',42),('D05',15),('D06',12),('D07',12),('D08',24),('D09',36),('D12',12),('D14',42)];labels=[(shot,f)for shot,n in ranges for f in range(n)];board=Image.new('RGB',(1350,2314),'#15212a');d=ImageDraw.Draw(board)
for i,(shot,f)in enumerate(labels):
 x=i%15*90;y=i//15*178;d.text((x+2,y+2),f'{shot}/{f:02}',font=small,fill='white');board.paste(Image.open(frames/f'{i+1:03d}.png').resize((90,160),Image.Resampling.LANCZOS),(x,y+17))
board.save(O/'action-contact.jpg',quality=93)
items=[('D02: people rise / result3','D02-41'),('D05: anchored Leo','D05-14'),('D06: harness to tower','D06-11'),('D07: gravity contingency plan','D07-11'),('D08: physical result1','one-0'),('D08: cup / planted feet','D08-23'),('D09: physical result2','two-0'),('D09: backward walk','D09-35'),('D10: same lift / endpoint35','D10-reuse-35'),('D12: tally / three near-sixes','D12-11'),('D14: reclip at fixed ring','D14-17'),('D14: boots descend through rim','D14-41')]
board=Image.new('RGB',(1170,2912),'#15212a');d=ImageDraw.Draw(board)
for i,(label,name)in enumerate(items):
 x=i%3*390;y=i//3*728;d.text((x+4,y+4),label,font=font,fill='white');board.paste(Image.open(O/(name+'.png')).resize((390,693),Image.Resampling.LANCZOS),(x,y+28))
board.save(O/'phone-storyboard.jpg',quality=93)
m=json.loads((O/'edit-map.json').read_text());pairs=[]
for sid,name in [('D02','D02-41'),('D05','D05-14'),('D06','D06-11'),('D07','D07-11'),('D08','D08-23'),('D09','D09-35'),('D10','D10-reuse-35'),('D12','D12-11'),('D14','D14-41')]:
 s=next(s for s in m['shots']if s['id']==sid);f=(s['start_frame']+s['end_frame']-1)//2;before=T/(sid+'-before.png');subprocess.run(['ffmpeg','-y','-v','error','-threads','2','-i',str(R/'evidence/dice-town-p4b4/working-edit.mp4'),'-vf',f"select='eq(n,{f})'",'-frames:v','1','-threads','2',str(before)],check=True);pairs.extend([(sid+' BEFORE /360px proxy',before),(sid+' AFTER /native720 source',O/(name+'.png'))])
board=Image.new('RGB',(1560,3640),'#15212a');d=ImageDraw.Draw(board)
for i,(label,path)in enumerate(pairs):
 x=i%4*390;y=i//4*728;d.text((x+4,y+4),label,font=font,fill='white');board.paste(Image.open(path).resize((390,693),Image.Resampling.LANCZOS),(x,y+28))
board.save(O/'phone-comparison.jpg',quality=92)
# Dedicated frame-by-frame gait panel keeps the feet larger than the full bank.
board=Image.new('RGB',(960,1824),'#15212a');d=ImageDraw.Draw(board)
for f in range(36):
 x=f%6*160;y=f//6*304;d.text((x+3,y+3),f'D09 /{f:02}',font=small,fill='white');board.paste(Image.open(frames/f'{106+f:03d}.png').resize((160,284),Image.Resampling.LANCZOS),(x,y+17))
board.save(O/'backward-contact.jpg',quality=93)
print('PASS195 decoded native action frames,390px nine-shot story/physical-rule boards, before/after and36-frame backward contact')
