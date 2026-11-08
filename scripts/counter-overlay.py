"""Small counter compositor: existing native-clock values + editable ASS style.
No scene import, narration processing or 3D rendering occurs here.
"""
import argparse, json, math, subprocess
from pathlib import Path
from PIL import Image,ImageDraw,ImageFont
ROOT=Path(__file__).resolve().parents[1]

def sample(style, point):
    visible=point['shot'] in style['show'];opacity=1.0 if visible else 0.0
    fade=style['fadeOut']
    if visible and point['shot']==fade['shot']:
        opacity=min(1.0,max(0.0,(point['shotEnd']-point['frame'])/fade['frames']))
    return {**point,'visible':visible,'opacity':opacity,'position':style['positions'].get(point['shot'],style['defaultPosition']),'label':visible and point['shot'] in style['labelOn']}

def stamp(frame):
    cs=math.floor(frame*100/30+1e-8);h,rem=divmod(cs,360000);m,rem=divmod(rem,6000);sec,cs=divmod(rem,100)
    return f'{h}:{m:02}:{sec:02}.{cs:02}'

def generate(style,clock,file):
    assert clock['fps']==30 and clock['frameCount']==len(clock['frames'])
    assert style['alignment']==8 and not any(c in style['labelText'] for c in '{}\\')
    assert (style['width'],style['height'])==(720,1280)
    font=ImageFont.truetype(style['fontFile'],style['numberSize'])
    for p in clock['frames']:
        s=sample(style,p);x,y=s['position']
        assert x-font.getlength(str(s['value']))/2>=40 and x+font.getlength(str(s['value']))/2<620 and 40<=y<800
    header=f'''[Script Info]
ScriptType: v4.00+
PlayResX: 720
PlayResY: 1280
WrapStyle: 2
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Number,{style['font']},{style['numberSize']},{style['fill']},{style['fill']},{style['edge']},&H70000000,-1,0,0,0,100,100,0,0,1,{style['glyphKeyline']},{style['shadow']},{style['alignment']},0,0,0,0,1
Style: Label,{style['font']},{style['labelSize']},{style['fill']},{style['fill']},{style['edge']},&H70000000,-1,0,0,0,100,100,0,0,1,0.5,0.5,{style['alignment']},0,0,0,0,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
'''
    spans=[];start=0;previous=None
    def key(s):return (s['shot'],s['actor'],s['value'],s['visible'],s['opacity'],tuple(s['position']),s['label'])
    for g in range(clock['frameCount']+1):
        now=sample(style,clock['frames'][g]) if g<clock['frameCount'] else None
        if previous is not None and (now is None or key(now)!=key(previous)):
            if previous['visible']:spans.append({**previous,'frame':start,'start':start,'end':g})
            start=g
        previous=now
    lines=[]
    for s in spans:
        x,y=s['position'];alpha=round((1-s['opacity'])*255)
        tag=f'{{\\an8\\pos({x},{y})\\alpha&H{alpha:02X}&}}'
        lines.append(f"Dialogue: 0,{stamp(s['start'])},{stamp(s['end'])},Number,,0,0,0,,{tag}{s['value']}")
        if s['label']:
            tag=f'{{\\an8\\pos({x},{y+style["labelOffsetY"]})\\alpha&H{alpha:02X}&}}'
            lines.append(f"Dialogue: 0,{stamp(s['start'])},{stamp(s['end'])},Label,,0,0,0,,{tag}{style['labelText']}")
    file.parent.mkdir(parents=True,exist_ok=True);file.write_text(header+'\n'.join(lines)+'\n');return spans

def composite(source,dest,g,ass=None,caption=False):
    # Image input timebase is explicitly1/30; setpts adds INTEGER native frames.
    filters=[f'setpts=PTS+{g}']
    if ass:filters.append(f"ass=filename='{ass}'")
    if caption:
        filters.extend([f'setpts=PTS-1490',f"ass=filename='{ROOT}/stories/names100/captions/generated/C.ass'"])
    subprocess.run(['ffmpeg','-y','-v','error','-framerate','30','-i',str(source),'-vf',','.join(filters),'-frames:v','1','-pix_fmt','rgba',str(dest)],check=True)

def boards(out):
    gs=[145,850,1248,1528,1529];w=180;h=320;board=Image.new('RGB',(len(gs)*w,2*(h+32)),(20,28,35));draw=ImageDraw.Draw(board)
    for col,g in enumerate(gs):
        for row,kind in enumerate(['before','editorial']):
            file=out/f'{kind}-{g}.png'
            with Image.open(file) as im:board.paste(im.convert('RGB').resize((w,h),Image.Resampling.LANCZOS),(col*w,row*(h+32)+32))
            draw.text((col*w+6,row*(h+32)+7),f'{"Legacy" if row==0 else "Editorial"} g{g}',fill='white')
    board.save(out/'counter-comparison.png')
    gs=[700,1392,1628];w=270;h=480;board=Image.new('RGB',(3*w,h+40),(20,28,35));draw=ImageDraw.Draw(board)
    for col,(g,name) in enumerate(zip(gs,['Bedroom / ghost','Sunrise / reunion','Forgotten Eli'])):
        with Image.open(out/f'clean-{g}.png') as im:board.paste(im.convert('RGB').resize((w,h),Image.Resampling.LANCZOS),(col*w,40))
        draw.text((col*w+6,6),f'{name} g{g}',fill='white');draw.text((col*w+6,22),'Native720x1280 WebGL, reduced for board',fill='white')
    board.save(out/'native-look-board.png')

def main():
    p=argparse.ArgumentParser();p.add_argument('--style',type=Path,default=ROOT/'stories/names100/counter/minimal-editorial.json');p.add_argument('--ass-only',action='store_true');a=p.parse_args()
    out=ROOT/'evidence/names100-p4';style=json.loads(a.style.read_text());clock=json.loads((out/'counter-clock.json').read_text());ass=ROOT/'stories/names100/counter/generated/minimal-editorial.ass';spans=generate(style,clock,ass)
    (out/'counter-events.json').write_text(json.dumps(spans,indent=2)+'\n')
    if a.ass_only:return
    for g in [145,850,1248,1528,1529]:
        legacy=ROOT/f'renders/names100-p4-baseline/legacy-{g}.png'
        if legacy.exists():composite(legacy,out/f'before-{g}.png',g,caption=g>=1490)
        else:assert (out/f'before-{g}.png').exists(), 'Run bounded native proof once to create the legacy comparison'
        composite(out/f'clean-{g}.png',out/f'editorial-{g}.png',g,ass,caption=g>=1490)
    boards(out);print('PASS five native counter comparisons + three-scene native board; no3D rerender by compositor')
if __name__=='__main__':main()
