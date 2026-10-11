# Headless job: the entrance view again, its gate folded away (school_entrance_open.png on the gate's panel),
# with the same camera, size, samples and exposure as publish.sh's entrance view; and where the gate's four
# corners fall in that picture (renders/gate_quad.json, pixels), for the website's fold.
# Usage: blender -b sxebs_street_v1.blend --python job_gate.py
import bpy, json, sys, time, traceback
from bpy_extras.object_utils import world_to_camera_view
HERE = r'C:/Users/legio/Workspace/Satyam_Xaviers_EBS_Frontend/website/model/env'
W, H, SAMPLES, EXPOSURE = 1920, 1280, 192, 0.8
log = open(HERE + '/renders/job_gate.log', 'w', buffering=1)
sys.stdout = sys.stderr = log
t = time.time()
try:
    sc = bpy.context.scene
    cp = bpy.context.preferences.addons['cycles'].preferences
    cp.compute_device_type = 'OPTIX'; cp.get_devices()
    for d in cp.devices: d.use = d.type == 'OPTIX'
    sc.cycles.device = 'GPU'
    cam = bpy.data.objects['CAM-entrance']; sc.camera = cam
    sc.render.resolution_x, sc.render.resolution_y, sc.render.resolution_percentage = W, H, 100
    gate = bpy.data.objects['GEO-entrance_gate']
    # the gate's corners on the picture, from its four vertices: tl, tr, br, bl as the camera sees them
    pts = []
    for v in gate.data.vertices:
        p = world_to_camera_view(sc, cam, gate.matrix_world @ v.co)
        pts.append((p.x * W, (1 - p.y) * H))
    top = sorted(pts, key=lambda q: q[1])[:2]; bot = sorted(pts, key=lambda q: q[1])[2:]
    tl, tr = sorted(top); bl, br = sorted(bot)
    json.dump({'size': [W, H], 'tl': tl, 'tr': tr, 'br': br, 'bl': bl}, open(HERE + '/renders/gate_quad.json', 'w'), indent=1)
    print('quad', tl, tr, br, bl)
    mat = gate.material_slots[0].material
    tex = next(n for n in mat.node_tree.nodes if n.type == 'TEX_IMAGE')
    tex.image = bpy.data.images.load(HERE + '/data/street/school_entrance_open.png', check_existing=True)
    sc.cycles.samples = SAMPLES
    sc.view_settings.exposure += EXPOSURE
    bpy.ops.render.render()
    rr = bpy.data.images['Render Result']; s = sc.render.image_settings
    s.media_type = 'IMAGE'; s.file_format = 'PNG'; s.color_mode = 'RGB'; s.color_depth = '8'
    rr.save_render(HERE + '/renders/street_entrance_open.png', scene=sc)
    print('rendered', round(time.time() - t, 1))
except Exception:
    traceback.print_exc()
print('DONE')
log.close()
