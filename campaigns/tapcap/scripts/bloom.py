#!/usr/bin/env python3
"""Display-referred bloom for lookdev panels (Pass A revision §3): threshold 0.85 on luminance, Gaussian blur (σ = 1.2 % of the
panel height), added back at intensity 0.25. In place. Usage: bloom.py <png> [<png> ...]"""
import sys
import numpy as np
from PIL import Image, ImageFilter
TH, K, SIG = .85, .25, .012
for f in sys.argv[1:]:
    im = Image.open(f).convert('RGB'); c = np.asarray(im).astype(float) / 255
    lum = c @ np.array([.2126, .7152, .0722]); hi = c * np.clip((lum - TH) / (1 - TH), 0, 1)[..., None]
    b = np.asarray(Image.fromarray((hi * 255).astype('uint8')).filter(ImageFilter.GaussianBlur(max(1, SIG * im.height)))).astype(float) / 255
    Image.fromarray((np.clip(c + K * b, 0, 1) * 255).astype('uint8')).save(f)
