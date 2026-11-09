from PIL import Image,ImageDraw,ImageFont
from pathlib import Path
out=Path('evidence/dice-town-p3b1');names=['rest','contact','disabled','seated','removed','transfer','received']
b=Image.new('RGB',(1170,2280),'#17232b');d=ImageDraw.Draw(b);font=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',16)
for i,n in enumerate(names):
 w=390;h=693;x=i%3*w;y=i//3*744;im=Image.open(out/(n+'.png'));assert im.size==(720,1280);b.paste(im.resize((w,h),Image.Resampling.LANCZOS),(x,y+40));d.text((x+5,y+10),n.upper(),font=font,fill='white')
d.text((5,2250),'Actual WebGL · labels on review sheet only · no episode export',font=font,fill='white');b.save(out/'phone-review.jpg',quality=93)
# Complete motion contact sheets from cached genuine low-resolution frames.
for mode,count in [('mechanism',48),('handoff',72)]:
 c=Image.new('RGB',(720,((count+11)//12)*123),'#17232b');dr=ImageDraw.Draw(c)
 for f in range(count):
  im=Image.open(Path('renders/dice-town-p3b1')/mode/f'frame-{f:05}.png');x=f%12*60;y=f//12*123;c.paste(im.resize((60,107)),(x,y+16));dr.text((x+2,y+1),str(f),fill='white')
 c.save(out/(mode+'-contact.jpg'),quality=92)
