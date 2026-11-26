"""pacing.py <pacing.json> <out.png>: cuts per 10 s as bars against each phase's target band (P4 check h). Pure PIL."""
import json, sys
from PIL import Image, ImageDraw, ImageFont

COL = {'opening': (255, 170, 60), 'middle': (90, 160, 255), 'emotion': (240, 120, 170), 'climax': (235, 70, 60), 'payoff': (90, 200, 120)}

def draw(bins, out, title=''):
    W, H, L, B, T = 1200, 520, 70, 70, 60
    im = Image.new('RGB', (W, H), (24, 26, 32)); d = ImageDraw.Draw(im)
    try: f = ImageFont.truetype('DejaVuSans.ttf', 18); fs = ImageFont.truetype('DejaVuSans.ttf', 14)
    except Exception: f = fs = ImageFont.load_default()
    ymax = 10; ph = H - B - T; n = max(1, len(bins)); bw = (W - L - 30) / n
    y = lambda v: H - B - v / ymax * ph
    d.text((L, 16), title or 'cuts per 10 s', fill=(235, 235, 240), font=f)
    for v in range(0, ymax + 1, 2):
        d.line([(L, y(v)), (W - 20, y(v))], fill=(52, 56, 66)); d.text((L - 34, y(v) - 8), str(v), fill=(170, 175, 190), font=fs)
    for i, b in enumerate(bins):
        x0 = L + i * bw + 6; x1 = L + (i + 1) * bw - 6; c = COL.get(b['phase'], (200, 200, 200)); lo, hi = b['target']
        d.rectangle([x0 - 3, y(hi), x1 + 3, y(lo)], outline=(210, 210, 220), width=2)   # target band
        d.rectangle([x0, y(b['cuts']), x1, y(0)], fill=c if b['ok'] else (c[0] // 2, c[1] // 2, c[2] // 2))
        if not b['ok']: d.rectangle([x0, y(b['cuts']), x1, y(0)], outline=(255, 60, 60), width=3)
        d.text((x0, y(b['cuts']) - 20), f"{b['cuts']:g}", fill=(255, 255, 255), font=fs)
        d.text((x0 - 2, H - B + 8), f"{b['from']:g}", fill=(170, 175, 190), font=fs); d.text((x0 - 2, H - B + 26), b['phase'][:7], fill=c, font=fs)
    d.text((L, H - 24), 'bar = cuts per 10 s · box = target band of the phase · dim bar with red edge = outside the band (WARN)', fill=(170, 175, 190), font=fs)
    im.save(out)

if __name__ == '__main__':
    p = json.load(open(sys.argv[1])); draw(p['bins'], sys.argv[2], p.get('title', ''))
