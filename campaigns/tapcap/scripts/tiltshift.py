#!/usr/bin/env python3
"""Tilt-shift for wides (prompt §4): sharp band at 45–62 % of the frame height, blur ramping to σ = 0.9 % of height at the edges. In place."""
import sys
import numpy as np
from PIL import Image, ImageFilter
for f in sys.argv[1:]:
    im = Image.open(f).convert('RGB'); a = np.asarray(im).astype(float); b = np.asarray(im.filter(ImageFilter.GaussianBlur(.009 * im.height))).astype(float)
    y = np.linspace(0, 1, im.height)[:, None, None]; k = np.clip(np.maximum((.45 - y) / .3, (y - .62) / .3), 0, 1)
    Image.fromarray((a * (1 - k) + b * k).astype('uint8')).save(f)
