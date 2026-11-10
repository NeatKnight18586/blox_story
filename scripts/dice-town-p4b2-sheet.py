from pathlib import Path
from PIL import Image,ImageDraw,ImageFont
import subprocess
out=Path('evidence/dice-town-p4b2');tmp=Path('renders/dice-town-p4b2');font=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',18)
items=[('D11 approach','approach'),('D11 near six','near-six'),('D11 kick','kick'),('D11 four outcome','non-six'),('D13 native insert','D13-clue'),('D16 old native crop','D16-native-source-crop'),('D28 legal five','D28-five')]
b=Image.new('RGB',(1560,1466),'#17232b');d=ImageDraw.Draw(b)
for i,(label,name)in enumerate(items):
 im=Image.open(out/(name+'.png'));x=i%4*390;y=i//4*733;b.paste(im.resize((390,693),Image.Resampling.LANCZOS),(x,y+35));d.text((x+5,y+7),label,font=font,fill='white')
b.save(out/'native-phone-review.jpg',quality=93)
b=Image.new('RGB',(1080,1225),'#17232b');d=ImageDraw.Draw(b)
for f in range(45):
 im=Image.open(tmp/f'frame-{f:05}.png');x=f%9*120;y=f//9*245;b.paste(im.resize((120,213)),(x,y+25));d.text((x+4,y+5),str(f),fill='white')
b.save(out/'all-45-frames.jpg',quality=92)
def filmframe(source,f,name):
 p=tmp/name;subprocess.run(['ffmpeg','-y','-v','error','-threads','2','-i',source,'-vf',f"select='eq(n,{f})'",'-frames:v','1',str(p)],check=True);return Image.open(p)
b=Image.new('RGB',(780,2932),'#17232b');d=ImageDraw.Draw(b)
for row,(shot,f)in enumerate([('D11',815),('D13',1016),('D16',1357),('D28',2626)]):
 for col,(label,source)in enumerate([('P4B1','evidence/dice-town-p4b1/working-edit.mp4'),('P4B2','evidence/dice-town-p4b2/working-edit.mp4')]):
  im=filmframe(source,f,f'{shot}-{col}.png');x=col*390;y=row*733;b.paste(im.resize((390,693),Image.Resampling.LANCZOS),(x,y+35));d.text((x+5,y+7),f'{shot} /{label} 360px edit',font=font,fill='white')
b.save(out/'before-after.jpg',quality=93)
b=Image.new('RGB',(1170,733),'#17232b');d=ImageDraw.Draw(b)
for i,(f,label)in enumerate([(1357,'D16 crank /old source'),(1366,'contact /same wobble'),(1384,'deflection /same wobble')]):
 im=filmframe('evidence/dice-town-p4b2/working-edit.mp4',f,f'cause-{i}.png');x=i*390;b.paste(im.resize((390,693),Image.Resampling.LANCZOS),(x,35));d.text((x+5,7),label,font=font,fill='white')
b.save(out/'D16-cause-and-effect.jpg',quality=93)
