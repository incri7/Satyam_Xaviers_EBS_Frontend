# The camera's flight from the street to the school's front (job_travel.py's frames) for the website: WebP frames
# at two widths, 1280 for wide screens and 720 for phones, named with the publish stamp (nginx caches /models/ for
# a day, so a new name is never stale). Run: python make_travel.py <stamp>
import glob, os, shutil, sys
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, 'renders', 'travel')
OUT = os.path.join(HERE, '..', '..', 'public', 'models', 'env', 'travel')
V = sys.argv[1] if len(sys.argv) > 1 else 'dev'
frames = sorted(glob.glob(os.path.join(SRC, '[0-9][0-9][0-9].png')))
shutil.rmtree(OUT, ignore_errors=True)
for w in (1280, 720):
    os.makedirs(os.path.join(OUT, str(w)), exist_ok=True)
    for f in frames:
        im = Image.open(f).convert('RGB')
        if im.width != w: im = im.resize((w, round(im.height * w / im.width)), Image.LANCZOS)
        im.save(os.path.join(OUT, str(w), f'{os.path.basename(f)[:3]}_{V}.webp'), quality=66 if w > 720 else 64, method=6)
if os.path.exists(os.path.join(SRC, 'flag.json')):
    shutil.copy(os.path.join(SRC, 'flag.json'), os.path.join(HERE, '..', '..', 'src', 'sections', 'travelFlag.json'))
size = sum(os.path.getsize(os.path.join(dp, n)) for dp, _, ns in os.walk(OUT) for n in ns)
print('travel', len(frames), 'frames', round(size / 1e6, 1), 'MB')
