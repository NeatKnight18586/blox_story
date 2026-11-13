#!/usr/bin/env python3
"""scripts/v2/assemble.py — finishing (docs/V2_BRIEF.md §9; owner decisions: native 1080p, no SFX).

  python3 scripts/v2/assemble.py --story nobody --frames <dir> --captions <file.ass> --out <file.mp4>
                                 [--voice-start 0] [--voice-dur 12] [--no-hold] [--fps 30]

frames (native 1080×1920 PNGs, never upscaled) → subtle bloom + grade → captions (ASS, Lilita One) → voice
from frame 0, never stretched, two-pass loudnorm to −14 LUFS / true peak ≤ −1 dB (+ optional
stories/<slug>/music.mp3 at −20 dB under it). After the last word the final shot holds (still moving if the
frames continue, otherwise a freeze) so the video ends at max(voice + 2.5 s, 122.5 s); --no-hold for demos.
H.264 High yuv420p CRF 18, AAC 192k, +faststart. Prints a JSON report checked with ffprobe/ebur128.

--animatic (Gate B preview, never a final): 270×480 frames at 15 fps, Lanczos-scaled ×2 to 540×960, light grade,
the same captions and voice, a small "ANIMATIC" label top-left; must come out ≤ 10 MB (CRF raised until it does).
"""
import argparse, glob, json, os, re, subprocess, sys
from PIL import Image

# The brief's grade, with one fix: FFmpeg blends in YUV, and a screen blend on the chroma planes shifts every
# hue toward magenta. The bloom is therefore screened onto luma only (chroma passes through unchanged).
GRADE = ("format=yuv444p,split[a][b];[b]gblur=sigma=24,eq=brightness=-0.25:contrast=1.6[bl];"
         "[a][bl]blend=c0_mode=screen:c0_opacity=0.2:c1_mode=normal:c1_opacity=0:c2_mode=normal:c2_opacity=0,"
         "eq=saturation=1.15:contrast=1.04,vignette=PI/8")
FONTS = 'node_modules/@expo-google-fonts/lilita-one/400Regular'
TARGET_LUFS, TARGET_TP = -14.0, -1.0


def run(cmd, **kw):
    return subprocess.run(cmd, capture_output=True, text=True, check=True, **kw)


