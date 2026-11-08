"""Small before/after board from the existing WebGL keyframe test outputs."""
from pathlib import Path
from PIL import Image, ImageDraw
out = Path('evidence/names100-s3b')
raw = Path('renders/names100-s3b-keyframes')
for name, frames in [('A', [334, 427, 474]),
                     ('B', [1300, 1366, 1388, 1420, 1470]),
                     ('C', [1490, 1528, 1562, 1628])]:
    board = Image.new('RGB', (360, len(frames) * 345), (25, 33, 40))
    draw = ImageDraw.Draw(board)
    for row, frame in enumerate(frames):
        for col, variant in enumerate(['s2', 's3b']):
            source = (raw if col == 0 else out) / f'{variant}-{frame}.png'
            with Image.open(source) as image:
                board.paste(image.convert('RGB').resize((180, 320), Image.Resampling.LANCZOS),
                            (col * 180, row * 345 + 25))
            label = 'Before' if col == 0 else 'Provisional'
            draw.text((col * 180 + 4, row * 345 + 6),
                      f'{label} g{frame} {frame / 30:.2f}s', fill='white')
    board.save(out / f'{name}-comparison.png')
