"""Evidence boards from actual WebGL/source/decoded-film pixels; labels outside images."""
from pathlib import Path
import subprocess,json
from PIL import Image,ImageDraw,ImageFont
ROOT=Path(__file__).resolve().parent.parent;OUT=ROOT/'evidence/dice-town-p4b3';TMP=ROOT/'renders/dice-town-p4b3/sheet';TMP.mkdir(parents=True,exist_ok=True)
font=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',16)
small=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',11)
# Decode committed motion archive, rather than pass off raw PNGs as movie verification.
subprocess.run(['ffmpeg','-y','-v','error','-i',str(OUT/'ending-source.mp4'),'-threads','2',str(TMP/'motion-%03d.png')],check=True)
board=Image.new('RGB',(1440,1638),'#15212a');d=ImageDraw.Draw(board)
for i in range(84):
 x=i%12*120;y=i//12*234;shot='D33' if i<27 else 'D34' if i<57 else 'D38';f=i if i<27 else i-27 if i<57 else i-57
 d.text((x+2,y+2),f'{shot} / {f:02}',font=small,fill='white');board.paste(Image.open(TMP/f'motion-{i+1:03d}.png').resize((120,213),Image.Resampling.LANCZOS),(x,y+18))
board.save(OUT/'motion-contact.jpg',quality=91)
# Four editorial comparisons, each at real390px phone width. Old pixels are360px
# working-edit sources enlarged and accurately labelled; new stills are native.
rows=[('D33',2941,['gate-closed','gate-mid','gate-open']),('D34',3037,['Pip-before','Pip-after','home']),('D37',3366,['mother-close','mother-close','mother-close']),('D38',3450,['book-open','book-mid','book-closed'])]
board=Image.new('RGB',(1560,2920),'#15212a');d=ImageDraw.Draw(board)
for row,(shot,frame,names)in enumerate(rows):
 old=TMP/f'{shot}-before.png';subprocess.run(['ffmpeg','-y','-v','error','-threads','2','-i',str(ROOT/'evidence/dice-town-p4b2/working-edit.mp4'),'-vf',f"select='eq(n,{frame})'",'-frames:v','1','-threads','2',str(old)],check=True)
 for col,(im,label)in enumerate([(Image.open(old),f'{shot} P4B2 /360px source')]+[(Image.open(OUT/(n+'.png')),n+(' /source crop'if shot=='D37'else' /native'))for n in names]):
  x=col*390;y=row*730;d.text((x+6,y+6),label,font=font,fill='white');board.paste(im.resize((390,693),Image.Resampling.LANCZOS),(x,y+30))
board.save(OUT/'phone-comparison.jpg',quality=92)
# Smaller single review board, actual native poses+mother crop (no new renders).
board=Image.new('RGB',(1170,2184),'#15212a');d=ImageDraw.Draw(board)
for i,n in enumerate(['gate-closed','gate-mid','gate-open','Pip-before','Pip-after','home','book-open','mother-close','book-closed']):
 x=i%3*390;y=i//3*728;d.text((x+5,y+5),n,font=font,fill='white');board.paste(Image.open(OUT/(n+'.png')).resize((390,693),Image.Resampling.LANCZOS),(x,y+28))
board.save(OUT/'phone-review.jpg',quality=92)
print('PASS all84 decoded motion frames on contact sheet; labelled390px comparison against parent edit;9-pose phone review')
