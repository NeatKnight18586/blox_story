"""Compact evidence from genuine WebGL PNGs only; no synthetic avatar frames."""
import json, math
from pathlib import Path
from PIL import Image, ImageDraw
root=Path('evidence/calibration')
raw=root/'raw'
views=['side','threequarter']
def tile(view,gait,frame,size=(180,320)):
    image=Image.open(raw/f'{view}-{gait}-{frame:03}.png').convert('RGB')
    return image.resize(size,Image.Resampling.LANCZOS)
def pair(view,frame):
    canvas=Image.new('RGB',(360,344),'white');draw=ImageDraw.Draw(canvas)
    for i,gait in enumerate(['baseline','readable']):
        canvas.paste(tile(view,gait,frame),(180*i,24))
        draw.text((180*i+5,5),f'{gait}  {frame/30:.3f}s',fill='black')
    return canvas
# Four phases show alternating support, swing and recovery in both views.
comparison=Image.new('RGB',(4*360,2*344),'white')
for row,view in enumerate(views):
    for col,frame in enumerate([0,4,9,18]):comparison.paste(pair(view,frame),(col*360,row*344))
comparison.save(root/'comparison.png')
for view in views:
    frames=[pair(view,i) for i in range(72)]
    # GIF delay granularity is 10 ms: 30/40/30 ms totals 100 ms per 3 frames.
    frames[0].save(root/f'comparison-{view}.gif',save_all=True,append_images=frames[1:],duration=[30,40,30]*24,loop=0,optimize=True)
    # All-frame inspection sheets remain local, rather than adding redundant
    # near-identical PNGs to Git. Every frame is also in the comparison GIF.
    for start in range(0,73,20):
        selected=list(range(start,min(start+20,73)))
        sheet=Image.new('RGB',(4*360,math.ceil(len(selected)/4)*344),'white')
        for index,frame in enumerate(selected):sheet.paste(pair(view,frame),((index%4)*360,(index//4)*344))
        sheet.save(raw/f'review-{view}-{start//20}.png')
mobile=Image.new('RGB',(780,717),'white');draw=ImageDraw.Draw(mobile)
for i,gait in enumerate(['baseline','readable']):
    mobile.paste(Image.open(raw/f'mobile-{gait}.png').convert('RGB'),(390*i,24));draw.text((390*i+8,5),f'{gait} / same camera / 0.600s',fill='black')
mobile.save(root/'comparison-mobile.png')
print('Comparison PNGs, full-cycle GIFs and local all-frame review sheets created')
