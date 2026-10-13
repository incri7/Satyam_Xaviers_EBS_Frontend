import cv2, numpy as np
PX = 360; HC = 3.5
X = lambda u: int(u * PX); Y = lambda v: int((HC - v) * PX)
rt = cv2.imread('tex_right.jpg'); lf = cv2.imread('tex_left.jpg')
# the Devanagari board: square its right end at 4.6 m, with its painted border
board = rt[Y(2.66):Y(1.43), X(4.45):X(4.62)]
white = np.median(rt[Y(2.3):Y(2.0), X(4.0):X(4.1)].reshape(-1, 3), 0)
rt[Y(2.655):Y(1.435), X(4.56):X(4.64)] = white
ink = np.median(rt[Y(2.67):Y(2.64), X(3.2):X(3.6)].reshape(-1, 3), 0) * 0 + np.array([40, 40, 40])
cv2.line(rt, (X(4.62), Y(2.66)), (X(4.62), Y(1.43)), ink.tolist(), 4)
cv2.line(rt, (X(4.3), Y(2.66)), (X(4.62), Y(2.66)), ink.tolist(), 4)
cv2.line(rt, (X(4.3), Y(1.43)), (X(4.62), Y(1.43)), ink.tolist(), 4)
# children's drawings along the bare back half: a strip from the opposite wall, pinned under the dado line
strip = lf[Y(1.47):Y(0.88), X(1.45):X(3.05)].astype(np.float32)
u0 = 4.85; dst = rt[Y(1.47):Y(0.88), X(u0):X(u0) + strip.shape[1]].astype(np.float32)
g = np.median(dst[-20:].reshape(-1, 3), 0) / np.maximum(np.median(strip[-20:].reshape(-1, 3), 0), 1)
strip = np.clip(strip * g, 0, 255)
a = np.zeros(strip.shape[:2], np.float32); a[10:-10, 14:-14] = 1; a = cv2.GaussianBlur(a, (0, 0), 6)[..., None]
rt[Y(1.47):Y(0.88), X(u0):X(u0) + strip.shape[1]] = (strip * a + dst * (1 - a)).astype(np.uint8)
cv2.imwrite('tex_right.jpg', rt, [cv2.IMWRITE_JPEG_QUALITY, 92])
cv2.imwrite('z_right2.jpg', cv2.resize(rt[:, X(2.5):], None, fx=.35, fy=.35))
