#!/usr/bin/env python3
"""scripts/v2/lut4.py — format v4 Phase 2 grade LUTs (applied in ffmpeg at assemble: zero render cost).

  python3 scripts/v2/lut4.py comedy|mystery [--out file.cube] [--size 33]

Pure: grade(preset, rgb) maps one colour; cube(preset, size) is the .cube text. Fixed numbers per preset:
  comedy  : bright, saturated, warm sun   — saturation 1.5 (AgX desaturates), warm highlights, gentle S-curve, lifted shadows, gamma .9
  memory  : sepia (mono, warm split, lifted blacks) · dawn: rose highlights, cool shadows
  mystery : desaturated, cool shadows, warm practicals — saturation 0.8, blue in the lows, amber in the highs, gamma .9 (the night base is already dark)
"""
import argparse, sys

PRESETS = {
    'comedy': {'sat': 1.5, 'contrast': .12, 'lift': .02, 'gamma': .9, 'shadow': (0.0, 0.0, .01), 'high': (.035, .012, -.03)},
    # format v5 per-shot grades (shot `grade`, applied over the shot's time range only)
    'memory': {'sat': 0.0, 'contrast': .06, 'lift': .05, 'gamma': .95, 'shadow': (.05, .02, -.05), 'high': (.09, .04, -.08)},   # sepia: mono + warm split, lifted blacks
    'dawn': {'sat': .9, 'contrast': .08, 'lift': .03, 'gamma': .93, 'shadow': (-.01, .0, .04), 'high': (.07, .025, -.01)},       # rose highlights, cool lows
    'mystery': {'sat': .8, 'contrast': .1, 'lift': 0.0, 'gamma': .9, 'shadow': (-.015, .005, .045), 'high': (.045, .015, -.035)},
}
VIGNETTE = 'vignette=angle=0.42'   # light vignette after the LUT (ffmpeg)


def clamp(v): return 0.0 if v < 0 else 1.0 if v > 1 else v


def grade(preset, rgb):
    p = PRESETS[preset]; r, g, b = rgb
    l = .2126 * r + .7152 * g + .0722 * b
    r, g, b = (l + (c - l) * p['sat'] for c in (r, g, b))
    out = []
    for k, c in enumerate((r, g, b)):
        c = clamp(c) ** p['gamma']
        c = c + p['contrast'] * (c - .5) * (1 - abs(2 * c - 1))      # S-curve, flat at the ends
        c = c + p['lift'] * (1 - c)
        c = c + p['shadow'][k] * (1 - l) ** 2 + p['high'][k] * l ** 2  # split toning
        out.append(clamp(c))
    return tuple(out)


def cube(preset, size=33):
    lines = [f'TITLE "blox_story v4 {preset}"', f'LUT_3D_SIZE {size}']
    for bi in range(size):
        for gi in range(size):
            for ri in range(size):   # .cube: red changes fastest
                lines.append('%.6f %.6f %.6f' % grade(preset, (ri / (size - 1), gi / (size - 1), bi / (size - 1))))
    return '\n'.join(lines) + '\n'


def main():
    a = argparse.ArgumentParser(); a.add_argument('preset', choices=sorted(PRESETS)); a.add_argument('--out'); a.add_argument('--size', type=int, default=33); o = a.parse_args()
    txt = cube(o.preset, o.size)
    if o.out: open(o.out, 'w').write(txt); print(o.out)
    else: sys.stdout.write(txt)


if __name__ == '__main__':
    main()
