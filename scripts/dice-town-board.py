"""Compact phone-width comparison; source frames are never modified."""
from PIL import Image, ImageDraw, ImageFont
items = [('S6 pilot · native g0', 'evidence/names100-s6/native-g0.png'),
         ('Dice Plaza A · native frame 0', 'evidence/dice-town-p1/A.png'),
         ('S6 pilot · native g780', 'evidence/names100-s6/native-g780.png'),
         ('Leo B · native frame 30', 'evidence/dice-town-p1/B.png')]
board = Image.new('RGB', (1560, 770), '#17232b')
draw = ImageDraw.Draw(board)
font = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', 16)
for i, (label, path) in enumerate(items):
    image = Image.open(path)
    assert image.size == (720, 1280)
    board.paste(image.resize((390, 693), Image.Resampling.LANCZOS), (i*390, 42))
    draw.text((i*390+8, 10), label, font=font, fill='white')
draw.text((8, 742), 'Actual WebGL renders · 390px phone-width review · different scenes/cameras, not a matched before/after', font=font, fill='white')
board.save('evidence/dice-town-p1/comparison.jpg', quality=90)
