#!/usr/bin/env python3
"""scripts/v2/assemble.py — finishing (docs/V2_BRIEF.md §9, Amendment A2; sfx only with --spec, Amendment A4 §F).

  python3 scripts/v2/assemble.py --story nobody --frames <dir> | --video <mp4> --captions <file.ass> --out <master.mp4>
                                 [--proxy <review.mp4>] [--voice-start 0] [--voice-dur 12] [--no-hold] [--animatic] [--spec <episode.json>]

Finals (A2): 1440×2560 frames (native) or 1080×1920 (recorded fallback: Lanczos-upscaled to 1440×2560 BEFORE the
grade) → highlight-only RGB bloom + light grade + contrast-adaptive sharpen → captions burned at the delivery size
(text is never bloomed, scaled or sharpened) → voice from frame 0, never stretched, two-pass loudnorm to −14 LUFS,
TP −1.5 dB (≤ −1 dB after AAC). Legacy specs only (no `format`): the final shot holds to max(voice + 2.5, 122.5); format 5 and format 6 specs (--spec; docs/season1/FORMAT_V6.md): no padding,
voice + 0.85 s, format 6 hard max 125 s; --no-hold for demos.
  master  x264 High, preset slow, tune animation, CRF 14, BT.709, closed 15-frame GOP, AAC-LC 48 kHz 320k,
          +faststart, no size cap; bitrate floor 16 Mb/s (CRF 14 → 12 → 10). Never committed to git.
  --proxy the review copy: same graded frames, downscaled to 1080×1920, captions burned at 1080, CRF 18, ≤ 45 MB.
--animatic (Gate B preview, never a final): 270×480 at 15 fps, Lanczos ×2 to 540×960, light grade, "ANIMATIC" label,
≤ 10 MB. Prints a JSON report checked with ffprobe/ebur128. Filter graphs are pure functions (tests/v2/test_finish.py).
"""
import argparse, glob, json, os, re, subprocess, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import lut4 as LUT4
from PIL import Image

FONTS = 'node_modules/@expo-google-fonts/lilita-one/400Regular'
TARGET_LUFS, TARGET_TP, MAX_TP = -14.0, -1.5, -1.0
MIX_LIMIT = 0.7943   # −2 dBFS
PRELIMIT_MARGIN = 1.0   # dB of headroom under the computed voice pre-limit (true peak runs above sample peak)
MASTER_SIZE, FALLBACK_SIZE, PROXY_SIZE = (1440, 2560), (1080, 1920), (1080, 1920)
CAS_DEFAULT, CAS_MAX = .35, .5
MASTER_CRF, CRF_STEPS, FLOOR_KBPS = 14, (14, 12, 10), 16000
PROXY_CRF_STEPS, PROXY_MAX_MB = (18, 20, 22), 45
# Session 6 grade (kept only so qc.py can measure the before/after): a σ 24 blur of the whole frame screened back on.
OLD_GRADE = ("format=yuv444p,split[a][b];[b]gblur=sigma=24,eq=brightness=-0.25:contrast=1.6[bl];"
             "[a][bl]blend=c0_mode=screen:c0_opacity=0.2:c1_mode=normal:c1_opacity=0:c2_mode=normal:c2_opacity=0,"
             "eq=saturation=1.15:contrast=1.04,vignette=PI/8")


# ---------------- pure graph builders ----------------
def bloom_sigma(height):
    """Bloom blur radius scales with the output height: σ 6 at 2560 tall."""
    return round(6 * height / 2560, 3)


def grade_graph(height, cas=CAS_DEFAULT, label='g', vignette=True):
    """Highlight-only bloom in RGB: only values above ~84 % (215/255) glow; then a light grade, a contrast-adaptive
    sharpen (never above 0.5: block edges ring) and a soft vignette. Input: one unlabelled stream; output: [label].
    vignette=False exists only for qc.py's tint check (the vignette is a deliberate lightness falloff, not a tint)."""
    if cas > CAS_MAX: raise ValueError(f'cas {cas} > {CAS_MAX}')
    hi = "if(gt(val,215),(val-215)*4,0)"
    return (f"format=gbrp,split[ga][gb];[gb]lut=c0='{hi}':c1='{hi}':c2='{hi}',gblur=sigma={bloom_sigma(height)}[gbl];"
            f"[ga][gbl]blend=all_mode=screen:all_opacity=0.35,eq=saturation=1.10:contrast=1.05,cas=strength={cas}{',vignette=PI/9' if vignette else ''}[{label}]")


