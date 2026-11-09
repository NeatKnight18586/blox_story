"""Full-story subtitles from exact transcript; original S3C font/style unchanged."""
import sys,json,re,importlib.util
from pathlib import Path
from PIL import ImageFont
sys.dont_write_bytecode=True
ROOT=Path(__file__).resolve().parents[1]
s=importlib.util.spec_from_file_location('captions',ROOT/'scripts/caption-previews.py');m=importlib.util.module_from_spec(s);s.loader.exec_module(m)
def build():
 data=json.loads((ROOT/'stories/names100/captions/s4-full.json').read_text());style=json.loads((ROOT/data['style']).read_text());story=json.loads((ROOT/'stories/names100/roughcut.json').read_text());anchors={s['id']:s['anchor'] for s in data['shots']};font=ImageFont.truetype(style['fontFile'],style['fontSize'])
 data['shots']=[dict(id=s['id'],startFrame=s['start'],endFrame=s['end'],anchor=anchors.get(s['id'],style['anchor'])) for s in story['shots']]
 transcript={int(n):(float(a),float(b),t.strip()) for n,a,b,t in re.findall(r'^\| (\d+) \| ([\d.]+)–([\d.]+) \| ([^|]+) \|$',(ROOT/data['authority']).read_text(),re.M)}
 groups={};previous=0
 for c in data['cues']:
  a,b,_=transcript[c['voiceCue']];assert a-1e-6<=c['start']<c['end']<=b+1e-6,(c,a,b)
  assert previous<=c['start'];previous=c['end'];assert not any(v in c['text'] for v in '{}\\')
  groups.setdefault(c['voiceCue'],[]).append(' '.join(c['text'].split()));assert len(c['text'].split())<=5
  shot=next(s for s in data['shots'] if s['startFrame']/30<=c['start']<s['endFrame']/30);assert c['end']<=shot['endFrame']/30
  assert 1<=len(c['text'].splitlines())<=2
  x,y=shot['anchor']
  for line in c['text'].splitlines():assert x-font.getlength(line)/2-style['outline']>=40 and x+font.getlength(line)/2+style['outline']<=620
  assert 180<y<=1010
 assert set(groups)==set(transcript)
 for n,texts in groups.items():assert ' '.join(texts)==transcript[n][2],(n,texts,transcript[n])
 data['clips']=[dict(id='S4',startFrame=0,endFrame=1641,frameCount=821)]
 files=m.generate(data,style,ROOT/'stories/names100/captions/generated');return data,style,files['S4'][1]
if __name__=='__main__':
 data,style,ev=build();print(f'PASS exact38 narration phrases, {len(ev)} caption events, unchanged white font/style and shot anchors; internal splits provisional')
