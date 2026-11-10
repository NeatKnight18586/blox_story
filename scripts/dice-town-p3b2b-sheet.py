from pathlib import Path
from PIL import Image,ImageDraw,ImageFont
out=Path('evidence/dice-town-p3b2b');b=Image.new('RGB',(1560,770),'#17232b');d=ImageDraw.Draw(b);font=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',16)
for i,(name,label) in enumerate([('anticipation','D35 · 0.00s · uncertain'),('recognition','D35 · 1.33s · recognition'),('response','D35 · 3.17s · welcome'),('chair','D36 · continuity reference')]):
 im=Image.open(out/(name+'.png'));assert im.size==(720,1280);b.paste(im.resize((390,693),Image.Resampling.LANCZOS),(i*390,40));d.text((i*390+6,10),label,font=font,fill='white')
d.text((6,744),'Actual WebGL · 390px panels · review labels outside imagery only',font=font,fill='white');b.save(out/'phone-review.jpg',quality=93)
c=Image.new('RGB',(1080,1620),'#17232b');draw=ImageDraw.Draw(c)
for f in range(105):
 im=Image.open(Path('renders/dice-town-p3b2b')/f'frame-{f:05}.png');x=f%12*90;y=f//12*180;c.paste(im.resize((90,160)),(x,y+20));draw.text((x+2,y+3),str(f),fill='white')
c.save(out/'all-105-frames.jpg',quality=92)