def to_yuv(fmt='yuv420p'):
    """RGB → BT.709 limited range, matching the master's colour tags."""
    return f"scale=out_color_matrix=bt709:out_range=tv,format={fmt}"


def final_graph(src_size, captions=None, hold=0.0, offset_frames=0, fps=30, outputs=('master',), fmt='yuv420p', vignette=True, lut=None, shot_luts=()):
    """filter_complex for finals. src_size (w, h) of the frames; 1080×1920 is upscaled to 1440×2560 BEFORE the grade.
    outputs: 'master' (1440×2560), 'proxy' (1080×1920, downscaled from the same graded frames), 'graded' (master size,
    no captions: QC sharpness). offset_frames shifts timestamps so captions match a single frame pulled for QC.
    Returns (graph, [output labels])."""
    w, h = src_size
    if (w, h) not in (MASTER_SIZE, FALLBACK_SIZE): raise ValueError(f'frames are {w}×{h}: finals take 1440×2560 (native) or 1080×1920 (fallback)')
    pre = f"setpts=PTS+{offset_frames}/({fps}*TB)," if offset_frames else ""
    up = f"scale={MASTER_SIZE[0]}:{MASTER_SIZE[1]}:flags=lanczos," if (w, h) == FALLBACK_SIZE else ""
    n = len(outputs)
    g = f"[0:v]{pre}{up}{grade_graph(MASTER_SIZE[1], label='graded0', vignette=vignette)}"
    src = 'graded0'
    if lut:   # format v4 (opt-in, spec `look4`): the preset's .cube LUT + a light vignette after the A2 grade (scripts/v2/lut4.py)
        g += f";[graded0]lut3d=file='{lut}',{LUT4.VIGNETTE}[graded0l]"; src = 'graded0l'
    for k, (f, t0, t1) in enumerate(shot_luts):   # format v5: per-shot grade (memory / dawn) over [t0, t1) only
        g += f";[{src}]lut3d=file='{f}':enable='between(t,{t0:.4f},{t1 - 1e-4:.4f})'[sg{k}]"; src = f'sg{k}'
    g += f";[{src}]split={n}" + ''.join(f"[s{i}]" for i in range(n)) if n > 1 else f";[{src}]null[s0]"

    labels = []
    for i, kind in enumerate(outputs):
        chain = f"[s{i}]"
        if kind == 'proxy': chain += f"scale={PROXY_SIZE[0]}:{PROXY_SIZE[1]}:flags=lanczos,"
        if kind in ('master', 'proxy') and captions: chain += f"ass={captions}:fontsdir={FONTS},"
        if hold > 0: chain += f"tpad=stop_mode=clone:stop_duration={hold:.3f},"
        chain += to_yuv(fmt if kind != 'graded' else 'yuv444p') + f"[{kind}]"
        g += ';' + chain; labels.append(kind)
    return g, labels


def master_encode_args(crf):
    return ['-c:v', 'libx264', '-profile:v', 'high', '-preset', 'slow', '-tune', 'animation', '-crf', str(crf), '-pix_fmt', 'yuv420p',
            '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-color_range', 'tv',
            '-g', '15', '-keyint_min', '15', '-sc_threshold', '0', '-bf', '2', '-flags', '+cgop',
            '-c:a', 'aac', '-ar', '48000', '-b:a', '320k', '-movflags', '+faststart']


def proxy_encode_args(crf):
    return ['-c:v', 'libx264', '-profile:v', 'high', '-preset', 'slow', '-tune', 'animation', '-crf', str(crf), '-pix_fmt', 'yuv420p',
            '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-color_range', 'tv',
            '-c:a', 'aac', '-ar', '48000', '-b:a', '192k', '-movflags', '+faststart']


def next_crf(crf, video_kbps, floor=FLOOR_KBPS, steps=CRF_STEPS):
    """Bitrate floor: below `floor` kb/s step CRF down along `steps`; None when it is met or no step is left."""
    if video_kbps >= floor: return None
    lower = [s for s in steps if s < crf]
    return max(lower) if lower else None


def next_proxy_crf(crf, mb, cap=PROXY_MAX_MB, steps=PROXY_CRF_STEPS):
    if mb <= cap: return None
    higher = [s for s in steps if s > crf]
    return min(higher) if higher else None


