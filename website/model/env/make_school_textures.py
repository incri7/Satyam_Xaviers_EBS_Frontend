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

# the long side: classroom after classroom, a door then two windows (IMG_3082), round the collapsible gate in the
# exact middle of every floor. As the client set it out: nothing under the gate; on its right only the farthest
# door; on its left the two doors nearest it. The other doors' places are windows where one fits, else wall.
W_SIDE = 30.0
L_SIDE = 60.5 - 30.5 - 1.6        # the long side as the model shows it (SB - SF - CORR, env_school.py)
GATE_X, GATE_HALF = L_SIDE / 2, 1.5
def side_layout():
    items, x = [], 0.9
    while x < W_SIDE - 0.8:
        items += [('D', x), ('W', x + 1.55), ('W', x + 3.05)]; x += 3.95
    items = [(k, x) for k, x in items if x + 0.65 <= L_SIDE]
    items = [(k, x) for k, x in items if abs(x - GATE_X) >= GATE_HALF + (0.62 if k == 'W' else 0.52) + 0.08]
    doors = [x for k, x in items if k == 'D']
    keep = set(sorted([x for x in doors if x < GATE_X], key=lambda x: GATE_X - x)[:2] + [max(x for x in doors if x > GATE_X)])
    out = [(k, x) for k, x in items if k == 'W' or x in keep]
    for k, x in items:                       # a removed door's place: a window where one fits, else plain wall
        if k == 'D' and x not in keep and all(abs(x - ox) >= 1.34 for _, ox in out):
            out.append(('W', x))
    return sorted(out, key=lambda o: o[1])
SIDE = side_layout()
img, d, w, h = wall(W_SIDE)
for k, x in SIDE:
    door(d, x, h) if k == 'D' else window(d, x, h)
grime(img).save(f'{OUT}/school_side.png')

