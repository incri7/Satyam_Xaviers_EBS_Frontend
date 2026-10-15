"""The left wall's front end, by the cabinet's corner: the months chart finished (OCTOBER, NOVEMBER, DECEMBER in its
own marker hand on its own paper), the white wall beside it and the slate dado under it in the wall's real texture,
where an earlier clean-up had left a flat blur."""
import cv2, numpy as np
from PIL import Image, ImageDraw, ImageFont
PX = 360; HC = 3.5
X = lambda u: int(round(u * PX)); Y = lambda v: int(round((HC - v) * PX))
im = cv2.imread('tex_left_before_fix.jpg').astype(np.float32)
rng = np.random.default_rng(11)

def tile_down(src, h):
    """src repeated downwards to height h, each seam blended over 12 px"""
    out = src.copy()
    while out.shape[0] < h:
        k = 12; a = np.linspace(0, 1, k)[:, None, None]
        out[-k:] = out[-k:] * (1 - a) + src[:k] * a
        out = np.vstack([out, src[k:]])
    return out[:h]

def fill_plain(u0, u1, v0, v1, src):
    """the region painted as the surface beside it: its colour, row by row, from a clean strip of that surface (src:
    u0, u1 of the strip), smoothed, with the photo's fine grain; feathered into what is round it"""
    y0, y1, x0, x1 = Y(v1), Y(v0), X(u0), X(u1)
    strip = im[y0:y1, X(src[0]):X(src[1])]
    rows = cv2.GaussianBlur(np.median(strip, 1)[:, None, :].astype(np.float32), (0, 0), 8)
    base = np.repeat(rows, x1 - x0, 1)
    grain = cv2.GaussianBlur(rng.normal(0, 1, base.shape[:2]).astype(np.float32), (0, 0), 0.8)[..., None] * 3.0
    m = np.ones(base.shape[:2], np.float32); m[:, :6] = np.linspace(0, 1, 6)
    m = m[..., None]
    im[y0:y1, x0:x1] = im[y0:y1, x0:x1] * (1 - m) + (base + grain) * m

# 1. the slate dado under the chart: carried on from the wall just left of it, row by row, easing into the wall's
#    overall dado tone over 40 cm, with the photo's grain (no seam at its edge, no blocks inside it)
y0, y1, x0, x1 = Y(1.40), Y(0.04), X(6.08), X(7.17)
edge = cv2.GaussianBlur(np.median(im[y0:y1, x0 - 14:x0 - 2], 1)[:, None, :].astype(np.float32), (0, 0), 10)
overall = np.median(im[Y(1.35):Y(0.10), X(1.0):X(5.9)].reshape(-1, 3), 0)[None, None]
# where the job chart's white paper is at the edge (not slate), the wall's tone instead
paperish = (edge[:, 0].mean(1) > overall.mean() + 25).astype(np.float32)
paperish = cv2.GaussianBlur(paperish[:, None], (0, 0), 10).reshape(-1, 1, 1)
edge = edge * (1 - paperish) + overall * paperish
w = x1 - x0; t = np.clip(np.arange(w) / (0.40 * PX), 0, 1)[None, :, None]; t = t * t * (3 - 2 * t)
grain = cv2.GaussianBlur(rng.normal(0, 1, (y1 - y0, w)).astype(np.float32), (0, 0), 0.8)[..., None] * 3.0
im[y0:y1, x0:x1] = edge * (1 - t) + overall * t + grain
# 2. the white panel left of the chart, row by row from its plain stretch just left (past the kangaroo's tail)
fill_plain(6.08, 6.42, 1.44, 1.84, (5.25, 6.05))
# 3. the chart's paper carried down to just above the dado, from a band between two of its lines
paper = im[Y(2.111):Y(2.050), X(6.40):X(7.17)]
im[Y(1.84):Y(1.45), X(6.40):X(7.17)] = tile_down(paper, Y(1.45) - Y(1.84))
# its bottom edge: a little shadow on the wall under the paper
im[Y(1.45):Y(1.43), X(6.40):X(7.17)] *= 0.86
im[Y(1.425):Y(1.41), X(6.08):X(7.17)] = im[Y(1.425):Y(1.41), X(5.6):X(5.6) + X(7.17) - X(6.08)]   # the dado's painted edge, carried on
# 4. the last three months, in the chart's black marker: Arial Narrow Bold, sized and spaced like its lines
font = ImageFont.truetype('C:/Windows/Fonts/ARIALNB.TTF', 120)
def word(text, top_v, height_px=22):
    tmp = Image.new('L', (1400, 200), 0); d = ImageDraw.Draw(tmp); d.text((10, 10), text, font=font, fill=255)
    a = np.array(tmp); ys, xs = np.nonzero(a); a = a[ys.min():ys.max() + 1, xs.min():xs.max() + 1]
    s = height_px / a.shape[0]; a = cv2.resize(a, (int(a.shape[1] * s * 1.05), height_px), interpolation=cv2.INTER_AREA).astype(np.float32) / 255
    M = np.float32([[1, -0.08, a.shape[0] * 0.08], [0, 1, 0]])          # the marker's slight lean
    a = cv2.warpAffine(a, M, (a.shape[1] + 3, a.shape[0]))
    a = np.clip(cv2.GaussianBlur(a, (0, 0), 1.1) * 1.15, 0, 1)        # as soft as the photo's own letters
    cx = X(6.78); x0 = cx - a.shape[1] // 2; y0 = Y(top_v)
    reg = im[y0:y0 + a.shape[0], x0:x0 + a.shape[1]]
    ink = np.array([22, 22, 26], np.float32)
    reg[:] = reg * (1 - a[..., None]) + ink * a[..., None]
# OCTOBER's top survives at the cut: write it whole again over its own place
im[Y(1.80):Y(1.70), X(6.40):X(7.17)] = tile_down(paper, Y(1.70) - Y(1.80))
for t, v in (('OCTOBER', 1.792), ('NOVEMBER', 1.662), ('DECEMBER', 1.532)): word(t, v)
im += rng.normal(0, 1.5, im.shape).astype(np.float32)        # the photo's grain over the new parts
cv2.imwrite('tex_left.jpg', np.clip(im, 0, 255).astype(np.uint8), [cv2.IMWRITE_JPEG_QUALITY, 92])
c = lambda m: m[Y(3.05):Y(0.0), X(5.0):X(7.4)]
cv2.imwrite('left_fix_compare.jpg', np.hstack([c(cv2.imread('tex_left_before_fix.jpg')), np.zeros((Y(0.0) - Y(3.05), 12, 3), np.uint8), c(cv2.imread('tex_left.jpg'))]))
