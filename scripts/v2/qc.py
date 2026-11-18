#!/usr/bin/env python3
"""scripts/v2/qc.py — the final-picture quality gate (docs/V2_BRIEF.md Amendment A2 §D).

  npm run v2:qc -- --story nobody --video <master.mp4> [--frames renders/v2/final1440/frames] [--before-after]

Exit 1 on any failure; writes review/<slug>/qc.json and review/<slug>/qc-crops.png.
 1. ffprobe/ebur128: 1440×2560 (or 1080×1920 recorded as the fallback render with --fallback), 30 fps, yuv420p,
    BT.709 tags, AAC, average video bitrate ≥ 16 Mb/s, true peak ≤ −1 dB, −14 LUFS ± 1.
 2. Encode loss on 12 frames (the 6 fastest-camera shots in plan.json + 6 evenly spaced): the master's decoded Y vs the
    graded, captioned, uncompressed frame from the SAME filter graph (assemble.final_graph): SSIM ≥ 0.985, PSNR ≥ 40 dB.
 3. Grade does not soften: mean |Laplacian| of graded (no captions) ≥ 95 % of the raw render; ΔE76 inside grey-stone
    masks ≤ 4 (mask = low-saturation, mid-luma, blue-leaning grey pixels of the raw render, inside the central 70 % of
    the frame; applies to frames where that mask covers ≥ 0.5 % of the frame, ≥ 4 such frames required). The tint is
    measured against the grade minus its vignette (a deliberate radial lightness falloff, not a
    tint; on Nobody it alone darkens central stones ~3.6 L*); the full-grade ΔE is reported beside it.
 4. qc-crops.png: 600×500 1:1 crops (raw / graded / master) of 4 frames incl. a fast-motion frame and a face close-up.
--before-after adds the Session 6 pipeline (σ 24 full-frame bloom, 1080, CRF 20 preset medium) measured on the same
frames for the PROGRESS table. Pure metric helpers are tested in tests/v2/test_finish.py.
"""
import argparse, json, os, re, subprocess, sys, tempfile
from pathlib import Path
import numpy as np
from PIL import Image, ImageDraw, ImageFont

sys.path.insert(0, str(Path(__file__).resolve().parent))
import assemble as A  # noqa: E402

TH = {'width_height': [1440, 2560], 'fps': '30/1', 'pix_fmt': 'yuv420p', 'color': ['bt709', 'bt709', 'bt709', 'tv'], 'min_video_kbps': 16000,
      'lufs': -14.0, 'lufs_tol': 1.0, 'max_true_peak': -1.0, 'min_ssim': .985, 'min_psnr': 40.0, 'min_sharp_ratio': .95, 'max_delta_e': 4.0,
      'min_stone_frac': .005, 'min_tint_frames': 4}   # tint applies where stone/wall covers ≥ 0.5 % of the frame


# ---------------- pure helpers ----------------
def box(a, k=7):
    """Mean over k×k windows (valid region) via an integral image."""
    c = np.pad(a, ((1, 0), (1, 0))).cumsum(0).cumsum(1)
    return (c[k:, k:] - c[:-k, k:] - c[k:, :-k] + c[:-k, :-k]) / (k * k)


def ssim(x, y, k=7):
    """SSIM on 8-bit planes, uniform k×k window (as skimage's default), mean over the frame."""
    x = x.astype(np.float64); y = y.astype(np.float64); C1, C2 = (.01 * 255) ** 2, (.03 * 255) ** 2
    mx, my = box(x, k), box(y, k); sxx = box(x * x, k) - mx * mx; syy = box(y * y, k) - my * my; sxy = box(x * y, k) - mx * my
    n = k * k / (k * k - 1); sxx, syy, sxy = sxx * n, syy * n, sxy * n
    return float(np.mean((2 * mx * my + C1) * (2 * sxy + C2) / ((mx * mx + my * my + C1) * (sxx + syy + C2))))


def psnr(x, y):
    mse = np.mean((x.astype(np.float64) - y.astype(np.float64)) ** 2)
    return float('inf') if mse == 0 else float(10 * np.log10(255 ** 2 / mse))


def laplacian_mean(y):
    """Mean absolute 4-neighbour Laplacian (a sharpness measure; blur lowers it)."""
    y = y.astype(np.float64)
    return float(np.mean(np.abs(4 * y[1:-1, 1:-1] - y[:-2, 1:-1] - y[2:, 1:-1] - y[1:-1, :-2] - y[1:-1, 2:])))


