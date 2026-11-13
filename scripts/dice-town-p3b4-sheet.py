from pathlib import Path
from PIL import Image,ImageDraw,ImageFont
out=Path('evidence/dice-town-p3b4');font=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',18)
for family,names in [('plaza',['D01','D28']),('gate',['closed','open','D38'])]:
 b=Image.new('RGB',(780,733*len(names)),'#17232b');d=ImageDraw.Draw(b)
 for row,name in enumerate(names):
  for col,mode in enumerate(['before','after']):
   im=Image.open(out/f'{mode}-{name}.png');assert im.size==(720,1280);x=col*390;y=row*733;b.paste(im.resize((390,693),Image.Resampling.LANCZOS),(x,y+35));d.text((x+6,y+7),f'{mode.upper()} / {name}',font=font,fill='white')
 b.save(out/f'{family}-comparison.jpg',quality=93)
