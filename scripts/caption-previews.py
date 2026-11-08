"""Bounded S3C FFmpeg/libass overlay; never invokes Three.js or a 3D renderer."""
import argparse, hashlib, json, math, re, subprocess, time, wave
from pathlib import Path
from PIL import ImageFont
ROOT = Path(__file__).resolve().parents[1]

def sha(file):
    return hashlib.sha256(Path(file).read_bytes()).hexdigest()

def run(args):
    return subprocess.run(args, check=True, capture_output=True).stdout

def validate(data, style):
    assert data['version'] == style['version'] == 1
    expected = [('A', 320, 482, 81), ('B', 1296, 1490, 97), ('C', 1490, 1641, 76)]
    assert [(c['id'], c['startFrame'], c['endFrame'], c['frameCount']) for c in data['clips']] == expected
    assert (style['width'], style['height']) == (720, 1280)
    font = ImageFont.truetype(style['fontFile'], style['fontSize'])
    transcript = {int(m[1]): m[2].strip() for m in re.finditer(r'^\| (\d+) \|[^|]+\| ([^|]+) \|$', (ROOT/'stories/names100/VOICE_CUES.md').read_text(), re.M)}
    groups = {}
    previous = -1
    for cue in data['cues']:
        assert previous <= cue['start'] < cue['end']; previous = cue['end']
        assert not any(c in cue['text'] for c in '{}\\')
        lines = cue['text'].splitlines()
        assert 1 <= len(lines) <= style['maxLines'] and 2 <= len(cue['text'].split()) <= style['maxWords']
        shot = next(s for s in data['shots'] if s['startFrame']/30 <= cue['start'] < s['endFrame']/30)
        assert cue['end'] <= shot['endFrame']/30
        width = max(font.getlength(line) for line in lines)
        x, y = shot['anchor']; l, t, r, b = style['safeRect']
        assert x-width/2-style['outline'] >= l and x+width/2+style['outline'] <= r, (cue['id'], width)
        assert y <= b and y-len(lines)*style['fontSize']*1.25 > t
        groups.setdefault(cue['voiceCue'], []).append(' '.join(cue['text'].split()))
    for key, values in groups.items():
        assert ' '.join(values) == transcript[key], (key, values, transcript[key])
    assert next(c for c in data['cues'] if c['id']=='C2')['start'] >= 1530/30

def stamp(centiseconds, sep='.'):
    h, rest = divmod(centiseconds, 360000); m, rest = divmod(rest, 6000); s, cs = divmod(rest, 100)
    return f'{h}:{m:02}:{s:02}{sep}{cs:02}'

def events(data, clip):
    result = []
    for cue in data['cues']:
        if not clip['startFrame']/30 <= cue['start'] < clip['endFrame']/30: continue
        first = math.ceil((cue['start']-clip['startFrame']/30)*15-1e-8)
        end = min(clip['frameCount'], math.ceil((cue['end']-clip['startFrame']/30)*15-1e-8))
        shot = next(s for s in data['shots'] if s['startFrame']/30 <= cue['start'] < s['endFrame']/30)
        # Floor the centisecond envelope around the first/last frame, not voice words.
        result.append({**cue, 'firstFrame':first, 'endFrame':end, 'assStart':math.floor(first/15*100+1e-8), 'assEnd':math.floor(end/15*100+1e-8), 'anchor':shot['anchor']})
    return result

def generate(data, style, directory):
    directory.mkdir(parents=True, exist_ok=True)
    files = {}
    for clip in data['clips']:
        ev = events(data, clip)
        header = f'''[Script Info]
ScriptType: v4.00+
PlayResX: {style['width']}
PlayResY: {style['height']}
WrapStyle: 2
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: White,{style['font']},{style['fontSize']},{style['fill']},{style['fill']},{style['outlineColor']},{style['shadowColor']},-1,0,0,0,100,100,0,0,1,{style['outline']},{style['shadow']},2,0,0,0,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
'''
        lines = []
        srt = []
        for i, e in enumerate(ev):
            x, y = e['anchor']; text = e['text'].replace('\n', r'\N')
            lines.append(f"Dialogue: 0,{stamp(e['assStart'])},{stamp(e['assEnd'])},White,,0,0,0,,{{\\an2\\pos({x},{y})}}{text}")
            def srt_time(cs): return '0'+stamp(cs).replace('.', ',')+'0'
            srt.append(f"{i+1}\n{srt_time(e['assStart'])} --> {srt_time(e['assEnd'])}\n{e['text']}\n")
        ass = directory/f"{clip['id']}.ass"; ass.write_text(header+'\n'.join(lines)+'\n')
        (directory/f"{clip['id']}.srt").write_text('\n'.join(srt))
        files[clip['id']] = (ass, ev)
    return files

