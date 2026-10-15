"""The way into Gallery as one shot in the school's own scene: from the website's front view (CAM-front), down to the
first-floor classroom door beside the stairs' grill gate (the door painted on the long side, s = 40.9 m), which
opens, a real door now, and in, into the early-years classroom (classroom.blend, build_room.py) set inside the
building behind it; one turn across the room, square onto the whiteboard and in.
Run: blender -b sxebs_street_v1.blend --python build_entry.py -- <dir> <WxH> <samples> <view: agx|std> <frames: a-b or a,b,c>"""
import bpy, math, sys, os, traceback
from mathutils import Vector, Matrix, Euler

argv = sys.argv[sys.argv.index('--') + 1:]
DIR = argv[0]; RW, RH = map(int, argv[1].split('x')); SAMPLES = int(argv[2]); VIEW = argv[3]; FR = argv[4]
OUTD = os.path.join(DIR, 'entry_' + VIEW); os.makedirs(OUTD, exist_ok=True)
LOG = os.path.join(DIR, f'build_entry_{VIEW}.log')
log = open(LOG, 'w', buffering=1)
R = math.radians
try:
    sc = bpy.context.scene
    # --- the building's own axes, from its first-floor long-side wall: P(s, t, z) --------------------------------
    # the doorway and its double door are part of the building now (model/env/job_door.py): take the axes from the
    # wall beside it, open the doorway's back, and animate the two leaves
    side = bpy.data.objects['GEO-school_side_1_a']
    v = [side.matrix_world @ p.co for p in side.data.vertices]
    S0 = 32.1                                         # the long side's wall starts at s = SF + CORR (env_school.py)
    DS, DW, DH = 41.08, 1.4, 2.2                      # the doorway (job_door.py)
    U = (v[1] - v[0]) / (DS - DW / 2 - S0); U.z = 0
    Zw = Vector((0, 0, 1)); Lw = Zw.cross(U)
    ZF = v[0].z
    def P(s, t, z): return Vector((v[0].x, v[0].y, ZF)) + U * (s - S0) + Lw * t + Zw * z
    WALL = 0.2
    bpy.data.objects.remove(bpy.data.objects['GEO-classdoor_back'], do_unlink=True)
    la, lb = bpy.data.objects['GEO-classdoor_welcome'], bpy.data.objects['GEO-classdoor_class']

    # --- the classroom, set inside the building behind the door ---------------------------------------------------
    L = 7.4
    with bpy.data.libraries.load(os.path.join(DIR, 'classroom.blend'), link=False) as (src, dst):
        dst.objects = [n for n in src.objects if n != 'CAM-pano']
    room = bpy.data.objects.new('ROOM', None); sc.collection.objects.link(room)
    # room-local x runs against s (its door, at x = 5.22, lands on the painted door); y = L is its front wall, WALL
    # inside the corridor's face; z from the first floor
    XD = 5.22
    O = P(DS + XD, WALL + L, 0)
    room.matrix_world = Matrix.Translation(O) @ Matrix((-U, -Lw, Zw)).transposed().to_4x4()
    for o in dst.objects:
        if o is None: continue
        sc.collection.objects.link(o); o.parent = room
    front = bpy.data.objects['W-front']; fm = front.data.materials[0]; bpy.data.objects.remove(front, do_unlink=True)
    W_, HC = 6.2, 3.5
    X0, X1 = XD - DW / 2, XD + DW / 2
    def room_piece(name, x0, x1, z0, z1):
        me = bpy.data.meshes.new(name)
        me.from_pydata([(x0, L, z0), (x1, L, z0), (x1, L, z1), (x0, L, z1)], [], [(0, 1, 2, 3)]); me.update()
        uvl = me.uv_layers.new()
        for li, (x, z) in zip(range(4), ((x0, z0), (x1, z0), (x1, z1), (x0, z1))): uvl.data[li].uv = (x / W_, z / HC)
        me.materials.append(fm); o = bpy.data.objects.new(name, me); sc.collection.objects.link(o); o.parent = room; return o
    room_piece('W-front-l', 0, X0, 0, HC); room_piece('W-front-r', X1, W_, 0, HC); room_piece('W-front-t', X0, X1, DH, HC)
    bpy.context.view_layer.update()

    # --- the camera's one shot --------------------------------------------------------------------------------------
    cf = bpy.data.objects['CAM-front']
    cam = bpy.data.objects.new('CAM-entry', bpy.data.cameras.new('CAM-entry')); sc.collection.objects.link(cam)
    cam.data.sensor_width = 36; cam.data.sensor_fit = cf.data.sensor_fit; cam.data.clip_start = 0.05; cam.data.clip_end = 60000
    sc.camera = cam
    RM = room.matrix_world.copy()
    def local_pose(x, y, z, pitch, yaw):
        m = RM @ (Matrix.Translation((x, y, z)) @ Euler((R(pitch), 0, R(yaw))).to_matrix().to_4x4())
        return m.to_translation(), m.to_quaternion()
    keys = [(0, cf.matrix_world.to_translation(), cf.matrix_world.to_quaternion(), cf.data.lens)]
    for f, (x, y, z, pi, ya), lens in [
            (80,  (XD, L + 4.2, 1.6, 88, 180), 25.5),
            (112, (XD, L + 1.6, 1.47, 89, 180), 24.3),
            (135, (XD, L + 0.9, 1.45, 89, 180), 24),
            (165, (5.12, L - 0.55, 1.45, 87, 172), 24),
            (213, (4.2, L - 1.05, 1.45, 86, 98), 24),
            (250, (3.2, L - 2.55, 1.44, 88, 28), 24),
            (270, (3.15, L - 3.0, 1.42, 90, 0), 24),
            (305, (3.15, L - 1.12, 1.42, 90, 0), 24)]:
        p, q = local_pose(x, y, z, pi, ya); keys.append((f, p, q, lens))
    # the shot frame by frame: positions on a time-parametrised Catmull-Rom (speed carries through each key, the
    # tangents limited so a long dive never overshoots the slow walk after it), the view and lens the same way,
    # easing out of the first frame and into the last
    eul, prev = [], None
    for f, p, q, lens in keys:
        e = q.to_euler('XYZ', prev) if prev else q.to_euler('XYZ'); prev = e; eul.append(Vector(e))
    T = [k[0] for k in keys]; Pp = [k[1] for k in keys]; Ln = [k[3] for k in keys]
    def tangents(vals):
        m = []
        for i in range(len(vals)):
            if i == 0 or i == len(vals) - 1: m.append(vals[i] * 0); continue
            d0 = (vals[i] - vals[i - 1]) / (T[i] - T[i - 1]); d1 = (vals[i + 1] - vals[i]) / (T[i + 1] - T[i])
            t_ = (vals[i + 1] - vals[i - 1]) / (T[i + 1] - T[i - 1])
            lim = min(d0.length, d1.length) if hasattr(d0, 'length') else min(abs(d0), abs(d1))
            n = t_.length if hasattr(t_, 'length') else abs(t_)
            m.append(t_ * (min(1.0, 1.5 * lim / n) if n > 1e-9 else 0))
        return m
    mP, mE, mL = tangents(Pp), tangents(eul), tangents(Ln)
    def herm(vals, ms, f):
        i = max(k for k in range(len(T) - 1) if T[k] <= f) if f < T[-1] else len(T) - 2
        h = T[i + 1] - T[i]; u = (f - T[i]) / h
        h00, h10, h01, h11 = 2*u**3 - 3*u**2 + 1, u**3 - 2*u**2 + u, -2*u**3 + 3*u**2, u**3 - u**2
        return vals[i] * h00 + ms[i] * (h10 * h) + vals[i + 1] * h01 + ms[i + 1] * (h11 * h)
    for f in range(T[0], T[-1] + 1):
        cam.location = herm(Pp, mP, f); cam.rotation_euler = Euler(herm(eul, mE, f)); cam.data.lens = herm(Ln, mL, f)
        cam.keyframe_insert('location', frame=f); cam.keyframe_insert('rotation_euler', frame=f); cam.data.keyframe_insert('lens', frame=f)
    # the doors open inward as the camera comes along the corridor
    for o, sgn in ((la, 1), (lb, -1)):
        r0 = o.rotation_euler.copy(); o.keyframe_insert('rotation_euler', frame=100)
        o.rotation_euler = (o.matrix_world.to_quaternion() @ Euler((0, 0, R(100 * sgn))).to_quaternion()).to_euler('XYZ', r0)
        o.keyframe_insert('rotation_euler', frame=136)
    def smooth(idb):
        ad = idb.animation_data
        if not (ad and ad.action): return
        fcs = getattr(ad.action, 'fcurves', None)
        if fcs is None:
            fcs = [fc for layer in ad.action.layers for strip in layer.strips for cb in strip.channelbags for fc in cb.fcurves]
        for fc in fcs:
            for kp in fc.keyframe_points: kp.interpolation = 'BEZIER'; kp.handle_left_type = kp.handle_right_type = 'AUTO_CLAMPED'
    smooth(la); smooth(lb)

    # --- render ------------------------------------------------------------------------------------------------------
    cp = bpy.context.preferences.addons['cycles'].preferences
    cp.compute_device_type = 'OPTIX'; cp.get_devices()
    for d in cp.devices: d.use = d.type == 'OPTIX'
    sc.cycles.device = 'GPU'; sc.cycles.samples = SAMPLES; sc.cycles.use_denoising = True
    sc.render.use_persistent_data = True
    if VIEW == 'std': sc.view_settings.view_transform = 'Standard'; sc.view_settings.look = 'None'; sc.view_settings.exposure = 0
    sc.render.resolution_x, sc.render.resolution_y, sc.render.resolution_percentage = RW, RH, 100
    s = sc.render.image_settings; s.file_format = 'PNG'; s.color_mode = 'RGB'; s.color_depth = '8'
    if '-' in FR: a, b = map(int, FR.split('-')); frames = range(a, b + 1)
    else: frames = [int(f) for f in FR.split(',')]
    if FR == '0-0': bpy.ops.wm.save_as_mainfile(filepath=os.path.join(DIR, 'entry.blend')); frames = []
    for k in frames:
        sc.frame_set(k); sc.render.filepath = os.path.join(OUTD, f'e_{k:04d}.png')
        bpy.ops.render.render(write_still=True); log.write(f'frame {k}\n')
except Exception:
    log.write(traceback.format_exc())
log.write('DONE\n'); log.close()