def probe_duration(path):
    return float(run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', path]).stdout.strip())


def loudnorm_filter(voice, start, dur):
    """Two-pass EBU R128: measure the slice, then normalise linearly to −14 LUFS, TP −1 dB."""
    trim = f'atrim=start={start}' + (f':duration={dur}' if dur else '') + ',asetpts=PTS-STARTPTS'
    out = run(['ffmpeg', '-hide_banner', '-nostats', '-i', voice, '-af', f'{trim},loudnorm=I={TARGET_LUFS}:TP={TARGET_TP}:LRA=11:print_format=json', '-f', 'null', '-']).stderr
    m = json.loads(out[out.rindex('{'):out.rindex('}') + 1])
    return (f"{trim},loudnorm=I={TARGET_LUFS}:TP={TARGET_TP}:LRA=11:measured_I={m['input_i']}:measured_TP={m['input_tp']}:"
            f"measured_LRA={m['input_lra']}:measured_thresh={m['input_thresh']}:offset={m['target_offset']}:linear=true,aresample=48000")


def measure(path):
    err = run(['ffmpeg', '-hide_banner', '-nostats', '-i', path, '-map', '0:a', '-af', 'ebur128=peak=true', '-f', 'null', '-']).stderr
    summ = err[err.rindex('Summary:'):]
    i = float(re.search(r'I:\s+(-?[\d.]+) LUFS', summ).group(1)); tp = float(re.search(r'Peak:\s+(-?[\d.]+) dBFS', summ).group(1))
    return i, tp


def main():
    a = argparse.ArgumentParser()
    a.add_argument('--story', required=True); a.add_argument('--frames'); a.add_argument('--video', help='near-lossless picture (render farm segments, concatenated) instead of --frames'); a.add_argument('--captions'); a.add_argument('--out', required=True)
    a.add_argument('--voice-start', type=float, default=0); a.add_argument('--voice-dur', type=float); a.add_argument('--no-hold', action='store_true')
    a.add_argument('--fps', type=int, default=30); a.add_argument('--animatic', action='store_true'); o = a.parse_args()
    if o.animatic and o.fps == 30: o.fps = 15

    if o.video:
        st = json.loads(run(['ffprobe', '-v', 'error', '-select_streams', 'v:0', '-count_packets', '-show_entries', 'stream=width,height,nb_read_packets', '-of', 'json', o.video]).stdout)['streams'][0]
        w, h, nframes = st['width'], st['height'], int(st['nb_read_packets'])
    else:
        if not o.frames: sys.exit('give --frames <dir> or --video <mp4>')
        frames = sorted(glob.glob(os.path.join(o.frames, 'frame-*.png')))
        if not frames: sys.exit('no frames in ' + o.frames)
        w, h = Image.open(frames[0]).size; nframes = len(frames)
    if o.animatic:
        if (w, h) != (270, 480): sys.exit(f'animatic frames must be 270×480, got {w}×{h}')
    elif (w, h) != (1080, 1920): sys.exit(f'frames are {w}×{h}: finals must be native 1080×1920 (owner decision; never upscale)')
    voice = next((p for p in [f'stories/{o.story}/voice.flac', f'stories/{o.story}/voice.wav', f'stories/{o.story}/voice.mp3'] if os.path.exists(p)), None)
    if not voice: sys.exit('no voice file in stories/' + o.story)
    vlen = o.voice_dur if o.voice_dur else probe_duration(voice) - o.voice_start
    pic = nframes / o.fps
    total = pic if o.no_hold else max(pic, max(vlen + 2.5, 122.5))
    hold = max(0.0, total - pic)

    vf = f"[0:v]{GRADE}" if not o.animatic else ("[0:v]scale=540:960:flags=lanczos,eq=saturation=1.12:contrast=1.04,"
        f"drawtext=fontfile={FONTS}/LilitaOne_400Regular.ttf:text='ANIMATIC':x=14:y=14:fontsize=22:fontcolor=white@0.85:box=1:boxcolor=black@0.45:boxborderw=6")
    if o.captions: vf += f",ass={o.captions}:fontsdir={FONTS}"
    if hold > 0: vf += f",tpad=stop_mode=clone:stop_duration={hold:.3f}"
    vf += ",format=yuv420p[v]"
    af = f"[1:a]{loudnorm_filter(voice, o.voice_start, o.voice_dur)}[vo]"
    inputs = (['-i', o.video] if o.video else ['-framerate', str(o.fps), '-start_number', os.path.basename(frames[0])[6:11].lstrip('0') or '0', '-i', os.path.join(o.frames, 'frame-%05d.png')]) + ['-i', voice]
    music = f'stories/{o.story}/music.mp3'
    if os.path.exists(music):
        inputs += ['-i', music]; af += f";[2:a]volume=-20dB,aresample=48000[mu];[vo][mu]amix=inputs=2:duration=first:normalize=0[a]"
    else:
        af += ";[vo]anull[a]"
    os.makedirs(os.path.dirname(o.out) or '.', exist_ok=True)
    for crf in ([18] if not o.animatic else [23, 27, 31]):
        run(['ffmpeg', '-hide_banner', '-y', *inputs, '-filter_complex', vf + ';' + af, '-map', '[v]', '-map', '[a]',
             '-c:v', 'libx264', '-profile:v', 'high', '-preset', 'medium', '-crf', str(crf), '-pix_fmt', 'yuv420p', '-r', str(o.fps),
             '-c:a', 'aac', '-b:a', '192k' if not o.animatic else '128k', '-movflags', '+faststart', '-t', f'{total:.3f}', o.out])
        if not o.animatic or os.path.getsize(o.out) <= 10e6: break

    pr = json.loads(run(['ffprobe', '-v', 'error', '-show_entries', 'stream=codec_type,codec_name,profile,width,height,r_frame_rate,nb_frames:format=duration,size', '-of', 'json', o.out]).stdout)
    v = next(s for s in pr['streams'] if s['codec_type'] == 'video'); au = [s for s in pr['streams'] if s['codec_type'] == 'audio']
    lufs, peak = measure(o.out)
    rep = {'out': o.out, 'width': v['width'], 'height': v['height'], 'fps': v['r_frame_rate'], 'profile': v.get('profile'), 'frames': int(v.get('nb_frames', 0)),
           'duration': round(float(pr['format']['duration']), 3), 'MB': round(int(pr['format']['size']) / 1e6, 2), 'audio': bool(au),
           'lufs': lufs, 'truePeak': peak, 'hold': round(hold, 3), 'music': os.path.exists(music)}
    size, cap = ((540, 960), 10) if o.animatic else ((1080, 1920), 60)
    rep['animatic'] = o.animatic
    rep['pass'] = (v['width'], v['height']) == size and bool(au) and abs(lufs - TARGET_LUFS) <= 1 and rep['MB'] <= cap and rep['duration'] >= (122.5 if not o.no_hold else 0) - .05
    print(json.dumps(rep))
    if not rep['pass']: sys.exit(1)


if __name__ == '__main__':
    main()
