# The main entrance with its collapsible gate folded away: the same hall as school_entrance_gate.png (dark, its
# two red columns, its floor, the gate's top and bottom tracks), without the lattice, and a little light from
# inside so it reads as a way in. job_gate.py renders the entrance view with it; the website folds the gate's
# two halves aside over that render as the walk reaches the steps. Run: python make_entrance_open.py
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

OUT = r'C:/Users/legio/Workspace/Satyam_Xaviers_EBS_Frontend/website/model/env/data/street'
PX = 80
def m(x): return int(round(x * PX))

gw, gh = m(3.0), m(2.45)
img = Image.new('RGB', (gw, gh), (44, 34, 34))
# light from deeper in the hall: a soft warm glow behind the columns
yy, xx = np.mgrid[0:gh, 0:gw].astype(np.float32)
glow = np.exp(-(((xx - gw / 2) / (gw * 0.32)) ** 2 + ((yy - gh * 0.55) / (gh * 0.45)) ** 2))
base = np.asarray(img).astype(np.float32) + glow[..., None] * np.array([150, 128, 96], np.float32)
img = Image.fromarray(np.clip(base, 0, 255).astype(np.uint8)); d = ImageDraw.Draw(img)
for cx in (m(0.7), m(2.3)):                                   # red columns inside the hall
    d.rectangle([cx - m(0.15), 0, cx + m(0.15), gh], fill=(120, 30, 34))
d.rectangle([0, gh - m(0.5), gw, gh], fill=(78, 73, 70))      # the hall's floor
d.rectangle([0, 0, gw, m(0.08)], fill=(110, 64, 70)); d.rectangle([0, gh - m(0.08), gw, gh], fill=(110, 64, 70))   # the tracks
img.filter(ImageFilter.GaussianBlur(0.6)).save(f'{OUT}/school_entrance_open.png')
print('open entrance written')
