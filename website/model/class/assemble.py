"""The way into Gallery's frames: the new shot (entry_agx, the school's scene) up to just inside the door, then the
classroom walk already rendered (frames/, from build_path.py), its colours matched to the new render, cut over on the
one frame where both cameras stand in exactly the same place (new 165 = old 100: matched image to image; either
side of it the two paths drift apart, so a blend would show a double image)."""
import cv2, numpy as np, os
OFF, A, B = 65, 165, 164
lut = np.load('grade_lut.npy')
grade = lambda im: np.dstack([cv2.LUT(im[..., c], lut[c]) for c in range(3)])
os.makedirs('entry_final', exist_ok=True)
for k in range(306):
    new = f'entry_agx/e_{k:04d}.png'
    if k < A: im = cv2.imread(new)
    else:
        old = grade(cv2.imread(f'frames/f_{k - OFF:04d}.png'))
        if k <= B:
            a = (k - A + 1) / (B - A + 2); im = (cv2.imread(new).astype(np.float32) * (1 - a) + old * a).astype(np.uint8)
        else: im = old
    cv2.imwrite(f'entry_final/e_{k:04d}.png', im)
print('assembled', len(os.listdir('entry_final')))

# The whiteboard, white: the room's warm light tints it cream. Inside its outline on each frame (boardQuad.json, the
# board's corners as the camera saw them) its colour is set neutral and lifted towards a clean white; the ink, the
# board's shading and everything outside it are left as they are.
import json
quads = json.load(open('boardQuad.json'))
for k, q in quads.items():
    p = f'entry_final/e_{int(k):04d}.png'
    if not os.path.exists(p): continue
    im = cv2.imread(p).astype(np.float32); h, w = im.shape[:2]
    pts = np.array([[u * w, v * h] for u, v in q], np.float64)
    c = pts.mean(0); pts = c + (pts - c) * 0.988                       # just inside the frame
    if np.abs(pts).max() > 20 * max(w, h): continue
    m = np.zeros((h, w), np.uint8); cv2.fillPoly(m, [np.round(pts).astype(np.int32)], 255)
    if m.sum() < 255 * 2000: continue
    inside = im[m > 0]; lum = inside.mean(1)
    paper = inside[lum > np.percentile(lum, 45)]                       # the board itself, not the ink
    med = np.median(paper, 0); L = med.mean()
    gain = (L / med) * min(1.10, 244.0 / L)                              # neutral, then towards white
    a = cv2.GaussianBlur(m.astype(np.float32) / 255, (0, 0), 2.5)[..., None]
    im = im * (1 - a) + np.clip(im * gain[None, None, :], 0, 255) * a
    cv2.imwrite(p, im.astype(np.uint8))
print('board whitened')
