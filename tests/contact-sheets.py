"""Arrange actual WebGL screenshots; labels identify frame/time, never alter renders."""
import json, math
from PIL import Image, ImageDraw
from pathlib import Path
root=Path('evidence/f2a')
manifest=json.loads((root/'manifest.json').read_text())
for clip in manifest['clips']:
    for start in range(0,len(clip['frames']),24):
        frames=clip['frames'][start:start+24]
        sheet=Image.new('RGB',(6*240,math.ceil(len(frames)/6)*384),'white')
        draw=ImageDraw.Draw(sheet)
        for index,frame in enumerate(frames):
            x,y=(index%6)*240,(index//6)*384
            sheet.paste(Image.open(frame['path']).convert('RGB'),(x,y))
            draw.text((x+4,y+362),f"{clip['id']} #{frame['frame']} {frame['time']:.3f}s",fill='black')
        sheet.save(root/f"sheet-{clip['id']}-{start//24:02}.png")
print('Contact sheets generated from every captured frame')
