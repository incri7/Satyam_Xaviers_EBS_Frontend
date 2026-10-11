# The hall behind the main entrance's collapsible gate, as the client photographed it (IMG_3026): straight through
# from the entrance, red beams and the paper bees under the white ceiling, the dark-green dado, and at the far end
# the back gate open onto the banana plants. Cut to the doorway's proportions (3.0 x 2.45 m), so the website can
# show it through the gate's lattice and zoom into it. Run: python make_hall.py <stamp>
import os, sys
from PIL import Image, ImageOps

SRC = r'C:/Users/legio/Downloads/SXEBS/new_info/School Images/School Images/IMG_3026.JPG'
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'public', 'models', 'env')
V = sys.argv[1] if len(sys.argv) > 1 else 'dev'
im = ImageOps.exif_transpose(Image.open(SRC)).convert('RGB')      # 2160 x 3840
W = im.width; H = round(W / (3.0 / 2.45))
top = 800                                                          # from the beam's underside down past the back gate
im.crop((0, top, W, top + H)).resize((1400, round(1400 * H / W)), Image.LANCZOS).save(os.path.join(OUT, f'hall_{V}.webp'), quality=84)
print('hall written', V)
