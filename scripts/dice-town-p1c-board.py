"""Preserved native images at 390px phone width; no source images modified."""
from PIL import Image, ImageDraw, ImageFont
board=Image.new('RGB',(1170,1518),'#17232b')
draw=ImageDraw.Draw(board)
font=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',17)
for column,(stage,folder) in enumerate([('P1','dice-town-p1'),('P1B','dice-town-p1b'),('P1C','dice-town-p1c')]):
 for row,frame in enumerate(['A','B']):
  image=Image.open(f'evidence/{folder}/{frame}.png');assert image.size==(720,1280)
  y=row*744
  draw.text((column*390+8,y+10),f'{stage} · {"Plaza" if frame=="A" else "Leo close-up"}',font=font,fill='white')
  board.paste(image.resize((390,693),Image.Resampling.LANCZOS),(column*390,y+40))
draw.text((8,1494),'Actual native WebGL sources · 390px wide per panel · framing/staging differ',font=font,fill='white')
board.save('evidence/dice-town-p1c/comparison.jpg',quality=90)