def main():
    p = argparse.ArgumentParser(); p.add_argument('--wav', type=Path, required=True); p.add_argument('--out', type=Path, default=ROOT/'renders/names100-s3c'); args=p.parse_args()
    out=args.out.resolve(); out.mkdir(parents=True, exist_ok=True)
    # Private outputs must not be accidentally placed in tracked evidence/source directories.
    assert out.is_relative_to(ROOT/'renders'), 'Private outputs belong under ignored renders/'
    data=json.loads((ROOT/'stories/names100/captions/s3c.json').read_text()); style=json.loads((ROOT/data['style']).read_text()); validate(data, style)
    assert sha(args.wav)==data['wavSha256']
    with wave.open(str(args.wav)) as w:
        assert (w.getframerate(),w.getnchannels(),w.getnframes())==(44100,2,2411520)
        pcm=w.readframes(w.getnframes())
    subtitle_dir=ROOT/'stories/names100/captions/generated'; files=generate(data, style, subtitle_dir)
    voice=json.loads((ROOT/'evidence/names100-s3b/voiced-excerpts.json').read_text())
    report={'status':'RUNNING','new3dRenders':0,'wavSha256':sha(args.wav),'style':style,'clips':[], 'sync':'PARTIAL: supplied phrase windows; internal split timing requires human listening'}
    started=time.monotonic()
    for clip in data['clips']:
        item=next(c for c in voice['clips'] if c['id']==clip['id']); source=Path(item['reviewFile']); silent=ROOT/clip['input']; before=sha(silent)
        a=clip['startFrame']*1470; b=min(clip['endFrame']*1470,2411520)
        assert hashlib.sha256(pcm[a*4:b*4]).hexdigest()==item['sourcePcmSha256']
        if source.exists(): assert sha(source)==item['reviewSha256']
        else:
            source=out/f"{clip['id']}-voiced-source.mp4"
            run(['ffmpeg','-y','-v','error','-i',str(silent),'-i',str(args.wav),'-map','0:v:0','-map','1:a:0','-af',f'atrim=start_sample={a}:end_sample={b},asetpts=PTS-STARTPTS','-c:v','copy','-c:a','aac','-b:a','192k','-movflags','+faststart',str(source)])
        ass, ev=files[clip['id']]; dest=out/f"{clip['id']}-narrated-captioned.mp4"
        filters=f"scale=720:1280:flags=lanczos,ass=filename='{ass}',setsar=1"
        original=json.loads((ROOT/f"evidence/names100-s3b/{clip['id']}-motion.json").read_text())
        cuts=[shot['start']/15 for shot in original['shots'][1:]]
        command=['ffmpeg','-y','-v','error','-i',str(source),'-map','0:v:0','-map','0:a:0','-vf',filters,'-frames:v',str(clip['frameCount']),'-r','15','-c:v','libx264','-threads','2','-preset','medium','-crf','20','-profile:v','main','-level:v','3.1','-pix_fmt','yuv420p','-c:a','copy',*( ['-force_key_frames',','.join(str(t) for t in cuts)] if cuts else []),'-movflags','+faststart',str(dest)]
        run(command); run(['ffmpeg','-v','error','-i',str(dest),'-f','null','-'])
        probe=json.loads(run(['ffprobe','-v','error','-count_frames','-show_streams','-show_format','-of','json',str(dest)])); v=next(s for s in probe['streams'] if s['codec_type']=='video'); au=next(s for s in probe['streams'] if s['codec_type']=='audio')
        assert (v['codec_name'],v['pix_fmt'],v['width'],v['height'],int(v['nb_read_frames']))==('h264','yuv420p',720,1280,clip['frameCount'])
        assert au['codec_name']=='aac' and float(v['start_time'])==float(au['start_time'])==0
        assert abs(float(probe['format']['duration'])-clip['frameCount']/15)<.002
        def audio_packets(file): return run(['ffmpeg','-v','error','-i',str(file),'-map','0:a:0','-c','copy','-f','hash','-hash','sha256','-']).decode().strip()
        assert audio_packets(source)==audio_packets(dest), 'Captioning must not alter the existing narration packets'
        assert sha(silent)==before
        report['clips'].append({**clip,'sourceSilentSha256':before,'sourceVoicedSha256':sha(source),'result':str(dest),'sha256':sha(dest),'audioPacketsUnchanged':True,'audioStart':0,'videoStart':0,'events':ev,'probe':probe,'ffmpegArgs':command})
        print(f"PASS {clip['id']}:720x1280 captions over existing footage,{clip['frameCount']} frames,AAC packets unchanged",flush=True)
    assert sha(args.wav)==data['wavSha256']; report.update(status='PASS technical; user listening/style approval pending',seconds=time.monotonic()-started)
    (out/'manifest.json').write_text(json.dumps(report,indent=2)+'\n')

if __name__=='__main__': main()
