# scripts/v2/abgrid.py — tuft P3: a quick before/after grid of gate frames (look only at grids, never single frames).
# Usage: python3 scripts/v2/abgrid.py <out.png> <cols> <img> ... (each image resized to 270 × 480)
import sys
from PIL import Image
out, cols, fs = sys.argv[1], int(sys.argv[2]), sys.argv[3:]
W, H = 270, 480; rows = (len(fs) + cols - 1) // cols; s = Image.new('RGB', (W * cols, H * rows), '#101216')
for i, f in enumerate(fs): s.paste(Image.open(f).convert('RGB').resize((W, H)), ((i % cols) * W, (i // cols) * H))
s.save(out); print(out, s.size)
