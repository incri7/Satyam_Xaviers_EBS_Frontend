"""Bring the four walls to one scale (the dado line at 1.42 m and the beams at 3.05 m everywhere), clear what the
3D room models instead (benches, chair, cabinet, fans), fill the gaps with the walls' own paint, write tex_*.jpg."""
import cv2, numpy as np
PX = 360; W, L = 6.2, 7.4; H0 = 3.6; HC = 3.5; DADO = 1.42; BEAM = 3.05
rng = np.random.default_rng(3)
def load(n): return cv2.imread(f'b_{n}.png'), cv2.imread(f'b_{n}_m.png', 0)
def remap(im, m, w, a_u, b_u, a_v, b_v):
    """new (u', v') = (a_u u + b_u, a_v v + b_v); canvas w x HC metres"""
    # pixel x' = u' PX, y' = (HC - v') PX ; source x = u PX, y = (H0 - v) PX
    # x = ((x'/PX - b_u)/a_u) PX ; y = (H0 - ((HC - y'/PX) - b_v)/a_v) PX
    A = np.array([[a_u, 0, b_u * PX], [0, a_v, (HC - b_v - a_v * H0) * PX]], np.float64)
    size = (int(w * PX), int(HC * PX))
    return cv2.warpAffine(im, A, size, flags=cv2.INTER_CUBIC), cv2.warpAffine(m, A, size)
def R(u0, u1, v0, v1, shape):
    m = np.zeros(shape[:2], np.uint8); cv2.rectangle(m, (int(u0*PX), int((HC-v1)*PX)), (int(u1*PX), int((HC-v0)*PX)), 255, -1); return m
