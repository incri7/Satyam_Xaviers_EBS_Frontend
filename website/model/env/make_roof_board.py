# The board on the school's roof, facing the front (the client asked for one): the school's crest, then its name,
# white on the school's navy, a thin light edge like the gate sign's. 14 x 2 m in the model (env_school.py).
# Run: python make_roof_board.py   (writes data/street/school_roof_board.png)
import os
from PIL import Image, ImageDraw, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, 'data', 'street', 'school_roof_board.png')
CREST = os.path.join(HERE, '..', '..', 'public', 'photos', 'crest.png')
W, H = 2800, 400                      # 200 px a metre
NAVY, EDGE, WHITE, SKY = (19, 41, 91), (205, 212, 220), (246, 247, 244), (180, 216, 228)

img = Image.new('RGB', (W, H), NAVY); d = ImageDraw.Draw(img)
d.rectangle([10, 10, W - 11, H - 11], outline=EDGE, width=8)
# the crest on a white disc, at the left
r = 150; cx, cy = 70 + r, H // 2
d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=WHITE)
crest = Image.open(CREST).convert('RGBA').resize((2 * r - 20, 2 * r - 20), Image.LANCZOS)
img.paste(crest, (cx - r + 10, cy - r + 10), crest)
# the name, as large as the board allows, and the place under it
x0, x1 = cx + r + 70, W - 70
name = "SATYAM XAVIER'S ENGLISH SECONDARY BOARDING SCHOOL"
sub = 'HETAUDA-4, CHISAPANI, MAKWANPUR'
font = 'C:/Windows/Fonts/segoeuib.ttf'
size = 140
while True:
    f = ImageFont.truetype(font, size)
    bb = d.textbbox((0, 0), name, font=f)
    if bb[2] - bb[0] <= x1 - x0 or size < 40: break
    size -= 2
fs = ImageFont.truetype(font, round(size * 0.52))
bs = d.textbbox((0, 0), sub, font=fs)
total = (bb[3] - bb[1]) + 26 + (bs[3] - bs[1])
y = (H - total) // 2
d.text((x0 + (x1 - x0 - (bb[2] - bb[0])) // 2 - bb[0], y - bb[1]), name, font=f, fill=WHITE)
d.text((x0 + (x1 - x0 - (bs[2] - bs[0])) // 2 - bs[0], y + (bb[3] - bb[1]) + 26 - bs[1]), sub, font=fs, fill=SKY)
img.save(OUT)
print('roof board written', size)