def luma(rgb):
    """BT.709 full-range luma of an 8-bit RGB array."""
    r = rgb.astype(np.float64); return .2126 * r[..., 0] + .7152 * r[..., 1] + .0722 * r[..., 2]


def yuv444_to_rgb(y, u, v):
    """BT.709 limited range → 8-bit RGB."""
    Y = (y.astype(np.float64) - 16) * 255 / 219; Cb = (u.astype(np.float64) - 128) * 255 / 224; Cr = (v.astype(np.float64) - 128) * 255 / 224
    R = Y + 1.5748 * Cr; G = Y - .1873 * Cb - .4681 * Cr; B = Y + 1.8556 * Cb
    return np.clip(np.stack([R, G, B], -1), 0, 255).round().astype(np.uint8)


def rgb_to_lab(rgb):
    c = rgb.astype(np.float64) / 255; c = np.where(c <= .04045, c / 12.92, ((c + .055) / 1.055) ** 2.4)
    M = np.array([[.4124, .3576, .1805], [.2126, .7152, .0722], [.0193, .1192, .9505]]); xyz = c @ M.T / np.array([.95047, 1.0, 1.08883])
    f = np.where(xyz > (6 / 29) ** 3, np.cbrt(xyz), xyz / (3 * (6 / 29) ** 2) + 4 / 29)
    return np.stack([116 * f[..., 1] - 16, 500 * (f[..., 0] - f[..., 1]), 200 * (f[..., 1] - f[..., 2])], -1)


def stone_mask(rgb, centre=.7):
    """Grey, blue-leaning, mid-luma pixels (the world's stone and walls), inside the central `centre` of the frame."""
    r = rgb.astype(np.float64); mx, mn = r.max(-1), r.min(-1); sat = (mx - mn) / np.maximum(mx, 1); L = luma(rgb)
    m = (sat < .2) & (L > 70) & (L < 200) & (r[..., 2] >= r[..., 0])
    h, w = m.shape; my, mx_ = int(h * (1 - centre) / 2), int(w * (1 - centre) / 2)
    c = np.zeros_like(m); c[my:h - my, mx_:w - mx_] = True
    return m & c


def delta_e(rgb_a, rgb_b, mask):
    if mask.sum() < 500: return None
    d = np.linalg.norm(rgb_to_lab(rgb_a)[mask] - rgb_to_lab(rgb_b)[mask], axis=-1)
    return float(d.mean())


def pick_frames(plan_shots, total, fps=30, n_fast=6, n_even=6):
    """The midpoints of the n_fast fastest-camera shots (plan.json speed) + n_even evenly spaced frames; unique, sorted."""
    fast = sorted(plan_shots, key=lambda s: -s.get('speed', 0))[:n_fast]
    picks = {min(total - 1, round((s['t'] + s['dur'] / 2) * fps)): 'fast:' + s['id'] for s in fast}
    for i in range(n_even):
        f = round((i + .5) * total / n_even)
        while f in picks: f += 1
        picks[min(total - 1, f)] = 'even'
    return sorted(picks.items())


WAIVABLE = {'tint': ('stone ΔE', 'for the tint check')}


def split_waived(fails, waive):
    """Owner waiver (opt-in): failures of the named checks move to a recorded 'waived' list → (fails, waived)."""
    keys = [k.strip() for k in waive.split(',') if k.strip()]
    bad = [k for k in keys if k not in WAIVABLE]
    if bad: raise SystemExit(f'unknown waiver {bad} (waivable: {sorted(WAIVABLE)})')
    hit = lambda f: any(p in f for k in keys for p in WAIVABLE[k])
    return [f for f in fails if not hit(f)], [f for f in fails if hit(f)]