# --- the ground storey: the same openings, the wall painted with children in uniform, the Nepal flag and a
# football, a dark skirting (IMG_3055 0:20-1:05), and on the front the "Welcome to" panel (IMG_3019, 3020)
SKIN, HAIR, SHIRT = (226, 182, 140), (28, 24, 24), (244, 244, 240)
def kid(d, x, h, size=1.15, girl=False):
    """A painted pupil, hands joined in namaste, standing on the skirting; x in metres, centre."""
    s = size; base = h - m(0.14)
    cx = m(x)
    leg = m(0.38 * s); body = m(0.42 * s); head = m(0.17 * s)
    d.rectangle([cx - m(0.07 * s), base - leg, cx - m(0.02 * s), base], fill=SKIN)
    d.rectangle([cx + m(0.02 * s), base - leg, cx + m(0.07 * s), base], fill=SKIN)
    d.rectangle([cx - m(0.08 * s), base - m(0.05 * s), cx + m(0.08 * s), base], fill=(20, 20, 22))
    y = base - leg
    if girl: d.polygon([(cx - m(0.16 * s), y), (cx + m(0.16 * s), y), (cx + m(0.11 * s), y - m(0.2 * s)), (cx - m(0.11 * s), y - m(0.2 * s))], fill=(40, 90, 170))
    else: d.rectangle([cx - m(0.12 * s), y - m(0.16 * s), cx + m(0.12 * s), y], fill=(40, 90, 170))
    d.rectangle([cx - m(0.12 * s), y - body, cx + m(0.12 * s), y - m(0.16 * s)], fill=SHIRT, outline=(150, 150, 150))
    d.ellipse([cx - m(0.04 * s), y - body + m(0.1 * s), cx + m(0.04 * s), y - body + m(0.2 * s)], fill=SKIN)   # joined hands
    d.ellipse([cx - head // 2 - 2, y - body - head, cx + head // 2 + 2, y - body + 2], fill=SKIN)
    d.chord([cx - head // 2 - 3, y - body - head - 3, cx + head // 2 + 3, y - body - head // 3], 180, 360, fill=HAIR)
    if girl:
        d.rectangle([cx - head // 2 - 3, y - body - head // 2, cx - head // 2 + 2, y - body + m(0.05)], fill=HAIR)
        d.rectangle([cx + head // 2 - 2, y - body - head // 2, cx + head // 2 + 3, y - body + m(0.05)], fill=HAIR)

def nepal_flag(d, x, y_top, size=0.6):
    pts = [(m(x), m(y_top)), (m(x + size * 0.75), m(y_top + size * 0.4)), (m(x + size * 0.3), m(y_top + size * 0.42)),
           (m(x + size * 0.75), m(y_top + size)), (m(x), m(y_top + size))]
    d.polygon(pts, fill=(200, 16, 46), outline=(0, 56, 147), width=3)

def ground_storey(width_m, kinds, murals, welcome=False):
    img, d, w, h = wall(width_m)
    d.rectangle([0, h - m(0.14), w, h], fill=(38, 40, 44))                  # the dark skirting
    slot = width_m / len(kinds)
    for i, k in enumerate(kinds):
        x = slot * (i + 0.5)
        if k == 'D': door(d, x, h)
        elif k == 'W': window(d, x, h, notice=False)
    for x, kind in murals:
        if kind == 'flag': nepal_flag(d, x - 0.17, STOREY - 2.2, size=0.42)
        else: kid(d, x, h, girl=(kind == 'girl'))
    if welcome:                                  # the welcome panel takes the last slot ('P'), right of the doors
        c = slot * (kinds.index('P') + 0.5)
        x0, x1, y0, y1 = m(c - 0.65), m(c + 0.65), h - m(2.2), h - m(1.0)
        d.rectangle([x0, y0, x1, y1], fill=(250, 238, 170), outline=(200, 40, 40), width=4)
        d.rectangle([x0 + 10, y0 + 8, x1 - 10, y0 + m(0.22)], fill=(214, 46, 46))
        for k in range(2): kid(d, (x0 + x1) / 2 / PX + (k - 0.5) * 0.4, y1 - 4 + m(0.14), size=0.62, girl=bool(k))
        d.rectangle([x0 + 10, y1 - m(0.28), x1 - 10, y1 - m(0.12)], fill=(40, 90, 170))
    return img

slot = W_FRONT / 6
mid = lambda i: slot * (i + 1.0)          # between openings i and i + 1
grime(ground_storey(W_FRONT, 'WDWWDP', [(mid(0), 'boy'), (mid(1) - 0.1, 'girl'), (mid(2), 'flag'), (mid(3), 'boy')], welcome=True), 0.05).save(f'{OUT}/school_front_ground.png')
murals, x = [], 1.68                       # between each door place and the window after it, none under the gate
while x < W_SIDE - 1.0:
    if abs(x - GATE_X) > GATE_HALF + 0.3: murals.append((x, rnd.choice(['boy', 'girl'])))
    x += 3.95
img, d, w, h = wall(W_SIDE)
d.rectangle([0, h - m(0.14), w, h], fill=(38, 40, 44))
for k, x in SIDE:
    if k == 'W' and GATE_X + 1.65 - 0.7 < x < GATE_X + 2.25 + 0.7: continue      # where the WELCOME panel stands
    door(d, x, h) if k == 'D' else window(d, x, h, notice=False)
for mx, kind in murals:
    if kind == 'flag': nepal_flag(d, mx - 0.3, STOREY - 2.25)
    else: kid(d, mx, h, girl=(kind == 'girl'))
grime(img, 0.05).save(f'{OUT}/school_side_ground.png')

# --- the semi-basement, under the ground-floor corridor: pale yellow wall, barred windows, damp at the foot
# (IMG_3055 0:14, 1:06); on the front the collapsible gate at the ramp's foot
def basement(width_m, gate_at=None):
    bw, bh = m(width_m), m(1.6)
    img = Image.new('RGB', (bw, bh), (236, 222, 160)); d = ImageDraw.Draw(img)
    a = np.asarray(img).astype(np.float32)
    damp = np.linspace(0, 1, bh)[:, None] ** 3
    a *= (1 - 0.35 * damp)[..., None]
    img = Image.fromarray(a.astype(np.uint8)); d = ImageDraw.Draw(img)
    x = 1.2
    while x < width_m - 0.8:
        if gate_at is None or abs(x - gate_at) > 2.2:
            x0, x1 = m(x - 0.6), m(x + 0.6)
            d.rectangle([x0, m(0.25), x1, m(1.0)], fill=(30, 30, 30))
            for k in range(x0 + 6, x1, 9): d.line([k, m(0.25), k, m(1.0)], fill=(70, 70, 70), width=2)
        x += 3.95
    if gate_at is not None:
        x0, x1 = m(gate_at - 1.6), m(gate_at + 1.6)
        d.rectangle([x0, m(0.1), x1, bh], fill=(28, 26, 26))
        for k in range(x0, x1 - 40, 14):
            d.line([k, m(0.1), k + 40, bh], fill=(78, 62, 54), width=2); d.line([k + 40, m(0.1), k, bh], fill=(78, 62, 54), width=2)
    return img
basement(W_FRONT, gate_at=W_FRONT / 2 + 0.4).save(f'{OUT}/school_base_front.png')
basement(W_SIDE).save(f'{OUT}/school_base_side.png')

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

# --- the main entrance on the long side (IMG_3055 0:30-0:42): a maroon collapsible gate across the hall's
# opening, the hall dark behind it with its red columns; and WELCOME painted in red letters down the wall
gw, gh = m(3.0), m(2.45)
img = Image.new('RGB', (gw, gh), (44, 34, 34)); d = ImageDraw.Draw(img)
for cx in (m(0.7), m(2.3)):                                   # red columns inside the hall
    d.rectangle([cx - m(0.15), 0, cx + m(0.15), gh], fill=(120, 30, 34))
d.rectangle([0, gh - m(0.5), gw, gh], fill=(70, 66, 64))      # the hall's floor
for k in range(-gh, gw, 16):                                  # the lattice
    d.line([k, 0, k + gh // 3, gh], fill=(150, 92, 100), width=3)
    d.line([k + gh // 3, 0, k, gh], fill=(150, 92, 100), width=3)
for k in range(0, gw, m(0.16)):
    d.line([k, 0, k, gh], fill=(128, 76, 84), width=4)
d.rectangle([0, 0, gw, m(0.08)], fill=(110, 64, 70)); d.rectangle([0, gh - m(0.08), gw, gh], fill=(110, 64, 70))
img.save(f'{OUT}/school_entrance_gate.png')

from PIL import ImageFont
ww, wh = m(0.6), m(2.3)
img = Image.new('RGB', (ww, wh), (238, 220, 146)); d = ImageDraw.Draw(img)
font = ImageFont.truetype('C:/Windows/Fonts/arialbd.ttf', m(0.27))
for i, ch in enumerate('WELCOME'):
    bb = d.textbbox((0, 0), ch, font=font)
    d.text(((ww - (bb[2] - bb[0])) / 2, m(0.05) + i * m(0.32)), ch, font=font, fill=(200, 30, 40))
img.save(f'{OUT}/school_welcome.png')
print('entrance textures written')
