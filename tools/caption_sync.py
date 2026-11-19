#!/usr/bin/env python3
"""tools/caption_sync.py: R-CAP-02 sync check (Phase 6). Captions must appear within ± 1 frame of their first word's VO onset.
  python3 tools/caption_sync.py [--story egg] [--seconds 10] [--fps 24] [--out review/captions/sync.json]
Two measurements on a VO segment: (1) data: each ASS event start vs the word onset; (2) rendered: the captions burned by libass
(ffmpeg subtitles filter, the real finishing path) onto black at the episode fps, each caption's appearance frame detected from the
pixels (text mask changes) and compared with onset × fps. Pop animation off for the measurement (it starts on the same frame).
Pure helpers (detect_onsets, frame_errors) are unit-tested in tests/v2/test_captions6.py.
"""
import argparse, json, os, subprocess, sys, tempfile
from pathlib import Path
import numpy as np

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'scripts/v2'))
import captions as C  # noqa: E402
FONTS = str(ROOT / 'node_modules/@expo-google-fonts/lilita-one/400Regular')


def detect_onsets(masks, iou_new=.95):   # pop off → a held caption is pixel-identical (IoU 1.0); any new word changes it
    """Pure: frame indexes where a caption appears or changes (mask non-empty and the previous frame empty, or IoU < iou_new)."""
    out, prev = [], None
    for k, m in enumerate(masks):
        if m.any():
            if prev is None or not prev.any(): out.append(k)
            else:
                inter, union = np.logical_and(m, prev).sum(), np.logical_or(m, prev).sum()
                if inter / union < iou_new: out.append(k)
        prev = m
    return out


def frame_errors(expected, detected):
    """Pure: for each expected onset (fractional frames), the nearest detected frame's error in frames (detected − expected)."""
    d = np.array(detected, float)
    return [float(d[np.argmin(np.abs(d - e))] - e) if len(d) else None for e in expected]


def main():
    a = argparse.ArgumentParser(); a.add_argument('--story', default='egg'); a.add_argument('--seconds', type=float, default=10)
    a.add_argument('--fps', type=int, default=24); a.add_argument('--out', default='review/captions/sync.json'); o = a.parse_args()
    st = C.load_style('v6'); st['pop'] = ''; cues = json.load(open(f'stories/{o.story}/cues.json'))
    timed = [c for c in C.timing6(C.group6(cues, st, o.fps), o.fps, st['blankPause']) if c['start'] < o.seconds]
    data = [((c['start'] - c['onset']) * o.fps) for c in timed]   # ASS start vs the word onset, in frames (ASS floors to centiseconds)
    ass = C.to_ass(timed, st, (), None, o.fps, o.seconds)
    W, H = 270, 480
    with tempfile.TemporaryDirectory() as d:
        p = os.path.join(d, 's.ass'); open(p, 'w').write(ass)
        raw = subprocess.run(['ffmpeg', '-v', 'error', '-f', 'lavfi', '-i', f'color=black:s=1080x1920:r={o.fps}:d={o.seconds}', '-vf',
                              f'subtitles={p}:fontsdir={FONTS},scale={W}:{H},format=gray', '-f', 'rawvideo', '-'], capture_output=True, check=True).stdout
    fr = np.frombuffer(raw, np.uint8).reshape(-1, H, W)
    masks = [f[int(.55 * H):int(.75 * H)] > 90 for f in fr]
    det = detect_onsets(masks); exp = [c['onset'] * o.fps for c in timed]
    err = frame_errors(exp, det)
    rep = {'story': o.story, 'seconds': o.seconds, 'fps': o.fps, 'captions': len(timed), 'framesRendered': len(fr), 'detected': len(det),
           'dataErrorFrames': {'min': round(min(data), 3), 'max': round(max(data), 3)},
           'renderedErrorFrames': {'min': round(min(err), 3), 'max': round(max(err), 3), 'meanAbs': round(float(np.mean(np.abs(err))), 3)},
           'rows': [{'words': ' '.join(c['words']), 'onset': round(c['onset'], 3), 'expectedFrame': round(e, 2), 'errorFrames': round(x, 2)} for c, e, x in zip(timed, exp, err)]}
    rep['pass'] = all(-1 <= x <= 1 for x in err) and all(-1 <= x <= 1 for x in data) and len(det) == len(timed)
    Path(o.out).parent.mkdir(parents=True, exist_ok=True); json.dump(rep, open(o.out, 'w'), indent=1)
    print(json.dumps({k: rep[k] for k in ('captions', 'detected', 'dataErrorFrames', 'renderedErrorFrames', 'pass')}))
    sys.exit(0 if rep['pass'] else 1)


if __name__ == '__main__':
    main()
