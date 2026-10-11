# Depth .npy -> the website's 8-bit depth map (sqrt of near-normalised disparity, near grown, softened).
import sys, numpy as np
src, out, zref = sys.argv[1], sys.argv[2], float(sys.argv[3])
z = np.load(src)
d = np.clip(zref / np.maximum(z, 1e-3), 0, 1)
for _ in range(3):
    p = np.pad(d, 1, mode='edge')
    d = np.maximum.reduce([p[1:-1, 1:-1], p[:-2, 1:-1], p[2:, 1:-1], p[1:-1, :-2], p[1:-1, 2:]])
k = 2; p = np.pad(d, k, mode='edge'); acc = np.zeros_like(d)
for dy in range(-k, k + 1):
    for dx in range(-k, k + 1): acc += p[k + dy:k + dy + d.shape[0], k + dx:k + dx + d.shape[1]]
d = acc / ((2 * k + 1) ** 2)
g = (np.sqrt(d) * 255 + 0.5).astype(np.uint8)
if out.endswith('.png'):
    from PIL import Image
    Image.fromarray(g).save(out, optimize=True)
else:
    g.tofile(out)
print(d.shape)
