"""Rectify the classroom's walls from the photos: one anchor photo per wall, flattened from two horizontal lines on
the wall (and the camera's focal length), then scaled by two reference points. Out: wall_<name>.png, PX per metre."""
import cv2, numpy as np, json, sys
D = sys.argv[1]
PX = 360
F = 2900.0                       # focal length in pixels for the 3840-wide frames
W, L, H = 6.2, 7.4, 3.6
def img(n): return cv2.imread(f'{D}/images/{n}.jpg')
def hom(p): return np.array([p[0], p[1], 1.0])
def rect_map(shape, hl1, hl2, vl1=None, vl2=None):
    """image -> wall (u right, v up) projective map, up to scale/offset"""
    h, w = shape[:2]; K = np.array([[F, 0, w/2], [0, F, h/2], [0, 0, 1]]); Ki = np.linalg.inv(K)
    vp_h = np.cross(np.cross(hom(hl1[0]), hom(hl1[1])), np.cross(hom(hl2[0]), hom(hl2[1])))
    dh = Ki @ vp_h; dh /= np.linalg.norm(dh)
    if vl1 is None: dv = np.array([0.0, 1.0, 0.0])
    else:
        vp_v = np.cross(np.cross(hom(vl1[0]), hom(vl1[1])), np.cross(hom(vl2[0]), hom(vl2[1])))
        dv = Ki @ vp_v; dv /= np.linalg.norm(dv)
    if dv[1] < 0: dv = -dv                     # dv points down in the image
    dv = dv - dh * (dh @ dv); dv /= np.linalg.norm(dv)
    # u increases to the image's right: compare the projection of two points on hl1
    n = np.cross(dh, dv)
    def to_wall(p):
        r = Ki @ hom(p); P = r / (n @ r)
        return np.array([dh @ P, -(dv @ P)])
    return to_wall
def warp_anchor(name, im, size, hl1, hl2, A, Auv, B, Bv, vl=(None, None)):
    to_wall = rect_map(im.shape, hl1, hl2, *vl)
    a, b = to_wall(A), to_wall(B); s = (Bv - Auv[1]) / (b[1] - a[1])
    flip = np.sign((to_wall(hl1[1])[0] - to_wall(hl1[0])[0]) * (hl1[1][0] - hl1[0][0]))
    su = abs(s) * flip
    def uv(p): q = to_wall(p); return np.array([Auv[0] + (q[0]-a[0]) * su, Auv[1] + (q[1]-a[1]) * s])
    src = np.float32([[0, 0], [im.shape[1], 0], [im.shape[1], im.shape[0]], [0, im.shape[0]]])
    # sample the corners inward a bit to avoid points behind the camera
    src = np.float32([[400, 300], [im.shape[1]-400, 300], [im.shape[1]-400, im.shape[0]-300], [400, im.shape[0]-300]])
    dst = np.float32([[uv(p)[0]*PX, (H - uv(p)[1])*PX] for p in src])
    M = cv2.getPerspectiveTransform(src, dst)
    out = cv2.warpPerspective(im, M, size, flags=cv2.INTER_CUBIC, borderMode=cv2.BORDER_CONSTANT, borderValue=(0,0,0))
    mask = cv2.warpPerspective(np.full(im.shape[:2], 255, np.uint8), M, size)
    return out, mask, M
S = 2.4
d = lambda x, y: (x*S, y*S)
res = {}
# FRONT wall, from 69 (u from the left wall)
fr, fm, _ = warp_anchor('front', img(69), (int(W*PX), int(H*PX)),
    (d(380,165), d(1245,140)), (d(380,622), d(1250,602)), d(380,622), (0.23, 0.0), d(380,165), 3.05)
# RIGHT wall, from 71 (u from the front wall)
rt, rm, _ = warp_anchor('right', img(71), (int(L*PX), int(H*PX)),
    ((800,1454), (3800,1555)), ((2027,432), (3600,43)), (792,1454), (0.23, 1.33), (2027,432), 2.62)
# BACK wall, from 64 (u from the right wall)
bk, bm, _ = warp_anchor('back', img(64), (int(W*PX), int(H*PX)),
    (d(283,33), d(1005,55)), (d(283,318), d(1005,312)), d(283,318), (0.75, 0.8), d(283,33), 2.6)
# LEFT wall, from 66 (u from the back wall)
lf, lm, _ = warp_anchor('left', img(66), (int(L*PX), int(H*PX)),
    (d(0,290), d(1160,275)), (d(165,105), d(1205,68)), d(1440,270), (L-0.23, 1.33), d(165,105), 2.25)
for n, (a, m) in {'front': (fr, fm), 'right': (rt, rm), 'back': (bk, bm), 'left': (lf, lm)}.items():
    cv2.imwrite(f'a_{n}.png', a); cv2.imwrite(f'a_{n}_m.png', m)
