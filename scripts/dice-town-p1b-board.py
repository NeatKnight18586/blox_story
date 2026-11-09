"""Compact phone-width comparison; source frames are never modified."""
from PIL import Image, ImageDraw, ImageFont
items = [('P1 A · aac0a5f', 'evidence/dice-town-p1/A.png'),
         ('P1B A · enormous die', 'evidence/dice-town-p1b/A.png'),
         ('P1 B · aac0a5f', 'evidence/dice-town-p1/B.png'),
         ('P1B B · Leo annoyance', 'evidence/dice-town-p1b/B.png')]
board = Image.new('RGB', (1560, 770), '#17232b')
draw = ImageDraw.Draw(board)
font = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', 16)
for i, (label, path) in enumerate(items):
    image = Image.open(path)
    assert image.size == (720, 1280)
    board.paste(image.resize((390, 693), Image.Resampling.LANCZOS), (i*390, 42))
    draw.text((i*390+8, 10), label, font=font, fill='white')
draw.text((8, 742), 'Actual WebGL renders · 390px phone-width review · P1 / P1B · revised framing, staging and styling', font=font, fill='white')
board.save('evidence/dice-town-p1b/comparison.jpg', quality=90)
