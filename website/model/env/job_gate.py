# Headless job: where the main entrance's collapsible gate falls in the entrance view (CAM-entrance, at the size
# publish.sh renders it): its four corners in pixels, renders/gate_quad.json. The website draws the gate there
# itself, a see-through lattice over the hall photograph (make_hall.py), and folds it open.
# Usage: blender -b sxebs_street_v1.blend --python job_gate.py
import bpy, json, sys, traceback
from bpy_extras.object_utils import world_to_camera_view
HERE = r'C:/Users/legio/Workspace/Satyam_Xaviers_EBS_Frontend/website/model/env'
W, H = 1920, 1280
log = open(HERE + '/renders/job_gate.log', 'w', buffering=1)
sys.stdout = sys.stderr = log
try:
    sc = bpy.context.scene
    cam = bpy.data.objects['CAM-entrance']; sc.camera = cam
    sc.render.resolution_x, sc.render.resolution_y, sc.render.resolution_percentage = W, H, 100
    gate = bpy.data.objects['GEO-entrance_gate']
    pts = []
    for v in gate.data.vertices:
        p = world_to_camera_view(sc, cam, gate.matrix_world @ v.co)
        pts.append((p.x * W, (1 - p.y) * H))
    top = sorted(pts, key=lambda q: q[1])[:2]; bot = sorted(pts, key=lambda q: q[1])[2:]
    tl, tr = sorted(top); bl, br = sorted(bot)
    json.dump({'size': [W, H], 'tl': tl, 'tr': tr, 'br': br, 'bl': bl}, open(HERE + '/renders/gate_quad.json', 'w'), indent=1)
    print('quad', tl, tr, br, bl)
except Exception:
    traceback.print_exc()
print('DONE')
log.close()
