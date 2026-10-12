# Headless job: the front view with only the school in it (CAM-front, at the size, samples and exposure publish.sh
# renders it), on a transparent ground: everything that is not the building (the town, the trees, the ground, the
# sky) is a holdout, so the website's next page can pick up the building alone. The light is unchanged.
# Usage: blender -b sxebs_street_v1.blend --python job_cutout.py -- <out png>
import bpy, sys, traceback
OUT = sys.argv[sys.argv.index('--') + 1]
HERE = r'C:/Users/legio/Workspace/Satyam_Xaviers_EBS_Frontend/website/model/env'
SCHOOL = ('GEO-school_', 'GEO-entrance_', 'GEO-floor_gate_', 'GEO-roof_board')
log = open(HERE + '/renders/job_cutout.log', 'w', buffering=1); sys.stdout = sys.stderr = log
try:
    sc = bpy.context.scene
    cp = bpy.context.preferences.addons['cycles'].preferences
    cp.compute_device_type = 'OPTIX'; cp.get_devices()
    for d in cp.devices: d.use = d.type == 'OPTIX'
    sc.cycles.device = 'GPU'; sc.cycles.samples = 256
    sc.camera = bpy.data.objects['CAM-front']
    sc.render.resolution_x, sc.render.resolution_y, sc.render.resolution_percentage = 1920, 1080, 100
    sc.render.film_transparent = True
    n = 0
    for o in bpy.data.objects:
        if o.type in ('MESH', 'CURVE') and not o.name.startswith(SCHOOL):
            o.is_holdout = True; n += 1
    print('holdouts', n)
    bpy.ops.render.render()
    s = sc.render.image_settings; s.media_type = 'IMAGE'; s.file_format = 'PNG'; s.color_mode = 'RGBA'; s.color_depth = '8'
    bpy.data.images['Render Result'].save_render(OUT, scene=sc)
except Exception:
    traceback.print_exc()
print('DONE'); log.close()