def audio_graph(voice_chain, music=False, sfx=False, silence=()):
    """Audio filter graph → [a]. Input 1 = voice (normalised by voice_chain), then music (−20 dB), then the sfx track (already
    at −30 dB RMS); the silence windows (A4 §F: 8 frames before the reversal) mute music and sfx, never the voice."""
    mute = ''.join(f",volume=enable='between(t,{a:.4f},{b:.4f})':volume=0" for a, b in silence)
    g, mix, k = f"[1:a]{voice_chain}[vo]", ['[vo]'], 2
    if music: g += f";[{k}:a]volume=-20dB,aresample=48000{mute}[mu]"; mix.append('[mu]'); k += 1
    if sfx: g += f";[{k}:a]aresample=48000{mute}[sx]"; mix.append('[sx]'); k += 1
    # a mix is peak-limited at −2 dBFS (sample peak; keeps TP ≤ −1 dB after AAC): sfx hits on voice peaks must not break A2's TP
    return g + (f";{''.join(mix)}amix=inputs={len(mix)}:duration=first:normalize=0,alimiter=limit={MIX_LIMIT}:attack=1:release=40:level=disabled[a]" if len(mix) > 1 else ";[vo]anull[a]")


# ---------------- I/O ----------------
def run(cmd, **kw):
    return subprocess.run(cmd, capture_output=True, text=True, check=True, **kw)