def evaluate(m, th=TH, fallback=False):
    """Pass/fail of a metrics dict → list of failure strings (empty = pass)."""
    f = []
    size = [1080, 1920] if fallback else th['width_height']
    if [m['width'], m['height']] != size: f.append(f"size {m['width']}×{m['height']} ≠ {size[0]}×{size[1]}")
    if m['fps'] != th['fps']: f.append(f"fps {m['fps']}")
    if m['pix_fmt'] != th['pix_fmt']: f.append(f"pix_fmt {m['pix_fmt']}")
    if m['color'] != th['color']: f.append(f"colour tags {m['color']}")
    if m['audio_codec'] != 'aac': f.append(f"audio {m['audio_codec']}")
    if m['video_kbps'] < th['min_video_kbps']: f.append(f"video bitrate {m['video_kbps']} kb/s < {th['min_video_kbps']}")
    if abs(m['lufs'] - th['lufs']) > th['lufs_tol']: f.append(f"loudness {m['lufs']} LUFS")
    if m['true_peak'] > th['max_true_peak']: f.append(f"true peak {m['true_peak']} dB > {th['max_true_peak']}")
    px = m['width'] * m['height']
    tint = [fr for fr in m.get('frames', []) if fr.get('delta_e') is not None and fr.get('stone_px', px) >= th['min_stone_frac'] * px]
    if m.get('frames') and len(tint) < th['min_tint_frames']: f.append(f"only {len(tint)} frames with ≥ {th['min_stone_frac']:.1%} stone/wall (need {th['min_tint_frames']}) for the tint check")
    for fr in m.get('frames', []):
        if fr['ssim'] < th['min_ssim']: f.append(f"frame {fr['frame']}: SSIM {fr['ssim']:.4f} < {th['min_ssim']}")
        if fr['psnr'] < th['min_psnr']: f.append(f"frame {fr['frame']}: PSNR {fr['psnr']:.2f} < {th['min_psnr']}")
        if fr['sharp_ratio'] < th['min_sharp_ratio']: f.append(f"frame {fr['frame']}: graded sharpness {fr['sharp_ratio']:.3f} of raw < {th['min_sharp_ratio']}")
        if fr in tint and fr['delta_e'] > th['max_delta_e']: f.append(f"frame {fr['frame']}: stone ΔE {fr['delta_e']:.2f} > {th['max_delta_e']}")
    return f


# ---------------- I/O ----------------
def run(cmd): return subprocess.run(cmd, capture_output=True, check=True)


def raw_planes(buf, w, h, fmt):
    """Split rawvideo bytes of one frame into Y, U, V (U/V at full size for 444, upsampled ×2 nearest for 420)."""
    n = w * h; y = np.frombuffer(buf[:n], np.uint8).reshape(h, w)
    if fmt == 'yuv444p': return y, np.frombuffer(buf[n:2 * n], np.uint8).reshape(h, w), np.frombuffer(buf[2 * n:3 * n], np.uint8).reshape(h, w)
    q = n // 4; u = np.frombuffer(buf[n:n + q], np.uint8).reshape(h // 2, w // 2); v = np.frombuffer(buf[n + q:n + 2 * q], np.uint8).reshape(h // 2, w // 2)
    return y, u.repeat(2, 0).repeat(2, 1), v.repeat(2, 0).repeat(2, 1)


def decode_master(video, frames, w, h):
    expr = '+'.join(f'eq(n\\,{f})' for f in frames)
    out = run(['ffmpeg', '-v', 'error', '-i', video, '-vf', f"select='{expr}'", '-vsync', '0', '-f', 'rawvideo', '-pix_fmt', 'yuv420p', '-']).stdout
    size = w * h * 3 // 2
    return {f: raw_planes(out[i * size:(i + 1) * size], w, h, 'yuv420p') for i, f in enumerate(frames)}


def reference(frames_dir, f, src_size, captions, fps=30, luts=((), None)):
    """The uncompressed graded frame with captions ('master' chain) and without ('graded'), from the same graph."""
    g, _ = A.final_graph(src_size, captions, 0.0, offset_frames=f, fps=fps, outputs=('master', 'graded'), fmt='yuv444p', shot_luts=luts[0], lut=luts[1])
    with tempfile.TemporaryDirectory() as t:
        run(['ffmpeg', '-v', 'error', '-y', '-framerate', str(fps), '-start_number', str(f), '-i', os.path.join(frames_dir, 'frame-%05d.png'), '-frames:v', '1',
             '-filter_complex', g, '-map', '[master]', '-frames:v', '1', '-f', 'rawvideo', f'{t}/m.yuv', '-map', '[graded]', '-frames:v', '1', '-f', 'rawvideo', f'{t}/g.yuv'])
        W, H = A.MASTER_SIZE
        return raw_planes(open(f'{t}/m.yuv', 'rb').read(), W, H, 'yuv444p'), raw_planes(open(f'{t}/g.yuv', 'rb').read(), W, H, 'yuv444p')


