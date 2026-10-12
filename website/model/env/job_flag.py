# Headless job: where the school's flag falls in the street view and the front view (CAM-streetview, CAM-front, at
# the sizes publish.sh renders them): its four corners in pixels, hoist top, fly top, fly bottom, hoist bottom. The
# renders leave the cloth out; the website draws it there, waving (sections/Flag.tsx).
# Usage: blender -b sxebs_street_v1.blend --python job_flag.py -- <out json>
import bpy, json, sys, traceback
from mathutils import Vector
from bpy_extras.object_utils import world_to_camera_view
OUT = sys.argv[sys.argv.index('--') + 1]
HERE = r'C:/Users/legio/Workspace/Satyam_Xaviers_EBS_Frontend/website/model/env'
log = open(HERE + '/renders/job_flag.log', 'w', buffering=1); sys.stdout = sys.stderr = log
try:
    sc = bpy.context.scene
    q = list(bpy.data.objects['GEO-school_flag']['web_quad'])
    corners = [Vector(q[i:i + 3]) for i in range(0, 12, 3)]
    res = {}
    for key, cam, (w, h) in (('street', 'CAM-streetview', (1920, 1024)), ('front', 'CAM-front', (1920, 1080))):
        sc.render.resolution_x, sc.render.resolution_y, sc.render.resolution_percentage = w, h, 100
        c = bpy.data.objects[cam]
        res[key] = {'size': [w, h], 'quad': [round(v, 1) for p in corners for v in (world_to_camera_view(sc, c, p).x * w, (1 - world_to_camera_view(sc, c, p).y) * h)]}
    json.dump(res, open(OUT, 'w'), indent=1); print(res)
except Exception:
    traceback.print_exc()
print('DONE'); log.close()
