# Paints the school's facade textures from the client's photos (IMG_3017, 3019, 3020, 3082-3086):
# one storey of the front, one storey of the long side, the slate-blue slab edge with its rain
# streaks, the semi-basement gate, and the admission banner cut from IMG_3019.
# Writes into data/street. Run with the local Python (needs Pillow and numpy).
import math, random
import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageOps

OUT = r'C:/Users/legio/Workspace/Satyam_Xaviers_EBS_Frontend/website/model/env/data/street'
PHOTOS = r'C:/Users/legio/Downloads/SXEBS/new_info/School Images/School Images'
PX = 80                        # pixels per metre
STOREY = 3.2
YELLOW, WHITE = (238, 220, 146), (242, 240, 230)
WOOD, WOOD_D = (74, 46, 32), (52, 31, 21)
GLASS = (46, 56, 66)
rnd = random.Random(3)

def m(x): return int(round(x * PX))

def wall(width_m):
    h = m(STOREY); w = m(width_m)
    img = Image.new('RGB', (w, h), WHITE)
    d = ImageDraw.Draw(img)
    # yellow up to the door heads, white above (the band the slab shades)
    d.rectangle([0, h - m(2.3), w, h], fill=YELLOW)
    d.rectangle([0, h - m(2.3) - 2, w, h - m(2.3)], fill=(222, 204, 132))
    d.rectangle([0, h - m(0.12), w, h], fill=(150, 150, 146))          # the corridor's skirting
    return img, d, w, h

def window(d, x, h, notice=True):
    x0, x1 = m(x - 0.62), m(x + 0.62); y1 = h - m(0.85); y0 = y1 - m(1.38)
    d.rectangle([x0, y0, x1, y1], fill=WOOD_D)
    d.rectangle([x0 + 5, y0 + 5, x1 - 5, y1 - 5], fill=GLASS)
    # two leaves and the grille
    d.line([(x0 + x1) // 2, y0, (x0 + x1) // 2, y1], fill=WOOD_D, width=4)
    for k in range(1, 8):
        gx = x0 + (x1 - x0) * k // 8
        d.line([gx, y0 + 5, gx, y1 - 5], fill=(30, 30, 32), width=2)
    d.line([x0, (y0 + y1) // 2, x1, (y0 + y1) // 2], fill=(30, 30, 32), width=2)
    if notice and rnd.random() < 0.8:           # the papers taped inside every classroom window
        px0 = rnd.randint(x0 + 8, (x0 + x1) // 2 - m(0.25)); py0 = rnd.randint(y0 + 8, y0 + m(0.4))
        d.rectangle([px0, py0, px0 + m(0.21), py0 + m(0.3)], fill=(236, 236, 230))
        if rnd.random() < 0.6:
            qx = rnd.randint((x0 + x1) // 2 + 6, x1 - m(0.25)); d.rectangle([qx, py0 + 6, qx + m(0.21), py0 + 6 + m(0.3)], fill=(232, 232, 226))

def door(d, x, h):
    x0, x1 = m(x - 0.52), m(x + 0.52); y1 = h - m(0.12); y0 = y1 - m(2.15)
    d.rectangle([x0, y0, x1, y1], fill=WOOD_D)
    d.rectangle([x0 + 6, y0 + 6, x1 - 6, y1], fill=WOOD)
    for py in (0.15, 0.55, 0.95, 1.4):
        d.rectangle([x0 + 14, y0 + m(py), x1 - 14, y0 + m(py + 0.32)], outline=WOOD_D, width=2)
    if rnd.random() < 0.7:
        d.rectangle([x0 + m(0.3), y0 + m(0.35), x0 + m(0.51), y0 + m(0.65)], fill=(238, 238, 232))

def grime(img, amount=0.08):
    a = np.asarray(img).astype(np.float32)
    h, w, _ = a.shape
    streak = np.repeat(np.random.default_rng(5).random((1, w)), h, 0)
    streak = np.asarray(Image.fromarray((streak * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(3))) / 255.0
    fall = np.linspace(1.0, 0.3, h)[:, None]
    a *= (1 - amount * streak * fall)[..., None]
    return Image.fromarray(np.clip(a, 0, 255).astype(np.uint8))

# the front: window, door, window, window, door, window (IMG_3017)
W_FRONT = 10.4
img, d, w, h = wall(W_FRONT)
slot = W_FRONT / 6
for i, kind in enumerate('WDWWDW'):
    x = slot * (i + 0.5)
    door(d, x, h) if kind == 'D' else window(d, x, h)
grime(img).save(f'{OUT}/school_front.png')

# the long side: classroom after classroom, a door then two windows (IMG_3082)
W_SIDE = 30.0
img, d, w, h = wall(W_SIDE)
x = 0.9
while x < W_SIDE - 0.8:
    door(d, x, h); window(d, x + 1.55, h); window(d, x + 3.05, h)
    x += 3.95
grime(img).save(f'{OUT}/school_side.png')

# the slab edge: slate blue, streaked by rain, tile 4 m x 0.45 m
fw, fh = m(4.0), m(0.45)
a = np.zeros((fh, fw, 3), np.float32); a[:] = (88, 122, 158)
g = np.random.default_rng(9)
for _ in range(36):                                      # pale lime runs from the top edge
    x0 = g.integers(0, fw); ww = g.integers(2, 9); ln = g.integers(fh // 3, fh)
    a[:ln, x0:x0 + ww] = a[:ln, x0:x0 + ww] * 0.75 + np.array((196, 204, 210)) * 0.25
a *= (0.92 + 0.08 * g.random((fh, fw)))[..., None]
a[:3] = (64, 90, 120); a[-3:] = (64, 90, 120)
Image.fromarray(np.clip(a, 0, 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(0.8)).save(f'{OUT}/school_fascia.png')

# the semi-basement under the front corridor: the collapsible steel gate (IMG_3020)
gw, gh = m(4.0), m(1.6)
img = Image.new('RGB', (gw, gh), (34, 34, 36)); d = ImageDraw.Draw(img)
for k in range(0, gw, 14):
    d.line([k, 0, k + 40, gh], fill=(70, 72, 76), width=2); d.line([k + 40, 0, k, gh], fill=(70, 72, 76), width=2)
img.save(f'{OUT}/school_gate.png')

# the admission banner on the front corridor, cut from IMG_3019 and squared up
im = ImageOps.exif_transpose(Image.open(f'{PHOTOS}/IMG_3019.JPG'))
s = im.size[0] / 1200                                    # corners read on the 1200-wide preview
quad = [(690, 776), (1078, 658), (1092, 760), (705, 877)]  # TL TR BR BL
src = [(x * s, y * s) for x, y in quad]
ow, oh = 1200, 300
A, B = [], []
for (x, y), (u, v) in zip([(0, 0), (ow, 0), (ow, oh), (0, oh)], src):
    A.append([x, y, 1, 0, 0, 0, -u * x, -u * y]); B.append(u)
    A.append([0, 0, 0, x, y, 1, -v * x, -v * y]); B.append(v)
c = np.linalg.solve(np.array(A, float), np.array(B, float))
im.transform((ow, oh), Image.PERSPECTIVE, tuple(c), Image.BICUBIC).save(f'{OUT}/school_banner.jpg', quality=90)
print('textures written')
