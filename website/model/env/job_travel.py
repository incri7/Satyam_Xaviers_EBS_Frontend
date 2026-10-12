# Headless job: the camera's flight from the opening shot (CAM-streetview) to the school's front (CAM-front), as a
# numbered frame sequence the website scrubs with the scroll. The camera rises off the road and pushes in over
# the neighbours, then comes round and down onto the open ground in front of the long side; its view turns
# from the driveway to the facade along the way, and its lens eases from the street's to the front's.
# Usage: blender -b sxebs_street_v1.blend --python job_travel.py -- <out dir> <frames> <WxH> <samples>
import bpy, math, os, sys, time, traceback
from mathutils import Vector
args = sys.argv[sys.argv.index('--') + 1:]
OUT, N = args[0], int(args[1]); W, H = map(int, args[2].split('x')); SAMPLES = int(args[3])
os.makedirs(OUT, exist_ok=True)
log = open(os.path.join(OUT, 'job_travel.log'), 'w', buffering=1); sys.stdout = sys.stderr = log
t0 = time.time()
try:
    sc = bpy.context.scene
    cp = bpy.context.preferences.addons['cycles'].preferences
    cp.compute_device_type = 'OPTIX'; cp.get_devices()
    for d in cp.devices: d.use = d.type == 'OPTIX'
    sc.cycles.device = 'GPU'; sc.cycles.samples = SAMPLES
    a, b = bpy.data.objects['CAM-streetview'], bpy.data.objects['CAM-front']
    fa = a.matrix_world.to_quaternion() @ Vector((0, 0, -1)); fb = b.matrix_world.to_quaternion() @ Vector((0, 0, -1))
    fa2 = Vector((fa.x, fa.y, 0)).normalized(); fb2 = Vector((fb.x, fb.y, 0)).normalized()
    Z = Vector((0, 0, 1))
    P0, P3 = a.location.copy(), b.location.copy()
    P1 = P0 + fa2 * 4 + Z * 18           # first up, almost straight, clear of the trees and the neighbours' roofs
    P2 = P3 - fb2 * 20 + Z * 8           # out over the open ground, still above the front's height
    # where it looks: from the street camera's aim, through the school's middle, to the front camera's aim, so
    # the school stays in the frame all the way and the flight ends exactly on the front view
    side = [o for o in bpy.data.objects if o.name.startswith('GEO-school_side_') or o.name.startswith('GEO-school_front_')]
    pts = [o.matrix_world @ Vector(c) for o in side for c in o.bound_box]
    mid = sum(pts, Vector()) / len(pts)
    A0, A1, A2 = P0 + fa * 30, mid, P3 + fb * 28
    cam = bpy.data.objects.new('CAM-travel', bpy.data.cameras.new('CAM-travel')); sc.collection.objects.link(cam)
    cam.data.sensor_width = 36; cam.data.clip_start = 0.1; cam.data.clip_end = 60000
    sc.camera = cam
    sc.render.resolution_x, sc.render.resolution_y, sc.render.resolution_percentage = W, H, 100
    s = sc.render.image_settings; s.media_type = 'IMAGE'; s.file_format = 'PNG'; s.color_mode = 'RGB'; s.color_depth = '8'
    ease = lambda t: t * t * (3 - 2 * t)
    frames = [int(f) for f in args[4].split(',')] if len(args) > 4 else range(N)
    for k in frames:
        t = k / (N - 1); u = ease(t)
        cam.location = (1 - u) ** 3 * P0 + 3 * (1 - u) ** 2 * u * P1 + 3 * (1 - u) * u ** 2 * P2 + u ** 3 * P3
        w = ease(t); aim = (1 - w) ** 2 * A0 + 2 * (1 - w) * w * A1 + w ** 2 * A2
        cam.rotation_euler = (aim - cam.location).to_track_quat('-Z', 'Y').to_euler()
        cam.data.lens = a.data.lens + (b.data.lens - a.data.lens) * u
        bpy.ops.render.render()
        bpy.data.images['Render Result'].save_render(os.path.join(OUT, f'{k:03d}.png'), scene=sc)
        print('frame', k, round(time.time() - t0, 1))
except Exception:
    traceback.print_exc()
print('DONE'); log.close()