def noise(shape, scale, amp):
    n = rng.normal(0, 1, (shape[0] // scale + 2, shape[1] // scale + 2)).astype(np.float32)
    return cv2.resize(cv2.GaussianBlur(n, (0, 0), 1.2), (shape[1], shape[0]), interpolation=cv2.INTER_CUBIC) * amp
def paint(shape, white, slate, red):
    h, w = shape[:2]; bg = np.zeros((h, w, 3), np.float32)
    y = np.arange(h)[:, None]; v = HC - y / PX
    bg[:] = np.where((v < DADO)[..., None], slate, white)
    bg = np.where((v >= BEAM)[..., None], red, bg)
    bg += (noise((h, w), 40, 6) + noise((h, w), 6, 2.5))[..., None] * np.where((v < DADO)[..., None], 1.6, 0.6)
    # the dado's top edge: a thin darker line, as painted
    line = (np.abs(v - DADO) < 0.012)[..., None]; bg = np.where(line, slate * 0.8, bg)
    return np.clip(bg, 0, 255)
def wall_paint(im, m):
    hsv = cv2.cvtColor(im, cv2.COLOR_BGR2HSV); h = im.shape[0]
    v = HC - np.arange(h)[:, None] / PX
    known = (m > 0) & (hsv[..., 1] < 40)
    up = known & (v > DADO + 0.15) & (v < BEAM - 0.1); lo = known & (v < DADO - 0.15) & (v > 0.5)
    vals = hsv[..., 2][up]; t = np.percentile(vals, 55)
    white = np.median(im[up & (hsv[..., 2] >= t)].reshape(-1, 3), 0).astype(np.float32)
    slate = np.median(im[lo].reshape(-1, 3), 0).astype(np.float32)
    return white, slate
def finish(name, im, m, clear, w, extra=None):
    for r in clear: m = cv2.bitwise_and(m, cv2.bitwise_not(R(*r, im.shape)))
    m = cv2.bitwise_and(m, cv2.bitwise_not(R(0, w, BEAM, HC, im.shape)))      # the beam band: painted, all walls
    ok = cv2.erode(m, np.ones((7, 7), np.uint8))
    a = cv2.GaussianBlur(ok, (0, 0), 6).astype(np.float32)[..., None] / 255
    white, slate = wall_paint(im, ok)
    print('  paint', white.round(), slate.round())
    bg = paint(im.shape, white, slate, RED)
    # continue each band's own tone into its gaps: a normalised blur of the photo, per band, so a gap takes the
    # colour of the wall around it rather than one flat paint
    hh = im.shape[0]; vv = HC - np.arange(hh)[:, None] / PX
    for band in ((vv < DADO - 0.02), (vv > DADO + 0.02) & (vv < BEAM)):
        bandm = np.broadcast_to(band, ok.shape)
        hsv = cv2.cvtColor(im, cv2.COLOR_BGR2HSV)
        k = ((ok > 0) & bandm & (hsv[..., 1] < 60)).astype(np.float32)   # plain wall only, not the charts
        small = (im.shape[1] // 8, hh // 8)
        num = cv2.resize(im.astype(np.float32) * k[..., None], small, interpolation=cv2.INTER_AREA)
        den = cv2.resize(k, small, interpolation=cv2.INTER_AREA)[..., None]
        n2 = cv2.GaussianBlur(num, (0, 0), 22); d2 = cv2.GaussianBlur(den[..., 0], (0, 0), 22)[..., None]
        field = cv2.resize(n2 / np.maximum(d2, 1e-6), (im.shape[1], hh), interpolation=cv2.INTER_CUBIC)
        conf = np.clip(cv2.resize(d2[..., 0], (im.shape[1], hh))[..., None] * 25, 0, 1)
        flat = paint(im.shape, white, slate, RED)
        tone = field * conf + flat * (1 - conf)
        bg = np.where(bandm[..., None], tone + (bg - flat), bg)
    out = im.astype(np.float32) * a + bg * (1 - a)
    if extra is not None: out = extra(out)
    cv2.imwrite(f'tex_{name}.jpg', out.astype(np.uint8), [cv2.IMWRITE_JPEG_QUALITY, 92])
    print(name, out.shape)

fr, fm = load('front')
fr, fm = remap(fr, fm, W, 1, 0, 1, 0)
def med(im, u0, u1, v0, v1): return np.median(im[int((HC-v1)*PX):int((HC-v0)*PX), int(u0*PX):int(u1*PX)].reshape(-1, 3), 0).astype(np.float32)
WHITE = med(fr, 4.15, 4.45, 1.6, 1.9); SLATE = med(fr, 3.0, 3.6, 0.5, 1.0); RED = med(fr, 3.6, 4.6, 3.12, 3.3)
print('paint', WHITE, SLATE, RED)
cv2.imwrite('cab_face.jpg', fr[int((HC-1.1)*PX):int((HC-0.02)*PX), int(0.02*PX):int(0.97*PX)])
X = lambda u: int(u * PX); Y = lambda v: int((HC - v) * PX)
hole = np.zeros(fr.shape[:2], np.uint8); hole[Y(0.6):Y(0.0), X(1.33):X(2.12)] = 255
sm = cv2.inpaint(cv2.resize(fr, None, fx=.25, fy=.25), cv2.resize(hole, None, fx=.25, fy=.25), 12, cv2.INPAINT_TELEA)
sm = cv2.resize(sm, (fr.shape[1], fr.shape[0]), interpolation=cv2.INTER_CUBIC).astype(np.float32)
sm += noise(fr.shape[:2], 6, 4)[..., None]
a = cv2.GaussianBlur(hole, (0, 0), 8).astype(np.float32)[..., None] / 255
fr = np.clip(fr * (1 - a) + sm * a, 0, 255).astype(np.uint8)
finish('front', fr, fm, [(0, 1.02, 0, 1.6), (0, W, 0, 0.04)], W)

bk, bm = load('back')
bk, bm = remap(bk, bm, W, 1.0975, 0.23 - 1.0975 * 0.52, 1.09, -0.65)
def door_down(out):
    # the back door runs to the floor: repeat its lower panel downwards
    u0, u1 = 2.6, 3.75; x0, x1 = int(u0*PX), int(u1*PX)
    src = out[int((HC-0.95)*PX):int((HC-0.45)*PX), x0:x1]
    y = int((HC-0.45)*PX)
    while y < out.shape[0]:
        h = min(src.shape[0], out.shape[0] - y); out[y:y+h, x0:x1] = src[:h]; y += h
    return out
finish('back', bk, bm, [(0, W, 0, 0.42)], W, door_down)

lf, lm = load('left')
lf, lm = remap(lf, lm, L, 0.823, (L - 0.23) - 0.823 * (7.17 + 1.4), 0.823, 1.42 - 0.823 * 1.27)
finish('left', lf, lm, [(6.25, L, 0, 1.75), (0, L, 0, 0.4)], L)

rt, rm = load('right')
rt, rm = remap(rt, rm, L, 0.93, 0.23 - 0.93 * 0.23, 0.93, 1.42 - 0.93 * 1.3)
finish('right', rt, rm, [(0, L, 0, 0.4)], L)
