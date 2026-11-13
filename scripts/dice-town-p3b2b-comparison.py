from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
out=Path('evidence/dice-town-p3b2b')
board=Image.new('RGB',(1560,1490),'#17232b');draw=ImageDraw.Draw(board)
font=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',16)
for row,(folder,label) in enumerate([('dice-town-p3b2','PR35'),('dice-town-p3b2b','CORRECTED')]):
 for col,name in enumerate(['anticipation','recognition','response','chair']):
  im=Image.open(Path('evidence')/folder/(name+'.png'));assert im.size==(720,1280)
  x,y=col*390,row*745
  board.paste(im.resize((390,693),Image.Resampling.LANCZOS),(x,y+35))
  draw.text((x+5,y+8),label+' / '+name,font=font,fill='white')
board.save(out/'comparison.jpg',quality=93)
