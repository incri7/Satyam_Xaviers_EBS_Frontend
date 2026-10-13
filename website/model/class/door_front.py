"""The classroom's double door (WELCOME, To Our Class) in the front view's first-floor doorway beside the grill gate,
for the zoom into it (Classroom.tsx): drawn over the painted single door, widened to the next window, in the
corridor's shade, with the railing's top rail and bars in front of it as the front view has them."""
import cv2, numpy as np
P = 'pano/'
front = cv2.imread(r'C:/Users/legio/Workspace/Satyam_Xaviers_EBS_Frontend/website/public/models/env/front_color_10122230.webp')
X0, Y0, X1, Y1 = 676, 669, 745, 770          # in the 1920 x 1080 front view
K = 10                                         # patch pixels per front-view pixel
w, h = (X1 - X0) * K, (Y1 - Y0) * K
patch = np.zeros((h, w, 3), np.float32); patch[:] = (42, 50, 104)      # the door frame
b = int(0.05 * h / 2.2); lw = (w - 2 * b) // 2
for i, f in enumerate(('door_welcome.jpg', 'door_class.jpg')):
    patch[b:, b + i * lw + 1:b + i * lw + lw - 1] = cv2.resize(cv2.imread(P + f), (lw - 2, h - b), interpolation=cv2.INTER_AREA)
door_px = front[Y0 + 3:Y0 + 70, X0 + 3:X0 + 48].reshape(-1, 3).astype(np.float32)
patch *= (np.median(door_px, 0) / np.median(patch[b:, b:-b].reshape(-1, 3), 0) * 1.35)[None, None]
# the railing in front: the top rail across, the bars every 6.03 px, in line with those either side of the door
def band(y0, y1, col):
    a, c = int((y0 - Y0) * K), int((y1 - Y0) * K); patch[a:c] = col
band(747.0, 750.2, (100, 124, 128))
for k in range(12):
    x = (677.1 + 6.025 * k - X0) * K
    a, c = int(x - 6), int(x + 6)
    if 0 <= a and c <= w: patch[int((750.2 - Y0) * K):, a:c] = (90, 115, 118)
patch = cv2.GaussianBlur(patch, (0, 0), 2.0)       # as soft as the front view itself is at this size
cv2.imwrite(P + 'door_front.png', np.clip(patch, 0, 255).astype(np.uint8))
prev = cv2.resize(front[640:800, 640:790], None, fx=K, fy=K, interpolation=cv2.INTER_CUBIC)
prev[(Y0 - 640) * K:(Y0 - 640) * K + h, (X0 - 640) * K:(X0 - 640) * K + w] = np.clip(patch, 0, 255).astype(np.uint8)
cv2.imwrite('door_front_preview.jpg', cv2.resize(prev, None, fx=0.5, fy=0.5))
small = front.copy(); small[Y0:Y1, X0:X1] = cv2.resize(np.clip(patch, 0, 255).astype(np.uint8), (X1 - X0, Y1 - Y0), interpolation=cv2.INTER_AREA)
cv2.imwrite('door_front_actual.png', cv2.resize(small[600:840, 560:900], None, fx=3, fy=3, interpolation=cv2.INTER_NEAREST))
