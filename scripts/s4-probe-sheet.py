import sys,importlib.util,json
from pathlib import Path
from PIL import Image,ImageDraw
sys.dont_write_bytecode=True
root=Path.cwd();s=importlib.util.spec_from_file_location('counter',root/'scripts/counter-overlay.py');m=importlib.util.module_from_spec(s);s.loader.exec_module(m)
raw=root/'renders/names100-s4-probes';r=json.loads((root/'evidence/names100-s4/probes.json').read_text());board=Image.new('RGB',(5*180,4*344),(20,28,35));d=ImageDraw.Draw(board)
for i,c in enumerate(r['checks']):
 g=c['globalFrame'];im=Image.open(raw/f'{g}.png').resize((720,1280),Image.Resampling.LANCZOS);im.save(raw/f'{g}-up.png');m.composite(raw/f'{g}-up.png',raw/f'{g}-text.png',g,root/'stories/names100/counter/generated/p5-editorial.ass',True,0,'S4');im=Image.open(raw/f'{g}-text.png').convert('RGB').resize((180,320),Image.Resampling.LANCZOS);x=i%5*180;y=i//5*344;board.paste(im,(x,y+24));d.text((x+4,y+5),f'g{g} / {c["storyShot"]}',fill='white')
board.save(root/'evidence/names100-s4/probe-board.png')
