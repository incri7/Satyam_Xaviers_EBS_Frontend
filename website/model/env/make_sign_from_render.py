# The signboard as the opening render shows it, so the first scroll can start from exactly what is on screen:
# squares the board up out of renders/street_streetview.png (its corners from job_sign_quad.py), cuts its
# lettering into the pieces that lift off (transparent PNG -> WebP), and paints the lettering out of the board,
# leaving a faint ghost of the paint. Writes website/public/models/env/sign/ and src/sections/signRender.json.
# Run with the local Python (Pillow, numpy) after the street is rendered: python make_sign_from_render.py <stamp>
# (publish.sh does; the stamp names the files, since nginx caches /models/ for a day).
import json, os, sys, glob
import numpy as np
from PIL import Image, ImageFilter

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, 'renders', 'street_streetview.png')
QUAD = json.load(open(os.path.join(HERE, 'renders', 'sign_quad.json')))
OUT = os.path.join(HERE, '..', '..', 'public', 'models', 'env', 'sign')
JSN = os.path.join(HERE, '..', '..', 'src', 'sections', 'signRender.json')
os.makedirs(OUT, exist_ok=True)
V = sys.argv[1] if len(sys.argv) > 1 else 'dev'
for old in glob.glob(os.path.join(OUT, '*.webp')): os.remove(old)
BW, BH = 800, 430            # board pixels: more than the board ever shows at on its wall (about 360 wide)

img = np.asarray(Image.open(SRC).convert('RGB')).astype(np.float32)
IH, IW = img.shape[:2]

def square_to_quad(q):
    (x0, y0), (x1, y1), (x2, y2), (x3, y3) = q
    sx, sy = x0 - x1 + x2 - x3, y0 - y1 + y2 - y3
    dx1, dx2, dy1, dy2 = x1 - x2, x3 - x2, y1 - y2, y3 - y2
    den = dx1 * dy2 - dx2 * dy1
    g = (sx * dy2 - dx2 * sy) / den; h = (dx1 * sy - sx * dy1) / den
    return (x1 - x0 + g * x1, y1 - y0 + g * y1, x3 - x0 + h * x3, y3 - y0 + h * y3, x0, y0, g, h)
a, b, c, d, e, f, g, h = square_to_quad([QUAD[k][:2] for k in ('tl', 'tr', 'br', 'bl')])
v, u = np.mgrid[0:BH, 0:BW].astype(np.float32)
u = (u + 0.5) / BW; v = (v + 0.5) / BH
w = g * u + h * v + 1
X = np.clip((a * u + c * v + e) / w, 0, IW - 1.001); Y = np.clip((b * u + d * v + f) / w, 0, IH - 1.001)
x0, y0 = np.floor(X).astype(int), np.floor(Y).astype(int); tx, ty = (X - x0)[..., None], (Y - y0)[..., None]
board = (img[y0, x0] * (1 - tx) * (1 - ty) + img[y0, x0 + 1] * tx * (1 - ty)
         + img[y0 + 1, x0] * (1 - tx) * ty + img[y0 + 1, x0 + 1] * tx * ty)

R, G, B = board[..., 0], board[..., 1], board[..., 2]
# light lettering on slate navy: each pixel against the board's own brightness round it (the board is shaded
# unevenly, darker at its far end), so the key follows the render's light rather than fixed numbers; the lettering
# is also less blue than the board
L = 0.3 * R + 0.59 * G + 0.11 * B
Lb = np.asarray(Image.fromarray(np.clip(L, 0, 255).astype(np.uint8)).filter(ImageFilter.MedianFilter(5)).filter(ImageFilter.GaussianBlur(28))).astype(np.float32)
blue = B - (R + G) / 2
key = np.clip((L - Lb - 9) / 12, 0, 1) * np.clip(np.median(blue) - blue + 8, 0, 12) / 12
# the board's own thin light edge is not lettering: nothing within its margin lifts off
edge = (u > 0.018) & (u < 0.982) & (v > 0.025) & (v < 0.975)
key = key * edge
print('board blue', round(float(np.median(blue)), 1))
yy, xx = (v - 0.5 / BH), (u - 0.5 / BW)
CREST = (0.495, 0.465, 0.113)
boxes = {'phone_l': (0.02, 0.03, 0.31, 0.14), 'phone_r': (0.71, 0.03, 0.995, 0.14), 'hetauda': (0.15, 0.55, 0.38, 0.66),
         'chisapani': (0.60, 0.55, 0.83, 0.66), 'nepali': (0.0, 0.74, 1.0, 0.97)}
