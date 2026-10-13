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
