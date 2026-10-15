# The whiteboard's four corners as each frame of the walk sees them (classroom_path.blend's CAM-walk), for the
# marker drawing the website lays over it. Frame k of the way into Gallery is the walk's k - 65 (assemble.py).
import bpy, sys, json, os
from mathutils import Vector
from bpy_extras.object_utils import world_to_camera_view
out = sys.argv[sys.argv.index('--') + 1]
sc = bpy.context.scene; cam = bpy.data.objects['CAM-walk']; sc.camera = cam
sc.render.resolution_x, sc.render.resolution_y = 1600, 900
L = 7.4; y = L - 0.004
C = [Vector((2.217, y, 1.972)), Vector((4.119, y, 1.972)), Vector((4.119, y, 0.889)), Vector((2.217, y, 0.889))]
res = {}
for j in range(100, 241):
    sc.frame_set(j)
    q = [world_to_camera_view(sc, cam, c) for c in C]
    if any(p.z <= 0.05 for p in q): continue
    res[j + 65] = [[round(p.x, 5), round(1 - p.y, 5)] for p in q]
json.dump(res, open(out, 'w'))
open(out + '.done', 'w').write('DONE')
