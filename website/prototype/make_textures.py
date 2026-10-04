"""Write textures.js: small window crops of the school photos as data URIs.

WebGL refuses images loaded from file:// in Chrome, so the 3D model's window
photos ship inside a script. Run from this folder: python make_textures.py
"""
import base64
import io
import json
import os

from PIL import Image, ImageOps

HERE = os.path.dirname(os.path.abspath(__file__))
PICK = ["ey1", "ey4", "cls2", "write1", "cls3", "cls5", "batch", "himal"]
W, H = 384, 512  # windows are portrait, 3:4

out = {}
for name in PICK:
    im = ImageOps.exif_transpose(Image.open(os.path.join(HERE, "img", name + ".jpg"))).convert("RGB")
    im = ImageOps.fit(im, (W, H), Image.LANCZOS, centering=(0.5, 0.4))
    buf = io.BytesIO()
    im.save(buf, "JPEG", quality=78, optimize=True)
    out[name] = "data:image/jpeg;base64," + base64.b64encode(buf.getvalue()).decode()

with open(os.path.join(HERE, "textures.js"), "w", encoding="utf-8") as f:
    f.write("window.SX_TEX = " + json.dumps(out) + ";\n")
print(len(out), "textures,", round(os.path.getsize(os.path.join(HERE, "textures.js")) / 1024), "KB")
