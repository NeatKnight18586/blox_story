from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
import json,shutil
root=Path('renders/dice-town-p2a-native');cache=next(root.glob('.p1-cache/*/frame-00000.png')).parent
out=Path('evidence/dice-town-p2a');board=Image.new('RGB',(1080,1800),'#17232b');draw=ImageDraw.Draw(board)
font=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',10)
for i in range(120):
 image=Image.open(cache/f'frame-{i:05}.png');assert image.size==(720,1280)
 x=i%12*90;y=i//12*180
 draw.text((x+2,y+3),f'{i:03} {i/30:.2f}s',font=font,fill='#ffcf8b' if i>=75 else 'white')
 board.paste(image.resize((90,160),Image.Resampling.LANCZOS),(x,y+20))
board.save(out/'all-120-frames.jpg',quality=91)
for i in [0,14,55,75,90,119]:shutil.copyfile(cache/f'frame-{i:05}.png',out/f'native-{i:03}.png')
# Larger representative sheet for mobile expression/staging inspection.
b=Image.new('RGB',(1080,665),'#17232b');d=ImageDraw.Draw(b)
for j,i in enumerate([0,14,55,75,90,119]):
 im=Image.open(out/f'native-{i:03}.png');b.paste(im.resize((180,320),Image.Resampling.LANCZOS),(j*180,25));d.text((j*180+5,5),f'{i}: {i/30:.2f}s',fill='white')
b.crop((0,0,1080,345)).save(out/'motion-sheet.jpg',quality=93)
