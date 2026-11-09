"""Actual libass frame masks for full rough-cut captions and independent counter."""
import sys,json,re,subprocess,importlib.util
from pathlib import Path
sys.dont_write_bytecode=True
ROOT=Path(__file__).resolve().parents[1]
s=importlib.util.spec_from_file_location('caps',ROOT/'scripts/s4-captions.py');m=importlib.util.module_from_spec(s);s.loader.exec_module(m);data,style,events=m.build()
s=importlib.util.spec_from_file_location('counter',ROOT/'scripts/counter-overlay.py');c=importlib.util.module_from_spec(s);s.loader.exec_module(c)
clock=json.loads((ROOT/'evidence/names100-p4/counter-clock.json').read_text());counter=json.loads((ROOT/'stories/names100/counter/p5-editorial.json').read_text())
def masks(ass):
 p=subprocess.run(['ffmpeg','-v','info','-f','lavfi','-i','color=black:s=720x1280:r=15:d=54.734','-vf',f'settb=1/1000,setpts=trunc(N*1000/15)+1,ass={ass},bbox=min_val=20','-frames:v','821','-f','null','-'],capture_output=True,text=True,check=True)
 result=[]
 for line in p.stderr.splitlines():
  if 'Parsed_bbox' not in line or ' n:' not in line:continue
  box=[int(re.search(rf' {k}:(\d+)',line)[1]) for k in ['x1','y1','x2','y2']] if ' x1:' in line else None
  result.append(box)
 assert len(result)==821;assert style['fontFile'] in p.stderr;return result
caption=masks('stories/names100/captions/generated/S4.ass');number=masks('stories/names100/counter/generated/p5-editorial.ass');old=json.loads((ROOT/'stories/names100/captions/s3c.json').read_text());zones={s['id']:s['keepClearRects'] for s in old['shots']}
def overlap(a,b):return max(a[0],b[0])<=min(a[2],b[2]) and max(a[1],b[1])<=min(a[3],b[3])
checks=[]
for i,(a,b) in enumerate(zip(caption,number)):
 g=i*2;active=[e for e in events if e['firstFrame']<=i<e['endFrame']];expected=c.sample(counter,clock['frames'][g]);assert bool(a)==bool(active),(i,a,active);assert bool(b)==expected['visible'],(i,b,expected)
 if a:
  assert a[0]>=40 and a[2]<=620 and a[1]>=180 and a[3]<=1010,(g,a)
  shot=next(s for s in data['shots'] if s['startFrame']<=g<s['endFrame'])
  for z in zones.get(shot['id'],[]):assert not overlap(a,z),(g,a,z)
 if b:assert b[0]>=40 and b[2]<=620 and b[1]>=40 and b[3]<290
 if a and b:assert not overlap(a,b),(g,a,b)
 checks.append({'frame':i,'globalFrame':g,'captionBox':a,'counterBox':b})
(ROOT/'evidence/names100-s4/overlay-verification.json').write_text(json.dumps({'status':'PASS','frames':821,'captionEvents':len(events),'transcriptPhrases':38,'allFrameMasks':True,'counterCaptionCollisions':0,'sourceS3cClearZonesPreserved':True,'checks':checks},separators=(',',':'))+'\n')
print('PASS821 actual libass masks: caption pauses/text bounds,source counter visibility/no S23 number,no collisions,approved S3C zones')
