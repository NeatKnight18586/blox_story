from PIL import Image,ImageDraw,ImageFont
from pathlib import Path
out=Path('evidence/dice-town-p3b3');names=['brace','grip','rise','worn','gap','separated']
b=Image.new('RGB',(1170,1466),'#17232b');d=ImageDraw.Draw(b)
font=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',18)
for i,n in enumerate(names):
 im=Image.open(out/(n+'.png'));assert im.size==(720,1280)
 x=i%3*390;y=i//3*733;b.paste(im.resize((390,693),Image.Resampling.LANCZOS),(x,y+35));d.text((x+8,y+7),n,font=font,fill='white')
b.save(out/'phone-review.jpg',quality=93)
if Path('renders/dice-town-p3b3/frame-00095.png').exists():
 b=Image.new('RGB',(1080,1440),'#17232b');d=ImageDraw.Draw(b)
 for f in range(96):
  im=Image.open(Path('renders/dice-town-p3b3')/f'frame-{f:05}.png');x=f%12*90;y=f//12*180;b.paste(im.resize((90,160)),(x,y+20));d.text((x+2,y+2),str(f),fill='white')
 b.save(out/'all-96-frames.jpg',quality=91)
