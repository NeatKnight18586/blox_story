#!/usr/bin/env python3
"""Mean luma (Rec. 709, display values) per still, for the engine/moods7.json gate. Usage: measure-b.py <dir> <name>…"""
import sys, json
import numpy as np
from PIL import Image
out = {}
for n in sys.argv[2:]:
    c = np.asarray(Image.open(f'{sys.argv[1]}/{n}.png').convert('RGB')).astype(float) / 255
    out[n] = {'luma': round(float((c @ np.array([.2126, .7152, .0722])).mean()), 4), 'clip': round(float((c.max(2) > .99).mean()), 4)}
print(json.dumps(out))