def probe_duration(path):
    return float(run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', path]).stdout.strip())


def probe_video(path):
    pr = json.loads(run(['ffprobe', '-v', 'error', '-show_entries', 'stream=codec_type,codec_name,profile,width,height,r_frame_rate,nb_frames,pix_fmt,bit_rate,'
                         'color_space,color_primaries,color_transfer,color_range,sample_rate:format=duration,size,bit_rate', '-of', 'json', path]).stdout)
    v = next(s for s in pr['streams'] if s['codec_type'] == 'video'); au = [s for s in pr['streams'] if s['codec_type'] == 'audio']
    return pr, v, au


def _loudnorm_pass1(voice, pre):
    out = run(['ffmpeg', '-hide_banner', '-nostats', '-i', voice, '-af', f'{pre}loudnorm=I={TARGET_LUFS}:TP={TARGET_TP}:LRA=11:print_format=json', '-f', 'null', '-']).stderr
    return json.loads(out[out.rindex('{'):out.rindex('}') + 1])


def prelimit_db(input_i, input_tp, margin=PRELIMIT_MARGIN):
    """Peak (dBFS) to limit the voice to so that linear gain to −14 LUFS keeps TP ≤ −1.5; None if no limiting is needed (pure)."""
    gain = TARGET_LUFS - input_i
    return None if input_tp + gain <= TARGET_TP else round(TARGET_TP - gain - margin, 2)


def loudnorm_filter(voice, start, dur, prelimit=False):
    """Two-pass EBU R128: measure the slice, then normalise linearly to −14 LUFS, TP −1.5 dB. prelimit (opt-in, Season 1
    assemblies with --spec): when the voice's peaks would stop linear gain short of −14 LUFS, a transparent peak limiter
    first brings them down just enough (A2's linear path is unchanged for everything else, e.g. "Nobody")."""
    trim = f'atrim=start={start}' + (f':duration={dur}' if dur else '') + ',asetpts=PTS-STARTPTS'
    m = _loudnorm_pass1(voice, trim + ',')
    lim = prelimit_db(float(m['input_i']), float(m['input_tp'])) if prelimit else None
    pre = trim + (f",alimiter=limit={10 ** (lim / 20):.4f}:attack=1:release=60:level=disabled" if lim is not None else '')
    if lim is not None: m = _loudnorm_pass1(voice, pre + ',')
    return (f"{pre},loudnorm=I={TARGET_LUFS}:TP={TARGET_TP}:LRA=11:measured_I={m['input_i']}:measured_TP={m['input_tp']}:"
            f"measured_LRA={m['input_lra']}:measured_thresh={m['input_thresh']}:offset={m['target_offset']}:linear=true,aresample=48000")


def measure(path):
    err = run(['ffmpeg', '-hide_banner', '-nostats', '-i', path, '-map', '0:a', '-af', 'ebur128=peak=true', '-f', 'null', '-']).stderr
    summ = err[err.rindex('Summary:'):]
    i = float(re.search(r'I:\s+(-?[\d.]+) LUFS', summ).group(1)); tp = float(re.search(r'Peak:\s+(-?[\d.]+) dBFS', summ).group(1))
    return i, tp


def spec_luts(spec_path, out, default_fps=30):
    """(shot_luts, look_lut_file) for a spec: format v5 per-shot grades over their time ranges, format v4 `look4` LUT. Writes the .cube files
    next to `out`. Shared by assemble and qc so the QC reference frame is graded exactly like the master."""
    sp = json.load(open(spec_path)); fr = sp.get('fps', default_fps); t = 0.0; SH = sp.get('shots', []); shot_luts = []
    d0 = os.path.dirname(os.path.abspath(out))
    for i, sh in enumerate(SH):
        st = sh['at'] if 'at' in sh else t
        d = sh['frames'] / fr if 'frames' in sh else ((SH[i + 1]['at'] if i + 1 < len(SH) else sp.get('end', st)) - st); t = st + d
        if sh.get('grade') in LUT4.PRESETS and d > 0:
            f = os.path.join(d0, f"shot-{sh['id']}-{sh['grade']}.cube"); open(f, 'w').write(LUT4.cube(sh['grade'])); shot_luts.append((f, st, st + d))
    lut_file = None
    if sp.get('look4') in LUT4.PRESETS:
        lut_file = os.path.join(d0, sp['look4'] + '.cube'); open(lut_file, 'w').write(LUT4.cube(sp['look4']))
    return shot_luts, lut_file


def picture_inputs(o, fps):
    """ffmpeg input args, (w, h) and frame count for --frames <dir> or --video <mp4>."""
    if o.video:
        st = json.loads(run(['ffprobe', '-v', 'error', '-select_streams', 'v:0', '-count_packets', '-show_entries', 'stream=width,height,nb_read_packets', '-of', 'json', o.video]).stdout)['streams'][0]
        return ['-i', o.video], (st['width'], st['height']), int(st['nb_read_packets'])
    if not o.frames: sys.exit('give --frames <dir> or --video <mp4>')
    frames = sorted(glob.glob(os.path.join(o.frames, 'frame-*.png')))
    if not frames: sys.exit('no frames in ' + o.frames)
    start = os.path.basename(frames[0])[6:11].lstrip('0') or '0'
    return ['-framerate', str(fps), '-start_number', start, '-i', os.path.join(o.frames, 'frame-%05d.png')], Image.open(frames[0]).size, len(frames)


V5_HOLD = 0.85   # format v5/v6 (owner): no padding; the video ends 0.85 s after the voice
V6_MAX = 125.0   # format v6 (docs/season1/FORMAT_V6.md): hard max 2:05


def end_total(pic, vlen, fmt=None, no_hold=False):
    """Pure: the finished length (s). --no-hold: the picture; format 5: max(picture, voice + 0.85); format 6: voice + 0.85
    (the picture is cut there, never held; > 125 s raises); legacy: max(picture, voice + 2.5, 122.5)."""
    if no_hold: return pic
    if fmt == 6:
        t = round(vlen + V5_HOLD, 3)
        if t > V6_MAX + 1e-6: raise ValueError(f'format 6: voice {vlen:.2f} s + {V5_HOLD} = {t:.2f} s > {V6_MAX} s hard max')
        return t
    if fmt == 5: return max(pic, vlen + V5_HOLD)
    return max(pic, max(vlen + 2.5, 122.5))


def main():
    a = argparse.ArgumentParser()
    a.add_argument('--story', required=True); a.add_argument('--frames'); a.add_argument('--video', help='near-lossless picture (render farm segments, concatenated) instead of --frames')
    a.add_argument('--captions'); a.add_argument('--out', required=True); a.add_argument('--proxy', help='also write the 1080 review proxy here')
    a.add_argument('--voice-start', type=float, default=0); a.add_argument('--voice-dur', type=float); a.add_argument('--no-hold', action='store_true')
    a.add_argument('--fps', type=int, default=30); a.add_argument('--animatic', action='store_true')
    a.add_argument('--spec', help='episode.json: mix the auto-placed sfx (A4 §F) unless it says "sfx": false'); o = a.parse_args()
    if o.spec and '--fps' not in sys.argv and json.load(open(o.spec)).get('fps', 30) != 30: o.fps = int(json.load(open(o.spec))['fps'])   # format v5: 24 fps specs (30 fps specs unchanged)
    if o.animatic and o.fps == 30: o.fps = 15
    elif o.animatic and o.fps == 24: o.fps = 12   # format v5 animatic: half rate, as at 30

    pic_in, (w, h), nframes = picture_inputs(o, o.fps)
    if o.animatic and (w, h) != (270, 480): sys.exit(f'animatic frames must be 270×480, got {w}×{h}')
    if not o.animatic and (w, h) not in (MASTER_SIZE, FALLBACK_SIZE):
        sys.exit(f'frames are {w}×{h}: finals take 1440×2560 (native) or 1080×1920 (fallback, upscaled before the grade)')
    voice = next((p for p in [f'stories/{o.story}/voice.flac', f'stories/{o.story}/voice.wav', f'stories/{o.story}/voice.mp3'] if os.path.exists(p)), None)
    if not voice: sys.exit('no voice file in stories/' + o.story)
    vlen = o.voice_dur if o.voice_dur else probe_duration(voice) - o.voice_start
    pic = nframes / o.fps
    fmt = json.load(open(o.spec)).get('format') if o.spec else None
    total = end_total(pic, vlen, fmt, o.no_hold)
    hold = max(0.0, total - pic)
    inputs = pic_in + ['-i', voice]
    music = f'stories/{o.story}/music.mp3'; has_music = os.path.exists(music)
    if has_music: inputs += ['-i', music]
    sfx_rep, silence = None, []
    if o.spec:   # A4 §F: auto-placed sfx under the voice (off with "sfx": false in the episode file)
        import sfx as SFX, tempfile
        spec = json.load(open(o.spec))
        if spec.get('sfx') is not False:
            placed = SFX.place(spec, SFX.layout(o.spec), spec.get('fps', o.fps)); silence = placed['silence']
            track = os.path.join(tempfile.mkdtemp(), 'sfx.wav'); SFX.write_wav(track, SFX.render_track(placed, total))
            inputs += ['-i', track]; sfx_rep = {'hits': len(placed['hits']), 'byName': {n: sum(h[1] == n for h in placed['hits']) for n in SFX.NAMES if any(h[1] == n for h in placed['hits'])}, 'silence': silence}
    shot_luts, lut_file = spec_luts(o.spec, o.out, o.fps) if o.spec else ([], None)
    af = audio_graph(loudnorm_filter(voice, o.voice_start, o.voice_dur, prelimit=bool(o.spec)), has_music, sfx_rep is not None, silence)
    for p in (o.out, o.proxy):
        if p: os.makedirs(os.path.dirname(p) or '.', exist_ok=True)
    rep = {'music': has_music, 'sfx': sfx_rep, 'hold': round(hold, 3)}

    if o.animatic:
        vf = ("[0:v]scale=540:960:flags=lanczos,eq=saturation=1.12:contrast=1.04,"
              f"drawtext=fontfile={FONTS}/LilitaOne_400Regular.ttf:text='ANIMATIC':x=14:y=14:fontsize=22:fontcolor=white@0.85:box=1:boxcolor=black@0.45:boxborderw=6")
        if o.captions: vf += f",ass={o.captions}:fontsdir={FONTS}"
        if hold > 0: vf += f",tpad=stop_mode=clone:stop_duration={hold:.3f}"
        vf += ",format=yuv420p[v]"
        for crf in (23, 27, 31):
            run(['ffmpeg', '-hide_banner', '-y', *inputs, '-filter_complex', vf + ';' + af, '-map', '[v]', '-map', '[a]',
                 '-c:v', 'libx264', '-profile:v', 'high', '-preset', 'medium', '-crf', str(crf), '-pix_fmt', 'yuv420p', '-r', str(o.fps),
                 '-c:a', 'aac', '-b:a', '128k', '-movflags', '+faststart', '-t', f'{total:.3f}', o.out])
            if os.path.getsize(o.out) <= 10e6: break
        pr, v, au = probe_video(o.out); lufs, peak = measure(o.out)
        rep.update({'out': o.out, 'animatic': True, 'crf': crf, 'width': v['width'], 'height': v['height'], 'fps': v['r_frame_rate'], 'duration': round(float(pr['format']['duration']), 3),
                    'MB': round(int(pr['format']['size']) / 1e6, 2), 'audio': bool(au), 'lufs': lufs, 'truePeak': peak})
        rep['pass'] = (v['width'], v['height']) == (540, 960) and bool(au) and abs(lufs - TARGET_LUFS) <= 1 and rep['MB'] <= 10
        print(json.dumps(rep)); sys.exit(0 if rep['pass'] else 1)

    # ---- finals: one decode + grade feeds the master and (first pass) the proxy ----
    rep['path'] = 'native-1440' if (w, h) == MASTER_SIZE else 'fallback-1080-upscaled'
    outs = ('master', 'proxy') if o.proxy else ('master',)
    graph, labels = final_graph((w, h), o.captions, hold, fps=o.fps, lut=lut_file, shot_luts=shot_luts, outputs=outs)
    crf, pcrf = MASTER_CRF, PROXY_CRF_STEPS[0]
    cmd = ['ffmpeg', '-hide_banner', '-y', *inputs, '-filter_complex', graph + ';' + af + (';[a]asplit=2[a1][a2]' if o.proxy else ''),
           '-map', '[master]', '-map', '[a1]' if o.proxy else '[a]', '-r', str(o.fps), *master_encode_args(crf), '-t', f'{total:.3f}', o.out]
    if o.proxy: cmd += ['-map', '[proxy]', '-map', '[a2]', '-r', str(o.fps), *proxy_encode_args(pcrf), '-t', f'{total:.3f}', o.proxy]
    run(cmd)
    steps = []

    def kbps(path): return int(probe_video(path)[1].get('bit_rate') or 0) / 1000
    while (nxt := next_crf(crf, kbps(o.out))) is not None:   # bitrate floor: re-encode the master only
        steps.append({'crf': crf, 'kbps': round(kbps(o.out))}); crf = nxt
        g1, _ = final_graph((w, h), o.captions, hold, fps=o.fps, lut=lut_file, shot_luts=shot_luts, outputs=('master',))
        run(['ffmpeg', '-hide_banner', '-y', *inputs, '-filter_complex', g1 + ';' + af, '-map', '[master]', '-map', '[a]', '-r', str(o.fps), *master_encode_args(crf), '-t', f'{total:.3f}', o.out])
    if o.proxy:
        while (nxt := next_proxy_crf(pcrf, os.path.getsize(o.proxy) / 1e6)) is not None:
            pcrf = nxt
            g2, _ = final_graph((w, h), o.captions, hold, fps=o.fps, lut=lut_file, shot_luts=shot_luts, outputs=('proxy',))
            run(['ffmpeg', '-hide_banner', '-y', *inputs, '-filter_complex', g2 + ';' + af, '-map', '[proxy]', '-map', '[a]', '-r', str(o.fps), *proxy_encode_args(pcrf), '-t', f'{total:.3f}', o.proxy])

    pr, v, au = probe_video(o.out); lufs, peak = measure(o.out)
    rep.update({'out': o.out, 'animatic': False, 'crf': crf, 'crfSteps': steps, 'width': v['width'], 'height': v['height'], 'fps': v['r_frame_rate'], 'pixFmt': v.get('pix_fmt'),
                'color': [v.get('color_space'), v.get('color_primaries'), v.get('color_transfer'), v.get('color_range')],
                'frames': int(v.get('nb_frames', 0)), 'duration': round(float(pr['format']['duration']), 3), 'MB': round(int(pr['format']['size']) / 1e6, 2),
                'videoMbps': round(int(v.get('bit_rate') or 0) / 1e6, 2), 'audio': bool(au), 'audioKbps': round(int(au[0].get('bit_rate') or 0) / 1e3) if au else 0,
                'lufs': lufs, 'truePeak': peak})
    rep['pass'] = ((v['width'], v['height']) == MASTER_SIZE and bool(au) and abs(lufs - TARGET_LUFS) <= 1 and peak <= MAX_TP
                   and rep['duration'] >= (end_total(0, vlen, fmt, o.no_hold)) - .05)
    if o.proxy:
        ppr, pv, pau = probe_video(o.proxy)
        rep['proxy'] = {'out': o.proxy, 'crf': pcrf, 'width': pv['width'], 'height': pv['height'], 'MB': round(int(ppr['format']['size']) / 1e6, 2), 'audio': bool(pau)}
        rep['pass'] = rep['pass'] and (pv['width'], pv['height']) == PROXY_SIZE and rep['proxy']['MB'] <= PROXY_MAX_MB
    print(json.dumps(rep))
    if not rep['pass']: sys.exit(1)


if __name__ == '__main__':
    main()