cx, cy, cr = CREST
dist = np.hypot((xx - cx) * BW, (yy - cy) * BH)
masks = {'crest': np.clip((cr * BW - dist) / 1.5, 0, 1)}
taken = masks['crest'] > 0
for name, (u0, v0, u1, v1) in boxes.items():
    m = (xx >= u0) & (xx <= u1) & (yy >= v0) & (yy <= v1) & ~taken
    masks[name] = key * m; taken |= m
masks['arch'] = key * (~taken) * (dist > cr * BW + 5) * (yy < 0.76)

parts = {}
for name, m in masks.items():
    ys, xs = np.nonzero(m > 0.04)
    x0_, x1_, y0_, y1_ = max(xs.min() - 3, 0), min(xs.max() + 4, BW), max(ys.min() - 3, 0), min(ys.max() + 4, BH)
    rgba = np.dstack([board[y0_:y1_, x0_:x1_], m[y0_:y1_, x0_:x1_] * 255]).astype(np.uint8)
    Image.fromarray(rgba, 'RGBA').save(os.path.join(OUT, f'r_{name}_{V}.webp'), quality=90)
    # boxes in the 1600 x 860 board units the page uses
    parts[name] = [round(x0_ / BW * 1600, 1), round(y0_ / BH * 860, 1), round((x1_ - x0_) / BW * 1600, 1), round((y1_ - y0_) / BH * 860, 1)]

# the board with its lettering painted out (a normalised blur fills the gaps), and a faint ghost of the paint
hole = np.clip(np.maximum.reduce(list(masks.values())) * 3, 0, 1)
hole = np.asarray(Image.fromarray((hole * 255).astype(np.uint8)).filter(ImageFilter.MaxFilter(31))) / 255.0   # the letters' painted shadows too
keep = 1 - hole
def blur(x, r):
    for _ in range(3):
        for ax in (0, 1):
            p = np.pad(x, [(r + 1, r) if i == ax else (0, 0) for i in range(x.ndim)], mode='edge')
            cs = np.cumsum(p, axis=ax)
            x = (np.take(cs, np.arange(2 * r + 1, cs.shape[ax]), axis=ax) - np.take(cs, np.arange(0, cs.shape[ax] - 2 * r - 1), axis=ax)) / (2 * r + 1)
    return x
num = np.zeros_like(board); den = np.zeros(board.shape[:2], np.float32)
for rad in (2, 6, 16, 40, 90):
    num += blur(board * keep[..., None], rad); den += blur(keep.astype(np.float32), rad)
clean = board * keep[..., None] + (num / np.maximum(den[..., None], 1e-3)) * hole[..., None]
ghost = np.clip(np.maximum.reduce([m for k, m in masks.items() if k != 'crest']), 0, 1)[..., None]
wall = clean                                            # no trace of the lettering: it has lifted off
Image.fromarray(np.clip(wall, 0, 255).astype(np.uint8)).save(os.path.join(OUT, f'wall_{V}.webp'), quality=90)
# the clean plate behind the board (job_plate.py): the street with the board off its posts, cut to the board's
# area with a soft edge, for when the board swings out
plate_box = None
PLATE = os.path.join(HERE, 'renders', 'street_plate.png')
if os.path.exists(PLATE):
    xs = [QUAD[k][0] for k in ('tl', 'tr', 'br', 'bl')]; ys = [QUAD[k][1] for k in ('tl', 'tr', 'br', 'bl')]
    m = 24
    px0, py0 = max(int(min(xs)) - m, 0), max(int(min(ys)) - m, 0)
    px1, py1 = min(int(max(xs)) + m, IW), min(int(max(ys)) + m, IH)
    pl = np.asarray(Image.open(PLATE).convert('RGB'))[py0:py1, px0:px1]
    ph, pw = pl.shape[:2]
    gy, gx = np.mgrid[0:ph, 0:pw]
    edge = np.minimum.reduce([gx, gy, pw - 1 - gx, ph - 1 - gy]).astype(np.float32)
    alpha = np.clip(edge / m, 0, 1)
    if px1 >= IW: alpha = np.minimum(alpha, 1) * 0 + np.clip(np.minimum.reduce([gx, gy, ph - 1 - gy]) / m, 0, 1)   # the frame's own edge stays hard
    Image.fromarray(np.dstack([pl, (alpha * 255).astype(np.uint8)]), 'RGBA').save(os.path.join(OUT, f'plate_{V}.webp'), quality=88)
    plate_box = [px0, py0, pw, ph]
json.dump({'v': V, 'board': [1600, 860], 'parts': parts, 'plate': plate_box}, open(JSN, 'w'), indent=1)
print(parts)
