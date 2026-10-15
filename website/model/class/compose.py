"""Line the other photos of each wall up on its rectified anchor (SIFT + RANSAC: a wall is a plane, so a
homography is exact), match their exposure, and composite."""
import cv2, numpy as np, sys
D = sys.argv[1]; PX = 360; W, L, H = 6.2, 7.4, 3.6
sift = cv2.SIFT_create(nfeatures=20000)
def img(n): return cv2.imread(f'{D}/images/{n}.jpg')
def register(photo, canvas, cmask, region=None):
    g1 = cv2.cvtColor(cv2.resize(photo, None, fx=.5, fy=.5), cv2.COLOR_BGR2GRAY)
    g2 = cv2.cvtColor(canvas, cv2.COLOR_BGR2GRAY)
    m2 = cmask.copy()
    if region is not None: m2 = cv2.bitwise_and(m2, region)
    k1, d1 = sift.detectAndCompute(g1, None); k2, d2 = sift.detectAndCompute(g2, m2)
    mt = cv2.BFMatcher().knnMatch(d1, d2, k=2)
    good = [m for m, n in mt if m.distance < 0.72 * n.distance]
    src = np.float32([k1[m.queryIdx].pt for m in good]) * 2; dst = np.float32([k2[m.trainIdx].pt for m in good])
    Hm, inl = cv2.findHomography(src, dst, cv2.RANSAC, 4.0)
    print('  matches', len(good), 'inliers', int(inl.sum()))
    size = (canvas.shape[1], canvas.shape[0])
    out = cv2.warpPerspective(photo, Hm, size, flags=cv2.INTER_CUBIC)
    msk = cv2.warpPerspective(np.full(photo.shape[:2], 255, np.uint8), Hm, size)
    return out, cv2.erode(msk, np.ones((15, 15), np.uint8))
def rect(shape, u0, u1, v0, v1):
    m = np.zeros(shape[:2], np.uint8)
    cv2.rectangle(m, (int(u0*PX), int((H-v1)*PX)), (int(u1*PX), int((H-v0)*PX)), 255, -1); return m
def gain(canvas, cm, layer, lm):
    ov = (cm > 0) & (lm > 0)
    if ov.sum() < 5000: return layer
    g = np.median(canvas[ov].astype(np.float32), 0) / np.maximum(np.median(layer[ov].astype(np.float32), 0), 1)
    g = np.clip(g, 0.75, 1.33); print('  gain', g.round(3))
    return np.clip(layer.astype(np.float32) * g, 0, 255).astype(np.uint8)
def over(canvas, cm, layer, lm, region, feather=25, match=True):
    m = cv2.bitwise_and(lm, region)
    if match: layer = gain(canvas, cm, layer, m)
    a = cv2.GaussianBlur(cv2.erode(m, np.ones((feather, feather), np.uint8)), (0, 0), feather / 2).astype(np.float32)[..., None] / 255
    a = np.where(cm[..., None] == 0, (m[..., None] > 0).astype(np.float32), a)
    canvas[:] = (canvas * (1 - a) + layer * a).astype(np.uint8); cm[:] = np.maximum(cm, m)
def load(n): return cv2.imread(f'a_{n}.png'), cv2.imread(f'a_{n}_m.png', 0)

# LEFT wall: 66 anchor; 72 for the top band and the festival list; 64 for the days and numerals at the back end
print('left'); c, cm = load('left')
PADL = 1.4   # the wall goes on past the anchor photo's left edge (the days and numerals charts): room for them
c = cv2.copyMakeBorder(c, 0, 0, int(PADL*PX), 0, cv2.BORDER_CONSTANT, value=0); cm = cv2.copyMakeBorder(cm, 0, 0, int(PADL*PX), 0, cv2.BORDER_CONSTANT, value=0)
base = c.copy(); bm = cm.copy()
p64, m64 = register(img(64), base, bm)
over(c, cm, p64, m64, rect(c.shape, 0, PADL + 1.6, 1.25, H))
p72, m72 = register(img(72), base, bm)
over(c, cm, p72, m72, cv2.bitwise_or(cv2.bitwise_or(rect(c.shape, PADL, PADL + L, 2.12, H), rect(c.shape, PADL, PADL + 2.0, 1.36, H)), rect(c.shape, PADL + 6.25, PADL + 7.05, 1.36, H)))
cv2.imwrite('b_left.png', c); cv2.imwrite('b_left_m.png', cm)
# BACK wall: 64 anchor; 74 sharper for the coat of arms, bird, flag and the left window; 73 for flower, animal, colour
print('back'); c, cm = load('back'); base = c.copy(); bm = cm.copy()
p74, m74 = register(img(74), base, bm)
over(c, cm, p74, m74, rect(c.shape, 0.25, 3.7, 1.0, H))
p73, m73 = register(img(73), c.copy(), cm.copy())
over(c, cm, p73, m73, rect(c.shape, 3.68, 4.48, 2.6, 3.3), feather=31)
cv2.imwrite('b_back.png', c); cv2.imwrite('b_back_m.png', cm)
# RIGHT wall: 71 anchor; the Nepali months column from 74, by its own quad (it shares nothing with 71)
print('right'); c, cm = load('right')
S = 2.4; q = np.float32([[5*S, 178*S], [210*S, 238*S], [200*S, 812*S], [5*S, 822*S]])
u0, u1, v0, v1 = 6.35, 7.05, 1.42, 2.98
dst = np.float32([[u0*PX, (H-v1)*PX], [u1*PX, (H-v1)*PX], [u1*PX, (H-v0)*PX], [u0*PX, (H-v0)*PX]])
M = cv2.getPerspectiveTransform(q, dst); im = img(74)
lay = cv2.warpPerspective(im, M, (c.shape[1], c.shape[0]), flags=cv2.INTER_CUBIC)
over(c, cm, lay, rect(c.shape, u0, u1, v0, v1), rect(c.shape, 0, L, 0, H), feather=9, match=False)
cv2.imwrite('b_right.png', c); cv2.imwrite('b_right_m.png', cm)
c, cm = load('front'); cv2.imwrite('b_front.png', c); cv2.imwrite('b_front_m.png', cm)
