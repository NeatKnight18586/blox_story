#!/usr/bin/env python3
"""scripts/v2/sheet.py — contact sheets for review (docs/V2_BRIEF.md §9, §2.3).

  python3 scripts/v2/sheet.py <frames dir | video.mp4> [--out sheet.png] [--fps 30] [--every-sec 1]
                              [--frames 0,12,24] [--labels shots.json] [--stats] [--max 60] [--long 1600]

Default: one cell per second of footage (frame 0, 30, 60, ...), at most 60 cells per sheet (extra sheets
get -2, -3 suffixes), long side at most 1600 px. --frames picks explicit frames. --stats prints mean luma
(0-255) and mean saturation (0-1) for every cell. Reviewers look at sheets, never at single frames.
"""
import argparse, glob, json, math, os, subprocess, sys, tempfile
from PIL import Image, ImageDraw, ImageFont


def frames_from_video(video, idx, tmp):
    out = []
    for i in idx:
        p = os.path.join(tmp, f'f{i:05d}.png')
        subprocess.run(['ffmpeg', '-loglevel', 'error', '-y', '-i', video, '-vf', f'select=eq(n\\,{i})', '-vframes', '1', p], check=True)
        out.append(p)
    return out


def stats(im):
    from PIL import ImageStat
    small = im.convert('RGB').resize((90, 160))
    return ImageStat.Stat(small.convert('L')).mean[0], ImageStat.Stat(small.convert('HSV')).mean[1] / 255


def main():
    a = argparse.ArgumentParser()
    a.add_argument('src'); a.add_argument('--out'); a.add_argument('--fps', type=float, default=30)
    a.add_argument('--every-sec', type=float, default=1.0); a.add_argument('--frames')
    a.add_argument('--labels', help='JSON list of {start, frames, id} shots to label cells with')
    a.add_argument('--stats', action='store_true'); a.add_argument('--max', type=int, default=60); a.add_argument('--long', type=int, default=1600)
    o = a.parse_args()

    video = os.path.isfile(o.src)
    if video:
        n = int(subprocess.run(['ffprobe', '-v', 'error', '-count_packets', '-select_streams', 'v:0', '-show_entries', 'stream=nb_read_packets', '-of', 'csv=p=0', o.src], capture_output=True, text=True, check=True).stdout.strip())
    else:
        files = sorted(glob.glob(os.path.join(o.src, 'frame-*.png'))); n = len(files)
    if not n: sys.exit('no frames')
    idx = [int(x) for x in o.frames.split(',')] if o.frames else list(range(0, n, max(1, round(o.fps * o.every_sec))))
    shots = json.load(open(o.labels)) if o.labels else None
    label = lambda i: next((f"{s['id']} " for s in shots if s['start'] <= i < s['start'] + s['frames']), '') if shots else ''

    with tempfile.TemporaryDirectory() as tmp:
        paths = frames_from_video(o.src, idx, tmp) if video else [files[i] for i in idx]
        base = o.out or os.path.join(o.src if not video else os.path.dirname(o.src) or '.', 'sheet.png')
        pages = [list(range(k, min(k + o.max, len(idx)))) for k in range(0, len(idx), o.max)]
        for pn, page in enumerate(pages):
            cols = min(len(page), 10 if len(page) > 20 else 8)
            rows = math.ceil(len(page) / cols)
            im0 = Image.open(paths[page[0]]); w0, h0 = im0.size
            cw = min(w0, int(o.long / max(cols, rows * w0 / h0))) ; ch = round(cw * h0 / w0)
            sheet = Image.new('RGB', (cols * cw, rows * (ch + 18)), '#111')
            d = ImageDraw.Draw(sheet); font = ImageFont.load_default(size=13)
            for k, j in enumerate(page):
                im = Image.open(paths[j]).convert('RGB')
                if o.stats:
                    l, s = stats(im); print(json.dumps({'frame': idx[j], 'sec': round(idx[j] / o.fps, 2), 'luma': round(l, 1), 'sat': round(s, 3)}))
                x, y = (k % cols) * cw, (k // cols) * (ch + 18)
                sheet.paste(im.resize((cw, ch), Image.LANCZOS), (x, y + 18))
                d.text((x + 4, y + 2), f'{label(idx[j])}f{idx[j]} {idx[j] / o.fps:.2f}s', fill='#ffd84a', font=font)
            path = base if pn == 0 else base.replace('.png', f'-{pn + 1}.png').replace('.jpg', f'-{pn + 1}.jpg')
            sheet.save(path); print(path, sheet.size, file=sys.stderr)


if __name__ == '__main__':
    main()
