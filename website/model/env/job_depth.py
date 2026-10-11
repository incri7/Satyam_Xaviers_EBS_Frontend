# Headless: read the Depth.Z pass of each EXR given after '--' and save it as .npy next to it.
import sys, numpy as np, OpenImageIO as oiio
HERE = r'C:/Users/legio/Workspace/Satyam_Xaviers_EBS_Frontend/website/model/env/renders/'
log = open(HERE + 'job_depth.log', 'w', buffering=1)
for f in sys.argv[sys.argv.index('--') + 1:]:
    inp = oiio.ImageInput.open(HERE + f); k = 0
    while inp.seek_subimage(k, 0):
        names = list(inp.spec().channelnames)
        if any(n.endswith('Depth.Z') for n in names):
            px = inp.read_image(format=oiio.FLOAT)
            z = px[..., names.index([n for n in names if n.endswith('Depth.Z')][0])] if px.ndim == 3 else px
            np.save(HERE + f.replace('.exr', '_z.npy'), z.astype(np.float32)); print(f, z.shape, file=log); break
        k += 1
    inp.close()
print('DONE', file=log); log.close()