def graded_no_vignette(frames_dir, f, src_size, fps=30):
    """The same grade without its vignette (for the tint check only: the vignette darkens, it does not tint)."""
    g, _ = A.final_graph(src_size, None, 0.0, offset_frames=f, fps=fps, outputs=('graded',), vignette=False)
    with tempfile.TemporaryDirectory() as t:
        run(['ffmpeg', '-v', 'error', '-y', '-framerate', str(fps), '-start_number', str(f), '-i', os.path.join(frames_dir, 'frame-%05d.png'), '-frames:v', '1',
             '-filter_complex', g, '-map', '[graded]', '-frames:v', '1', '-f', 'rawvideo', f'{t}/n.yuv'])
        return yuv444_to_rgb(*raw_planes(open(f'{t}/n.yuv', 'rb').read(), *A.MASTER_SIZE, 'yuv444p'))


def raw_rgb(frames_dir, f, up=False):
    im = Image.open(os.path.join(frames_dir, f'frame-{f:05d}.png')).convert('RGB')
    if up: im = im.resize(A.MASTER_SIZE, Image.LANCZOS)
    return np.asarray(im)


def busiest_window(y, cw=600, ch=500, step=100):
    """Top-left of the cw×ch window with the most edge energy (where softness would show)."""
    lap = np.abs(4 * y[1:-1, 1:-1].astype(float) - y[:-2, 1:-1] - y[2:, 1:-1] - y[1:-1, :-2] - y[1:-1, 2:])
    best, at = -1, (0, 0)
    for yy in range(0, lap.shape[0] - ch, step):
        for xx in range(0, lap.shape[1] - cw, step):
            e = lap[yy:yy + ch, xx:xx + cw].mean()
            if e > best: best, at = e, (xx, yy)
    return at


def before_after(frames_dir, picks, src_size, captions, fps=30):
    """Session 6 pipeline vs A2 on the same frames: grade sharpness (graded / raw) and encode SSIM/PSNR of a 3 s clip
    around the fastest shot (old: 1080, σ 24 bloom, CRF 20 medium; new: 1440, A2 grade, CRF 14 slow/animation)."""
    rows = {'old_sharp': [], 'new_sharp': []}
    with tempfile.TemporaryDirectory() as t:
        for f, _ in picks:
            raw = raw_rgb(frames_dir, f)
            raw1080 = np.asarray(Image.fromarray(raw).resize(A.FALLBACK_SIZE, Image.LANCZOS))
            Image.fromarray(raw1080).save(f'{t}/r.png')
            run(['ffmpeg', '-v', 'error', '-y', '-i', f'{t}/r.png', '-vf', A.OLD_GRADE + ',format=yuv444p', '-f', 'rawvideo', f'{t}/o.yuv'])
            oy = raw_planes(open(f'{t}/o.yuv', 'rb').read(), *A.FALLBACK_SIZE, 'yuv444p')[0]
            rows['old_sharp'].append(laplacian_mean((oy.astype(float) - 16) * 255 / 219) / laplacian_mean(luma(raw1080)))
            _, (gy, _, _) = reference(frames_dir, f, src_size, None, fps)
            rows['new_sharp'].append(laplacian_mean((gy.astype(float) - 16) * 255 / 219) / laplacian_mean(luma(raw)))
        fast = next(f for f, why in picks if why.startswith('fast'))
        start = max(0, fast - 45); mid = fast - start
        enc = {}
        for name, size, vf, args in [('old', A.FALLBACK_SIZE, f"scale={A.FALLBACK_SIZE[0]}:{A.FALLBACK_SIZE[1]}:flags=lanczos,{A.OLD_GRADE}", ['-preset', 'medium', '-crf', '20']),
                                     ('new', A.MASTER_SIZE, None, ['-preset', 'slow', '-tune', 'animation', '-crf', '14'])]:
            if name == 'new':   # the A2 chain without captions, exactly as assemble builds it
                g, _ = A.final_graph(src_size, None, outputs=('graded',)); filt = ['-filter_complex', g, '-map', '[graded]']
            else:
                filt = ['-vf', vf + ',format=yuv444p']
            inp = ['-framerate', str(fps), '-start_number', str(start), '-i', os.path.join(frames_dir, 'frame-%05d.png'), '-frames:v', '90']
            run(['ffmpeg', '-v', 'error', '-y', *inp, *filt, '-f', 'rawvideo', '-pix_fmt', 'yuv444p', f'{t}/{name}-ref.yuv'])
            run(['ffmpeg', '-v', 'error', '-y', *inp, *filt, '-c:v', 'libx264', *args, '-pix_fmt', 'yuv420p', f'{t}/{name}.mp4'])
            W, H = size; n = W * H * 3
            ref = raw_planes(open(f'{t}/{name}-ref.yuv', 'rb').read()[mid * n:(mid + 1) * n], W, H, 'yuv444p')[0]
            dec = decode_master(f'{t}/{name}.mp4', [mid], W, H)[mid][0]
            kbps = os.path.getsize(f'{t}/{name}.mp4') * 8 / 3 / 1000
            enc[name] = {'ssim': round(ssim(ref, dec), 4), 'psnr': round(psnr(ref, dec), 2), 'clipKbps': round(kbps)}
    return {'gradeSharpness': {'old': round(float(np.mean(rows['old_sharp'])), 3), 'new': round(float(np.mean(rows['new_sharp'])), 3)},
            'encode': enc, 'clip': {'from': start, 'frames': 90, 'measured': fast}}


