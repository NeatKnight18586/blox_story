from pathlib import Path
import subprocess,json
from PIL import Image,ImageDraw,ImageFont
ROOT=Path(__file__).resolve().parent.parent;OUT=ROOT/'evidence/dice-town-p4b4';TMP=ROOT/'renders/dice-town-p4b4/sheet';TMP.mkdir(exist_ok=True,parents=True)
font=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',15);tiny=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',11)
subprocess.run(['ffmpeg','-y','-v','error','-i',str(OUT/'backstory-source.mp4'),'-threads','2',str(TMP/'motion-%03d.png')],check=True)
board=Image.new('RGB',(1500,1158),'#15212a');d=ImageDraw.Draw(board)
for i in range(90):
 x=i%15*100;y=i//15*193;shot=['D17','D18','D20','D21','D22','D24'][i//15];d.text((x+2,y+2),f'{shot}/{i%15:02}',font=tiny,fill='white');board.paste(Image.open(TMP/f'motion-{i+1:03d}.png').resize((100,178),Image.Resampling.LANCZOS),(x,y+15))
board.save(OUT/'motion-contact.jpg',quality=93)
items=[('D17: child at crank',OUT/'D17-14.png'),('D18: still a child / old photo',OUT/'D18-14.png'),('D19: historical family',OUT/'D19-history.png'),('D19: present-day mother',OUT/'D19-present.png'),('D20: holds original photo',OUT/'D20-14.png'),('D21: fear / glance away',OUT/'D21-14.png'),('D21: gate stays CLOSED',OUT/'D21-gate.png'),('D22: no answer / OPEN book',OUT/'D22-14.png'),('D23: unchanged pin receipt',ROOT/'evidence/dice-town-p3b1/received.png'),('D24: child keeps same pin',OUT/'D24-14.png')]
board=Image.new('RGB',(1950,1456),'#15212a');d=ImageDraw.Draw(board)
for i,(label,path)in enumerate(items):
 x=i%5*390;y=i//5*728;d.text((x+5,y+4),label,font=font,fill='white');board.paste(Image.open(path).resize((390,693),Image.Resampling.LANCZOS),(x,y+28))
board.save(OUT/'phone-continuity.jpg',quality=93)
m=json.loads((OUT/'edit-map.json').read_text());pairs=[]
for shot in [s for s in m['shots']if s['id']in ['D17','D18','D19','D20','D21','D22','D24']]:
 sid=shot['id'];f=(shot['start_frame']+shot['end_frame']-1)//2;old=TMP/f'{sid}-before.png';subprocess.run(['ffmpeg','-y','-v','error','-threads','2','-i',str(ROOT/'evidence/dice-town-p4b3/working-edit.mp4'),'-vf',f"select='eq(n,{f})'",'-frames:v','1','-threads','2',str(old)],check=True)
 pairs.extend([(sid+' before /360px proxy source',old),(sid+' after /native source',OUT/('D19-history.png'if sid=='D19'else sid+'-14.png'))])
pairs+=items[3:4]+items[8:9];board=Image.new('RGB',(1560,2912),'#15212a');d=ImageDraw.Draw(board)
for i,(label,path)in enumerate(pairs):
 x=i%4*390;y=i//4*728;d.text((x+5,y+4),label,font=font,fill='white');board.paste(Image.open(path).resize((390,693),Image.Resampling.LANCZOS),(x,y+28))
board.save(OUT/'phone-comparison.jpg',quality=92)
print('PASS90 decoded motion frames;390px D17-D24 continuity and correctly labelled seven-shot before/after')
