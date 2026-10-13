"""The two door leaves, 0.7 x 2.12 m at 1000 px/m: the real steel door surface (photo 76), the children's papers on it."""
import cv2, numpy as np, sys
D = sys.argv[1]; rng = np.random.default_rng(5)
a = cv2.imread(f'{D}/images/76.jpg')
# the steel leaf: its colour from the photo, six panels with pressed grooves, worn and scuffed
H, Wd = 2120, 700
col = np.array([88, 92, 102], np.float32)
n1 = cv2.resize(rng.normal(0, 1, (H // 40, Wd // 2)).astype(np.float32), (Wd, H), interpolation=cv2.INTER_CUBIC)
n2 = cv2.GaussianBlur(rng.normal(0, 1, (H, Wd)).astype(np.float32), (0, 0), 1.2)
n3 = cv2.resize(rng.normal(0, 1, (H // 120, Wd // 120 + 2)).astype(np.float32), (Wd, H), interpolation=cv2.INTER_CUBIC)
base = col[None, None] * (1 + 0.035 * n1 + 0.05 * n3)[..., None] + (6 * n2)[..., None]
for k in range(1, 6):
    x = int(k * Wd / 6)
    base[:, x - 3:x + 3] *= 0.45; base[:, x + 3:x + 5] *= 1.28
for _ in range(90):                                   # scuffs: short light scratches, mostly low down
    y = int(rng.uniform(0.25, 1.0) ** 0.7 * H); x = int(rng.uniform(10, Wd - 10)); l = rng.uniform(8, 40); t = rng.uniform(0, np.pi)
    cv2.line(base, (x, y), (int(x + l * np.cos(t)), int(y + l * np.sin(t))), (130, 134, 140), 1, cv2.LINE_AA)
for _ in range(220):
    y = int(rng.uniform(0, H)); x = int(rng.uniform(0, Wd)); cv2.circle(base, (x, y), int(rng.uniform(1, 3)), (62, 64, 72), -1, cv2.LINE_AA)
cv2.rectangle(base, (0, 0), (Wd - 1, H - 1), (44, 46, 54), 16)
inner = np.clip(base, 0, 255).astype(np.uint8)
cv2.imwrite('door_inner.jpg', inner, [cv2.IMWRITE_JPEG_QUALITY, 92])
def paste(img, name, cx, top, width, angle=0.0, flip=False):
    p = cv2.imread(f'pp_{name}.png', cv2.IMREAD_UNCHANGED)
    if flip: p = cv2.rotate(p, cv2.ROTATE_180)
    s = width / p.shape[1]; p = cv2.resize(p, None, fx=s, fy=s, interpolation=cv2.INTER_AREA)
    M = cv2.getRotationMatrix2D((p.shape[1] / 2, p.shape[0] / 2), angle, 1.0)
    p = cv2.warpAffine(p, M, (p.shape[1], p.shape[0]), borderValue=(0, 0, 0, 0))
    h, w = p.shape[:2]; x0 = int(cx - w / 2); y0 = int(top)
    al = p[..., 3:].astype(np.float32) / 255
    # a soft shadow under each paper
    sh = cv2.GaussianBlur(al[..., 0], (0, 0), 4)[..., None] * 0.45
    reg = img[y0 + 4:y0 + 4 + h, x0 + 3:x0 + 3 + w]; reg[:] = reg * (1 - sh[:reg.shape[0], :reg.shape[1]])
    reg = img[y0:y0 + h, x0:x0 + w]; reg[:] = reg * (1 - al) + p[..., :3] * al
def pin_to(p):
    """the photo cut the top of the T off: give the paper its top back, and the T its bar"""
    q = cv2.imread('pp_To.png', cv2.IMREAD_UNCHANGED); h, w = q.shape[:2]; add = int(h * 0.28)
    col = np.median(q[q[..., 3] > 200][:, :3], 0)
    top = np.zeros((add, w, 4), np.uint8); top[..., :3] = col; top[..., 3] = q[0:1, :, 3]
    q = np.vstack([top, q]); g = cv2.cvtColor(q[..., :3], cv2.COLOR_BGR2GRAY)
    xs = 200; th = 22                                   # the T's stem, where the photo shows it
    cv2.line(q, (xs, add - 12), (xs, add + 4), (52, 52, 56, 255), th)
    cv2.line(q, (xs - 85, add - 16), (xs + 88, add - 20), (52, 52, 56, 255), th)
    cv2.imwrite('pp_To2.png', q)
pin_to(None)
w1 = inner.copy().astype(np.float32)
for name, cx, top, ang, flip in [('W', 330, 210, -3, False), ('E', 400, 410, 2, False), ('L', 315, 610, -2, False),
                                 ('C', 420, 810, 3, False), ('O', 345, 1010, -4, False), ('W', 410, 1215, 2, True),
                                 ('E', 335, 1415, -2, False)]:
    paste(w1, name, cx, top, 175, ang, flip)
cv2.imwrite('door_welcome.jpg', np.clip(w1, 0, 255).astype(np.uint8), [cv2.IMWRITE_JPEG_QUALITY, 92])
w2 = inner.copy().astype(np.float32)
for name, cx, top, width, ang in [('To2', 420, 230, 170, 1), ('Our', 390, 430, 225, -1), ('Class', 330, 650, 330, 1),
                                  ('Purple', 380, 880, 330, -1)]:
    paste(w2, name, cx, top, width, ang)
cv2.imwrite('door_class.jpg', np.clip(w2, 0, 255).astype(np.uint8), [cv2.IMWRITE_JPEG_QUALITY, 92])
both = np.hstack([cv2.imread('door_welcome.jpg'), np.zeros((2120, 40, 3), np.uint8), cv2.imread('door_class.jpg')])
cv2.imwrite('door_sheet.jpg', cv2.resize(both, None, fx=0.4, fy=0.4))
