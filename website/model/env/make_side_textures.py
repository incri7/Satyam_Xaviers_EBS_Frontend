# Paints the road fronts of the two houses at the driveway's mouth, from Google Street View:
#   the shop house (left): three shops below a sign strip, grey stone-tile cladding, windows with blue
#   glass; and its first-floor balcony band, white with blue floral painting.
#   the cream house (right): peach walls, brown-framed windows and balcony doors, dark ground floor.
# Writes into data/street. Run with the local Python (Pillow, numpy).
import random
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

OUT = r'C:/Users/legio/Workspace/Satyam_Xaviers_EBS_Frontend/website/model/env/data/street'
PX = 60
rnd = random.Random(11)
def m(x): return int(round(x * PX))

def tiles(img, box, a=(176, 177, 176), b=(198, 199, 197)):
    """Grey stone-tile cladding: a checker of small tiles with irregular tone."""
    d = ImageDraw.Draw(img)
    x0, y0, x1, y1 = box; s = m(0.2)
    for y in range(y0, y1, s):
        for x in range(x0, x1, s):
            c = a if ((x - x0) // s + (y - y0) // s) % 2 else b
            k = rnd.uniform(0.9, 1.08)
            d.rectangle([x, y, min(x + s - 1, x1), min(y + s - 1, y1)], fill=tuple(int(v * k) for v in c))

def window(d, cx, y_top, w, h, frame=(92, 58, 38), glass=(58, 92, 150)):
    x0, x1 = m(cx - w / 2), m(cx + w / 2); y0 = m(y_top); y1 = m(y_top + h)
    d.rectangle([x0, y0, x1, y1], fill=frame)
    d.rectangle([x0 + 5, y0 + 5, x1 - 5, y1 - 5], fill=glass)
    d.line([(x0 + x1) // 2, y0, (x0 + x1) // 2, y1], fill=frame, width=4)
    d.line([x0, (y0 + y1) // 2, x1, (y0 + y1) // 2], fill=frame, width=3)

# --- the shop house's road front: 9.7 m wide, 3 storeys (9.2 m). Image left = the far side from the
# driveway (the clothes shop), image right = the corner by the driveway.
W, H = 9.7, 9.2
img = Image.new('RGB', (m(W), m(H)), (226, 226, 222))
tiles(img, (0, 0, m(W), m(H) - m(3.0)))
d = ImageDraw.Draw(img)
gy = m(H) - m(3.0)                      # top of the ground floor (y grows downwards)
d.rectangle([0, gy, m(W), m(H)], fill=(196, 196, 192))
bay = W / 3
# clothes shop: open front, red and maroon garments hanging
x0 = m(0.25); x1 = m(bay - 0.2)
d.rectangle([x0, gy + m(0.65), x1, m(H)], fill=(40, 34, 32))
for i in range(9):
    gx = x0 + 10 + i * (x1 - x0 - 20) // 9
    col = rnd.choice([(178, 32, 48), (140, 24, 40), (205, 60, 70), (230, 230, 220), (60, 90, 160)])
    d.rectangle([gx, gy + m(0.8), gx + (x1 - x0) // 11, gy + m(rnd.uniform(1.6, 2.3))], fill=col)
# green rolling shutter
x0 = m(bay + 0.2); x1 = m(2 * bay - 0.2)
d.rectangle([x0, gy + m(0.65), x1, m(H)], fill=(52, 128, 104))
for y in range(gy + m(0.65), m(H), 6):
    d.line([x0, y, x1, y], fill=(40, 104, 84), width=1)
# glass-door shop with wooden frames
x0 = m(2 * bay + 0.15); x1 = m(W - 0.25)
d.rectangle([x0, gy + m(0.65), x1, m(H)], fill=(120, 76, 44))
for k in range(3):
    a0 = x0 + 8 + k * (x1 - x0 - 16) // 3; a1 = a0 + (x1 - x0 - 16) // 3 - 8
    d.rectangle([a0, gy + m(0.8), a1, m(H) - 8], fill=(70, 72, 70))
# the strip of small shop signs over the openings
for k, col in enumerate([(220, 40, 50), (40, 90, 170), (240, 200, 40), (30, 140, 90), (240, 240, 235)]):
    sx0 = m(0.15 + k * W / 5); d.rectangle([sx0, gy + m(0.12), sx0 + m(W / 5 - 0.2), gy + m(0.55)], fill=col)
    d.rectangle([sx0 + 8, gy + m(0.25), sx0 + m(W / 5 - 0.2) - 8, gy + m(0.42)], fill=tuple(255 - v // 2 for v in col))
# first floor (behind the floral balcony band) and second floor windows
for cx in (1.6, 4.85, 8.1):
    window(d, cx, H - 3.0 - 2.35, 1.5, 1.35)       # first floor
    window(d, cx, H - 6.0 - 2.35, 1.5, 1.35)       # second floor
img.filter(ImageFilter.GaussianBlur(0.4)).save(f'{OUT}/side_shop_front.png')

# --- the first-floor balcony band: white, blue floral painting with yellow flower heads (tile 3 m x 1 m)
pw, ph = m(3.0), m(1.0)
img = Image.new('RGB', (pw, ph), (240, 242, 244)); d = ImageDraw.Draw(img)
for k in range(6):                                  # swirling stems
    cx = k * pw // 6 + pw // 12
    for t in np.linspace(0, 2 * np.pi, 40):
        x = cx + int(np.sin(t * 1.5) * m(0.18)); y = int(ph * 0.5 + np.cos(t) * ph * 0.32)
        d.ellipse([x - 2, y - 2, x + 2, y + 2], fill=(48, 102, 184))
    for j in range(3):                              # flower heads
        fx = cx + rnd.randint(-m(0.2), m(0.2)); fy = rnd.randint(ph // 5, 4 * ph // 5)
        d.ellipse([fx - 5, fy - 5, fx + 5, fy + 5], fill=(240, 196, 40)); d.ellipse([fx - 2, fy - 2, fx + 2, fy + 2], fill=(200, 80, 30))
d.rectangle([0, 0, pw, 5], fill=(48, 102, 184)); d.rectangle([0, ph - 6, pw, ph], fill=(48, 102, 184))
img.filter(ImageFilter.GaussianBlur(0.6)).save(f'{OUT}/side_floral_band.png')

# --- the cream house's road front: 8.8 m wide, 3 storeys
W, H = 8.8, 9.2
img = Image.new('RGB', (m(W), m(H)), (241, 218, 198)); d = ImageDraw.Draw(img)
gy = m(H) - m(3.0)
d.rectangle([m(0.5), gy + m(0.5), m(3.6), m(H)], fill=(52, 48, 46))           # ground floor openings
d.rectangle([m(4.3), gy + m(0.9), m(5.4), m(H)], fill=(96, 62, 42))
d.rectangle([m(6.0), gy + m(0.5), m(8.3), m(H)], fill=(60, 56, 52))
for floor in (1, 2):
    top = H - 3.0 * (floor + 1)
    window(d, 1.6, top + 0.55, 1.3, 1.4, glass=(70, 80, 88))
    d.rectangle([m(3.6), m(top + 0.4), m(5.0), m(top + 2.65)], fill=(92, 58, 38))   # balcony door
    d.rectangle([m(3.7), m(top + 0.5), m(4.9), m(top + 2.6)], fill=(118, 80, 54))
    window(d, 7.0, top + 0.55, 1.3, 1.4, glass=(70, 80, 88))
img.filter(ImageFilter.GaussianBlur(0.4)).save(f'{OUT}/side_cream_front.png')
print('side textures written')
