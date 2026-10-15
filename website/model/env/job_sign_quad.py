# Headless: where the signboard's four corners land in the opening render (pixels, origin top-left).
import bpy, json
from bpy_extras.object_utils import world_to_camera_view
HERE = r'C:/Users/legio/Workspace/Satyam_Xaviers_EBS_Frontend/website/model/env/'
sc = bpy.context.scene; cam = bpy.data.objects['CAM-streetview']
W, H = 1920, 1024
sc.render.resolution_x, sc.render.resolution_y, sc.render.resolution_percentage = W, H, 100
ob = bpy.data.objects['GEO-signboard']
me = ob.data
# the plane's loops carry its UVs: (0,0) bottom-left of the picture ... (1,1) top-right
uv = me.uv_layers[0].data
pts = {}
for poly in me.polygons:
    for li in poly.loop_indices:
        u, v = uv[li].uv
        co = ob.matrix_world @ me.vertices[me.loops[li].vertex_index].co
        p = world_to_camera_view(sc, cam, co)
        pts[(round(u), round(v))] = [round(p.x * W, 2), round((1 - p.y) * H, 2), round(p.z, 3)]
out = {'image': [W, H], 'tl': pts[(0, 1)], 'tr': pts[(1, 1)], 'br': pts[(1, 0)], 'bl': pts[(0, 0)]}
json.dump(out, open(HERE + 'renders/sign_quad.json', 'w'), indent=1)
open(HERE + 'renders/job_sign_quad.log', 'w').write(json.dumps(out) + '\nDONE\n')
