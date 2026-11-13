from pathlib import Path
from PIL import Image,ImageDraw,ImageFont
import subprocess
out=Path('evidence/dice-town-p4b1');font=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',18)
items=[('D25 /2','face-2'),('D26 /5','face-5'),('D27 /withdraw','withdrawn'),('D28 /reused','../dice-town-p3b4/after-D28'),('D29 /near-six','six-near'),('D30 /refusal','refusal'),('D31 /incoming pose','roll-cut'),('D32 /six','six-settled')]
b=Image.new('RGB',(1560,1466),'#17232b');d=ImageDraw.Draw(b)
for i,(shot,name)in enumerate(items):
 im=Image.open(out/(name+'.png'));x=i%4*390;y=i//4*733;b.paste(im.resize((390,693),Image.Resampling.LANCZOS),(x,y+35));d.text((x+6,y+7),shot+' /native source',font=font,fill='white')
b.save(out/'native-phone-review.jpg',quality=93)
b=Image.new('RGB',(1950,733),'#17232b');d=ImageDraw.Draw(b)
for i,value in enumerate([1,2,4,3,5]):
 im=Image.open(out/f'face-{value}.png');b.paste(im.resize((390,693),Image.Resampling.LANCZOS),(i*390,35));d.text((i*390+6,7),'Morning '+str(i+1)+' / '+str(value),font=font,fill='white')
b.save(out/'five-mornings.jpg',quality=93)
board=Image.new('RGB',(780,2932),'#17232b');draw=ImageDraw.Draw(board)
for row,(shot,f)in enumerate([('D27',2519),('D29',2692),('D30',2751),('D32',2873)]):
 for col,(label,source)in enumerate([('P4A /360px proxy','evidence/dice-town-p4a/working-edit.mp4'),('P4B1 /360px edit','evidence/dice-town-p4b1/working-edit.mp4')]):
  dest=Path('renders/dice-town-p4b1')/f'comparison-{shot}-{col}.png';subprocess.run(['ffmpeg','-y','-v','error','-threads','2','-i',source,'-vf',f"select='eq(n,{f})'",'-frames:v','1',str(dest)],check=True);im=Image.open(dest);x=col*390;y=row*733;board.paste(im.resize((390,693),Image.Resampling.LANCZOS),(x,y+35));draw.text((x+5,y+7),shot+' '+label,font=font,fill='white')
board.save(out/'before-after.jpg',quality=93)
b=Image.new('RGB',(1440,1080),'#17232b');d=ImageDraw.Draw(b)
for row,(shot,count)in enumerate([('D27',54),('D29',36),('D30',42),('D31',42)]):
 for i in range(12):
  f=round(i*(count-1)/11);im=Image.open(Path('renders/dice-town-p4b1')/shot/f'frame-{f:05}.png');x=i*120;y=row*270;b.paste(im.resize((120,213)),(x,y+30));d.text((x+3,y+5),f'{shot}/{f}',fill='white')
b.save(out/'motion-contact.jpg',quality=92)
