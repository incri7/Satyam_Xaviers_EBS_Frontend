# Headless: the opening view again with the signboard taken off its posts (the posts stay): the clean plate
# that shows behind the board when the first scroll swings it out. Same camera, size and light as publish.sh.
import bpy, sys
HERE = r'C:/Users/legio/Workspace/Satyam_Xaviers_EBS_Frontend/website/model/env/'
log = open(HERE + 'renders/job_plate.log', 'w', buffering=1); sys.stdout = sys.stderr = log
sc = bpy.context.scene
cp = bpy.context.preferences.addons['cycles'].preferences
cp.compute_device_type = 'OPTIX'; cp.get_devices()
for d in cp.devices: d.use = d.type == 'OPTIX'
sc.cycles.device = 'GPU'
for n in ('GEO-signboard', 'GEO-signboard_back'):
    bpy.data.objects[n].hide_render = True
sc.camera = bpy.data.objects['CAM-streetview']
sc.render.resolution_x, sc.render.resolution_y, sc.render.resolution_percentage = 1920, 1024, 100
sc.cycles.samples = 256
s = sc.render.image_settings; s.media_type = 'IMAGE'; s.file_format = 'PNG'; s.color_mode = 'RGB'; s.color_depth = '8'
sc.render.filepath = HERE + 'renders/street_plate.png'
bpy.ops.render.render(write_still=True)
print('DONE')
