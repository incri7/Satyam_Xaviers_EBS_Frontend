"""Cut the children's papers off the two door photos: the WELCOME squares (76) and To / Our / Class / the purple
drawing (62), each with its own outline as an alpha mask."""
import cv2, numpy as np, sys
D = sys.argv[1]
def cut(im, box, mask_fn, name, pad=30):
    x0, y0, x1, y1 = box; c = im[y0:y1, x0:x1]
    m = mask_fn(c)
    n, lab, st, _ = cv2.connectedComponentsWithStats(m)
    if n > 1:
        k = 1 + np.argmax(st[1:, cv2.CC_STAT_AREA]); m = (lab == k).astype(np.uint8) * 255
    hull = cv2.convexHull(cv2.findNonZero(m)); mm = np.zeros_like(m); cv2.fillConvexPoly(mm, hull, 255)
    return c, mm
def red(c):
    h = cv2.cvtColor(c, cv2.COLOR_BGR2HSV)
    r = (((h[..., 0] < 12) | (h[..., 0] > 168)) & (h[..., 1] > 90) & (h[..., 2] > 90)).astype(np.uint8) * 255
    return cv2.morphologyEx(r, cv2.MORPH_CLOSE, np.ones((25, 25), np.uint8))
def light(c):
    g = cv2.GaussianBlur(cv2.cvtColor(c, cv2.COLOR_BGR2GRAY), (9, 9), 0)
    _, m = cv2.threshold(g, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
    return cv2.morphologyEx(m, cv2.MORPH_CLOSE, np.ones((41, 41), np.uint8))
def purple(c):
    h = cv2.cvtColor(c, cv2.COLOR_BGR2HSV)
    p = ((h[..., 0] > 115) & (h[..., 0] < 165) & (h[..., 1] > 28) & (h[..., 2] > 70)).astype(np.uint8) * 255
    return cv2.morphologyEx(cv2.morphologyEx(p, cv2.MORPH_OPEN, np.ones((9, 9), np.uint8)), cv2.MORPH_CLOSE, np.ones((41, 41), np.uint8))
a = cv2.imread(f'{D}/images/76.jpg')
S = 2.4
for name, (x0, y0, x1, y1) in {'W': (355, 80, 590, 335), 'E': (480, 335, 665, 575), 'L': (380, 578, 575, 805),
                               'C': (565, 790, 735, 1010), 'O': (450, 1005, 645, 1262)}.items():
    box = tuple(int(v * S) for v in (x0, y0, x1, y1))
    c, m = cut(a, box, red, name)
    # the flowers sit on the paper's edge: keep the white ones too, next to the paper
    hsv = cv2.cvtColor(c, cv2.COLOR_BGR2HSV); wf = ((hsv[..., 1] < 70) & (hsv[..., 2] > 170)).astype(np.uint8) * 255
    wf = cv2.bitwise_and(wf, cv2.dilate(m, np.ones((60, 60), np.uint8))); m = cv2.bitwise_or(m, cv2.morphologyEx(wf, cv2.MORPH_CLOSE, np.ones((9, 9), np.uint8)))
    cv2.imwrite(f'pp_{name}.png', np.dstack([c, cv2.GaussianBlur(m, (5, 5), 0)]))
b = cv2.imread(f'{D}/images/62.jpg')
b = np.clip(b.astype(np.float32) * 1.55 + 6, 0, 255).astype(np.uint8)   # the photo is dark: lift it to the other's light
for name, (x0, y0, x1, y1) in {'To': (290, 0, 520, 160), 'Our': (495, 250, 795, 485), 'Class': (145, 595, 620, 835),
                               'Purple': (315, 835, 800, 1450)}.items():
    box = tuple(int(v * S) for v in (x0, y0, x1, y1))
    c, m = cut(b, box, purple if name == 'Purple' else light, name)
    cv2.imwrite(f'pp_{name}.png', np.dstack([c, cv2.GaussianBlur(m, (5, 5), 0)]))
sheet = []
for n in ['W', 'E', 'L', 'C', 'O', 'To', 'Our', 'Class', 'Purple']:
    p = cv2.imread(f'pp_{n}.png', cv2.IMREAD_UNCHANGED); al = p[..., 3:] / 255
    v = (p[..., :3] * al + np.array([200, 120, 40]) * (1 - al)).astype(np.uint8)
    sheet.append(cv2.resize(v, (160, int(160 * v.shape[0] / v.shape[1]))))
h = max(s.shape[0] for s in sheet); cv2.imwrite('pp_sheet.jpg', np.hstack([cv2.copyMakeBorder(s, 0, h - s.shape[0], 0, 4, 0) for s in sheet]))
