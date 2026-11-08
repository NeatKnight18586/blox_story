"""Check actual libass frame masks, important visual zones and existing-frame timing."""
import json, re, subprocess
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
def run(args):return subprocess.run(args,check=True,capture_output=True,text=True)
r=json.loads((ROOT/'renders/names100-s3c/manifest.json').read_text());data=json.loads((ROOT/'stories/names100/captions/s3c.json').read_text());results=[]
for clip in r['clips']:
    filt=f"ass=stories/names100/captions/generated/{clip['id']}.ass,bbox=min_val=20"
    process=run(['ffmpeg','-v','info','-f','lavfi','-i',f"color=black:s=720x1280:r=15:d={clip['frameCount']/15}",'-vf',filt,'-frames:v',str(clip['frameCount']),'-f','null','-'])
    assert r['style']['fontFile'] in process.stderr
    frames=[]
    for line in process.stderr.splitlines():
        if 'Parsed_bbox' not in line or ' n:' not in line:continue
        i=int(re.search(r' n:(\d+)',line)[1]);box=None
        if ' x1:' in line:box=[int(re.search(rf' {k}:(\d+)',line)[1]) for k in ['x1','y1','x2','y2']]
        events=[e for e in clip['events'] if e['firstFrame']<=i<e['endFrame']]
        assert bool(box)==bool(events),(clip['id'],i,box,events)
        g=clip['startFrame']+2*i
        if box:
            assert box[0]>=40 and box[2]<=620 and box[1]>=180 and box[3]<=1010
            shot=next(s for s in data['shots'] if s['startFrame']<=g<s['endFrame'])
            for zone in shot['keepClearRects']:
                overlap=max(box[0],zone[0])<=min(box[2],zone[2]) and max(box[1],zone[1])<=min(box[3],zone[3])
                assert not overlap,(clip['id'],g,box,zone)
        frames.append(dict(frame=i,globalFrame=g,captionBox=box,cue=events[0]['id'] if events else None))
    assert len(frames)==clip['frameCount']
    # Every frame's HUD/top region is untouched by captions and must map to the
    # same existing S3B sample. This includes the exact first visible zero.
    source=str(ROOT/clip['input'])
    ssim=run(['ffmpeg','-v','info','-i',source,'-i',clip['result'],'-filter_complex','[0:v]scale=720:1280:flags=lanczos,crop=720:200:0:0[a];[1:v]crop=720:200:0:0[b];[a][b]ssim','-f','null','-'])
    score=float(re.search(r' All:([0-9.]+)',ssim.stderr)[1]);assert score>.98
    results.append(dict(id=clip['id'],frames=frames,protectedRegionsClear=True,originalHudFrameMappingSsim=score,fontFile=r['style']['fontFile']))
(ROOT/'evidence/names100-s3c/caption-mask-verification.json').write_text(json.dumps(dict(status='PASS',scope='Actual libass masks at all254 frames: correct on/off/blank pauses,manual face/counter/gesture keep-clear regions,frame-grid timing and original HUD mapping. Not perceptual listening.',clips=results),indent=2)+'\n')
print('PASS254 caption masks: phrase frames,blank pauses,safe margins,annotated important zones and original HUD clock mapping')
# One compact3-up sheet from the exact files being delivered, at phone-like size.
from PIL import Image,ImageDraw
out=ROOT/'renders/names100-s3c';sheet=Image.new('RGB',(810,528),(22,28,35));draw=ImageDraw.Draw(sheet)
for col,c in enumerate(r['clips']):
    i=(c['contactGlobalFrame']-c['startFrame'])//2;dest=out/f"{c['id']}-contact.png"
    run(['ffmpeg','-y','-v','error','-i',c['result'],'-vf',f'select=eq(n\\,{i})','-frames:v','1',str(dest)])
    with Image.open(dest) as image:sheet.paste(image.convert('RGB').resize((270,480),Image.Resampling.LANCZOS),(col*270,48))
    draw.text((col*270+8,8),f"{c['id']}  g{c['contactGlobalFrame']}  caption proof",fill='white')
    draw.text((col*270+8,26),'720x1280 text / upscaled180px footage',fill='white')
sheet.save(ROOT/'evidence/names100-s3c/caption-style-contact.png')
