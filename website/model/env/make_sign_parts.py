# Cuts the school signboard (data/street/sign_board.jpg, squared up from IMG_3014) into the pieces that lift
# off it on the home page's first scroll, each a PNG with a transparent background, plus the board with its
# lettering painted out. Writes website/public/models/env/sign/ and src/sections/signParts.json.
# Run with the local Python (Pillow, numpy).
import json, os
import numpy as np
from PIL import Image, ImageFilter

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, 'data', 'street', 'sign_board.jpg')
OUT = os.path.join(HERE, '..', '..', 'public', 'models', 'env', 'sign')
JSN = os.path.join(HERE, '..', '..', 'src', 'sections', 'signParts.json')
os.makedirs(OUT, exist_ok=True)

im = Image.open(SRC).convert('RGB')
W, H = im.size
a = np.asarray(im).astype(np.float32)
R, G, B = a[..., 0], a[..., 1], a[..., 2]
# lettering is white or gold on blue. The photo's left half is in shade, so not brightness but balance: the
# board is much bluer than it is red or green; white and gold lettering is not, in shade or in sun
key = np.clip(((R + G) / 2 - 0.75 * B + 6) / 34, 0, 1)
yy, xx = np.mgrid[0:H, 0:W] / np.array([H, W])[:, None, None]

# the pieces, as fractions of the board (measured on the squared-up photo)
CREST = (0.495, 0.465, 0.113)     # centre x, centre y, radius as a share of the width
boxes = {
    'phone_l': (0.02, 0.03, 0.31, 0.14),
    'phone_r': (0.71, 0.03, 0.995, 0.14),
    'hetauda': (0.15, 0.55, 0.38, 0.66),
    'chisapani': (0.60, 0.55, 0.83, 0.66),
    'nepali': (0.0, 0.74, 1.0, 0.97),
}
cx, cy, cr = CREST
crest_mask = np.clip((cr * W - np.hypot(xx * W - cx * W, yy * H - cy * H)) / 2.0, 0, 1)
masks = {}
taken = crest_mask > 0
for name, (u0, v0, u1, v1) in boxes.items():
    m = (xx >= u0) & (xx <= u1) & (yy >= v0) & (yy <= v1) & ~taken
    masks[name] = key * m; taken |= m
ring = np.hypot(xx * W - cx * W, yy * H - cy * H) < cr * W + 10     # the crest's white rim belongs to the crest
masks['arch'] = key * (~taken) * (~ring) * (yy < 0.76)       # the school's name, arched over the crest
masks['crest'] = crest_mask

parts = {}
for name, m in masks.items():
    ys, xs = np.nonzero(m > 0.04)
    if not len(xs): continue
    x0, x1, y0, y1 = max(xs.min() - 4, 0), min(xs.max() + 5, W), max(ys.min() - 4, 0), min(ys.max() + 5, H)
    rgba = np.dstack([a[y0:y1, x0:x1], (m[y0:y1, x0:x1] * 255)]).astype(np.uint8)
    Image.fromarray(rgba, 'RGBA').save(os.path.join(OUT, f'{name}.webp'), quality=88)
    parts[name] = {'x': round(x0 / W, 5), 'y': round(y0 / H, 5), 'w': round((x1 - x0) / W, 5), 'h': round((y1 - y0) / H, 5)}

# the board with its lettering painted out: fill the lettering from its surroundings (normalised blur)
hole = np.clip(np.maximum.reduce([masks[k] for k in masks]) * 3, 0, 1)
hole = np.asarray(Image.fromarray((hole * 255).astype(np.uint8)).filter(ImageFilter.MaxFilter(21))) / 255.0   # the letters' painted drop shadows too
keep = 1 - hole
def blur(x, r):
    # a box blur three times over (close to a Gaussian), along both axes, with edge padding
    for _ in range(3):
        for ax in (0, 1):
            p = np.pad(x, [(r + 1, r) if i == ax else (0, 0) for i in range(x.ndim)], mode='edge')
            c = np.cumsum(p, axis=ax)
            hi = np.take(c, np.arange(2 * r + 1, c.shape[ax]), axis=ax); lo = np.take(c, np.arange(0, c.shape[ax] - 2 * r - 1), axis=ax)
            x = (hi - lo) / (2 * r + 1)
    return x
num = np.zeros_like(a); den = np.zeros(a.shape[:2], np.float32)
for rad in (4, 12, 32, 72, 150):
    num += blur(a * keep[..., None], rad); den += blur(keep.astype(np.float32), rad)
fill = num / np.maximum(den[..., None], 1e-3)
board = a * keep[..., None] + fill * hole[..., None]
board += np.random.default_rng(4).normal(0, 2.0, board.shape)          # the paint's grain
Image.fromarray(np.clip(board, 0, 255).astype(np.uint8)).save(os.path.join(OUT, 'board_blank.webp'), quality=88)

json.dump({'board': [W, H], 'parts': parts}, open(JSN, 'w'), indent=1)
print({k: v for k, v in parts.items()})
