# Headless job: render cameras of the open scene (colour PNG + multilayer EXR with depth).
# Usage: blender -b scene.blend --python job_render.py -- CAM-a:WxH[:samples] CAM-b:WxH ...
import bpy, sys, time, traceback
HERE = r'C:/Users/legio/Workspace/Satyam_Xaviers_EBS_Frontend/website/model/env'
args = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
log = open(HERE + '/renders/job_render.log', 'w', buffering=1)
sys.stdout = sys.stderr = log
t = time.time()
try:
    sc = bpy.context.scene
    cp = bpy.context.preferences.addons['cycles'].preferences
    cp.compute_device_type = 'OPTIX'; cp.get_devices()
    for d in cp.devices: d.use = d.type == 'OPTIX'
    sc.cycles.device = 'GPU'
    bpy.context.view_layer.use_pass_z = True
    for a in args:
        parts = a.split(':'); name = parts[0]; w, h = map(int, parts[1].split('x'))
        sc.camera = bpy.data.objects[name]
        sc.render.resolution_x, sc.render.resolution_y, sc.render.resolution_percentage = w, h, 100
        sc.cycles.samples = int(parts[2]) if len(parts) > 2 else 96
        bpy.ops.render.render()
        rr = bpy.data.images['Render Result']; s = sc.render.image_settings
        s.media_type = 'IMAGE'; s.file_format = 'PNG'; s.color_mode = 'RGB'; s.color_depth = '8'
        rr.save_render(f'{HERE}/renders/street_{name[4:]}.png', scene=sc)
        s.media_type = 'MULTI_LAYER_IMAGE'; s.color_depth = '32'
        rr.save_render(f'{HERE}/renders/street_{name[4:]}.exr', scene=sc)
        s.media_type = 'IMAGE'; s.file_format = 'PNG'
        print('rendered', name, round(time.time() - t, 1))
except Exception:
    traceback.print_exc()
print('DONE')
log.close()