def main():
    a = argparse.ArgumentParser(); a.add_argument('--story', required=True); a.add_argument('--video', required=True)
    a.add_argument('--frames', default='renders/v2/final1440/frames'); a.add_argument('--captions'); a.add_argument('--fallback', action='store_true')
    a.add_argument('--before-after', action='store_true'); a.add_argument('--out')
    a.add_argument('--source-video', help='near-lossless picture instead of --frames (render farm)')
    a.add_argument('--plan', help='plan.json (default review/<slug>/plan.json)')
    a.add_argument('--fps', type=int, help='output fps (default: the story spec fps, else 30)')
    a.add_argument('--waive', default='', help='owner waiver (opt-in, per story): comma list of checks (tint) whose failures are recorded under "waived", not dropped')
    o = a.parse_args()
    slug = o.story; out = o.out or f'review/{slug}/qc.json'; captions = o.captions or f'stories/{slug}/build/captions.ass'
    spec_p = f'stories/{slug}/episode.json'   # format v5 specs run at 24 fps; others stay at 30
    fps = o.fps or (json.load(open(spec_p)).get('fps', 30) if os.path.exists(spec_p) else 30); th = {**TH, 'fps': f'{fps}/1'}
    luts = A.spec_luts(spec_p, o.out or f'review/{slug}/qc.json', fps) if os.path.exists(spec_p) else ((), None)   # reference graded like the master (look4 + per-shot grades)
    pr, v, au = A.probe_video(o.video); lufs, tp = A.measure(o.video)
    m = {'video': o.video, 'width': v['width'], 'height': v['height'], 'fps': v['r_frame_rate'], 'pix_fmt': v.get('pix_fmt'),
         'color': [v.get('color_space'), v.get('color_primaries'), v.get('color_transfer'), v.get('color_range')],
         'audio_codec': au[0]['codec_name'] if au else None, 'video_kbps': round(int(v.get('bit_rate') or 0) / 1000), 'MB': round(int(pr['format']['size']) / 1e6, 1),
         'duration': round(float(pr['format']['duration']), 3), 'lufs': lufs, 'true_peak': tp, 'render_path': 'fallback-1080-upscaled' if o.fallback else 'native-1440'}
    plan = json.load(open(o.plan or f'review/{slug}/plan.json'))
    tmp = None
    if o.source_video:   # render farm: the raw reference is the near-lossless concatenated segments; pull only the 12 frames
        st = json.loads(subprocess.run(['ffprobe', '-v', 'error', '-select_streams', 'v:0', '-count_packets', '-show_entries', 'stream=nb_read_packets', '-of', 'json', o.source_video],
                                       capture_output=True, text=True, check=True).stdout)['streams'][0]
        total = int(st['nb_read_packets']); picks = pick_frames(plan['shots'], total, fps)
        tmp = tempfile.TemporaryDirectory(); o.frames = tmp.name
        expr = '+'.join(f'eq(n\\,{f})' for f, _ in picks)
        run(['ffmpeg', '-v', 'error', '-i', o.source_video, '-vf', f"select='{expr}'", '-vsync', '0', f'{tmp.name}/x-%02d.png'])
        for k, (f, _) in enumerate(picks): os.rename(f'{tmp.name}/x-{k + 1:02d}.png', f'{tmp.name}/frame-{f:05d}.png')
        src_size = Image.open(f'{tmp.name}/frame-{picks[0][0]:05d}.png').size
    else:
        srcs = sorted(Path(o.frames).glob('frame-*.png')); total = len(srcs)
        src_size = Image.open(srcs[0]).size
        picks = pick_frames(plan['shots'], total, fps)
    W, H = A.MASTER_SIZE
    dec = decode_master(o.video, [f for f, _ in picks], W, H)
    rows, crops = [], []
    for f, why in picks:
        (ry, _, _), (gy, gu, gv) = reference(o.frames, f, src_size, captions, fps, luts)
        my = dec[f][0]
        raw = raw_rgb(o.frames, f, up=src_size != A.MASTER_SIZE); graded = yuv444_to_rgb(gy, gu, gv)
        sharp = laplacian_mean((gy.astype(float) - 16) * 255 / 219) / laplacian_mean(luma(raw))
        mask = stone_mask(raw); r2 = lambda d: None if d is None else round(d, 2)
        rows.append({'frame': f, 'why': why, 'ssim': round(ssim(ry, my), 4), 'psnr': round(psnr(ry, my), 2), 'sharp_ratio': round(sharp, 3),
                     'delta_e': r2(delta_e(raw, graded_no_vignette(o.frames, f, src_size, fps), mask)),       # gate: tint (grade minus its vignette)
                     'delta_e_with_vignette': r2(delta_e(raw, graded, mask)), 'stone_px': int(mask.sum())})
        crops.append((f, why, raw, graded, yuv444_to_rgb(*dec[f])))
    m['frames'] = rows
    fails = evaluate(m, th, fallback=o.fallback)
    fails, waived = split_waived(fails, o.waive)
    # crop sheet: the fastest frame, the frame with the biggest face (close-up shots: S03/S55-like inserts), two more
    order = [c for c in crops if c[1].startswith('fast')][:1] + [c for c in crops if not c[1].startswith('fast')]
    chosen = order[:1]
    close = [c for c in crops if any(k in c[1] for k in ('S03', 'S55', 'S12', 'S43', 'S51'))]
    chosen += [close[0]] if close else []
    chosen += [c for c in order if c not in chosen][:4 - len(chosen)]
    cw, ch, lab = 600, 500, 26
    sheet = Image.new('RGB', (3 * cw, len(chosen) * (ch + lab)), '#111'); d = ImageDraw.Draw(sheet); font = ImageFont.load_default(size=16)
    for r, (f, why, raw, graded, mst) in enumerate(chosen):
        x0, y0 = busiest_window(luma(graded).astype(np.uint8))
        for c, (name, img) in enumerate([('raw render', raw), ('graded (A2)', graded), ('master decoded', mst)]):
            sheet.paste(Image.fromarray(img[y0:y0 + ch, x0:x0 + cw]), (c * cw, r * (ch + lab) + lab))
            d.text((c * cw + 6, r * (ch + lab) + 4), f'{name} - frame {f} ({why}) 1:1 at {x0},{y0}', fill='#ffd84a', font=font)
    os.makedirs(os.path.dirname(out), exist_ok=True); sheet.save(os.path.join(os.path.dirname(out), 'qc-crops.png'))
    rep = {**m, 'thresholds': th, 'failures': fails, 'waived': waived, 'result': 'FAIL' if fails else 'PASS', 'crops': [c[0] for c in chosen],
           'stoneMask': 'raw pixels with saturation < 0.2, 70 < luma < 200, blue ≥ red, inside the central 70 %',
           'tintCheck': 'ΔE76 raw vs the A2 grade without its vignette (vignette = lightness falloff, not a tint), on frames whose stone/wall mask covers ≥ 0.5 % of the frame (smaller masks are stray grey pixels in dark scenes; their values are still listed); delta_e_with_vignette reported'}
    if o.before_after: rep['beforeAfter'] = before_after(o.frames, picks, src_size, captions)
    with open(out, 'w') as fh: json.dump(rep, fh, indent=1)
    print(json.dumps({k: rep[k] for k in ('width', 'height', 'video_kbps', 'MB', 'lufs', 'true_peak', 'result', 'failures', 'waived')} |
                     {'minSSIM': min(r['ssim'] for r in rows), 'minPSNR': min(r['psnr'] for r in rows), 'minSharp': min(r['sharp_ratio'] for r in rows),
                      'maxDeltaE': max((r['delta_e'] or 0) for r in rows)} | ({'beforeAfter': rep['beforeAfter']} if o.before_after else {})))
    sys.exit(1 if fails else 0)


if __name__ == '__main__':
    main()
