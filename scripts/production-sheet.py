"""Small actual-frame sheet plus a local all-frame review aid; no new images."""
import json, math, subprocess
from pathlib import Path
from PIL import Image, ImageDraw
root=Path('evidence/production')
manifest=json.loads((root/'manifest.json').read_text())
frames=root/'raw'/'frames'
def sheet(indices,path,cols,width,sources=None):
    height=round(width*1280/720);cell=height+24
    image=Image.new('RGB',(cols*width,math.ceil(len(indices)/cols)*cell),'white');draw=ImageDraw.Draw(image)
    for j,i in enumerate(indices):
        source=Image.open(sources[i] if sources else frames/f'frame-{i:04}.png').convert('RGB').resize((width,height),Image.Resampling.LANCZOS)
        x,y=(j%cols)*width,(j//cols)*cell;image.paste(source,(x,y))
        draw.text((x+4,y+height+4),f"#{i} {i/manifest['fps']:.2f}s {manifest['frames'][i]['shot']}",fill='black')
    image.save(path)
selected=[0,20,59,60,96,131,132,150,200]
decoded=root/'raw'/'decoded';decoded.mkdir(exist_ok=True)
selection='+'.join(f'eq(n,{i})' for i in selected)
subprocess.run(['ffmpeg','-y','-v','error','-i',str(root/'feasibility.mp4'),'-vf',f"select='{selection}'",'-fps_mode','vfr','-frames:v',str(len(selected)),str(decoded/'frame-%02d.png')],check=True)
sheet(selected,root/'contact-sheet.png',3,240,{i:decoded/f'frame-{j+1:02d}.png' for j,i in enumerate(selected)})
for start in range(0,manifest['frameCount'],30):
    sheet(list(range(start,min(start+30,manifest['frameCount']))),root/'raw'/f'review-{start//30:02}.png',6,180)
print('Saved compact 9-frame decoded-MP4 contact sheet and local review sheets covering every frame')
