# Nepal's flag for the school's roof: two crimson pennants one above the other within a blue border, the white moon
# in the upper and the white sun in the lower, on a transparent ground so the cloth in the model takes the shape.
# Run: python make_flag.py   (writes data/street/school_flag_nepal.png)
import math, os
from PIL import Image, ImageDraw

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, 'data', 'street', 'school_flag_nepal.png')
W, H = 820, 1000                       # the flag's own proportions, about 1 : 1.22
SS = 2                                 # drawn large, then reduced: smooth edges
w, h = W * SS, H * SS
CRIMSON, BLUE, WHITE = (220, 20, 60, 255), (0, 56, 147, 255), (255, 255, 255, 255)
img = Image.new('RGBA', (w, h), (0, 0, 0, 0)); d = ImageDraw.Draw(img)
outer = [(0, 0), (w, 0.46 * h), (0.38 * w, 0.46 * h), (w, h), (0, h)]
d.polygon(outer, fill=BLUE)
b = 0.055 * w                          # the border
inner = [(b, b * 2.2), (w - b * 2.6, 0.46 * h - b), (0.38 * w - b * 0.2, 0.46 * h - b),
         (w - b * 2.4, h - b), (b, h - b)]
d.polygon(inner, fill=CRIMSON)
# the moon, upper pennant: a crescent under a disc of rays
mx, my, mr = 0.28 * w, 0.27 * h, 0.12 * w
d.pieslice([mx - mr, my - mr, mx + mr, my + mr], 0, 180, fill=WHITE)
d.pieslice([mx - mr * 0.8, my - mr * 0.95, mx + mr * 0.8, my + mr * 0.6], 0, 180, fill=CRIMSON)
for i in range(8):
    a = math.pi * (i + 0.5) / 8
    x, y = mx + math.cos(a) * mr * 0.62, my - mr * 0.15 - math.sin(a) * mr * 0.5
    d.polygon([(x, y - mr * 0.16), (x + mr * 0.07, y), (x, y + mr * 0.05), (x - mr * 0.07, y)], fill=WHITE)
d.ellipse([mx - mr * 0.38, my - mr * 0.5, mx + mr * 0.38, my - mr * 0.05], fill=WHITE)
# the sun, lower pennant: twelve rays round a disc
sx, sy, sr = 0.28 * w, 0.74 * h, 0.15 * w
pts = []
for i in range(24):
    a = i / 24 * math.tau - math.pi / 2
    r = sr if i % 2 == 0 else sr * 0.66
    pts.append((sx + math.cos(a) * r, sy + math.sin(a) * r))
d.polygon(pts, fill=WHITE)
img.resize((W, H), Image.LANCZOS).save(OUT)
print('flag written')
