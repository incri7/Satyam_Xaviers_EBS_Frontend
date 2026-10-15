"""Phase 1 of the gallery entry: the classroom (classroom.blend, from build_room.py) gets its real door, the WELCOME
double door in the front wall with the corridor outside, and the camera's one move: through the door, one turn
across the room, square onto the whiteboard, and in. Renders stills at chosen frames.
Run: blender -b classroom.blend --python build_path.py -- <dir> <width> <samples> <frames,comma,separated>"""
import bpy, math, sys, os, traceback

argv = sys.argv[sys.argv.index('--') + 1:]
DIR, WIDTH, SAMPLES = argv[0], int(argv[1]), int(argv[2]); ALL = argv[3] == 'ALL'
FRAMES = [] if ALL else [int(f) for f in argv[3].split(',')]
LOG = os.path.join(DIR, 'build_path.log')
W, L, HC = 6.2, 7.4, 3.5
T = 0.23                         # the wall's thickness
DX0, DX1, DH = 4.52, 5.92, 2.2   # the doorway in the front wall (where the photo has it)

def srgb(c):
    return tuple(((v / 255) / 12.92) if v / 255 <= 0.04045 else (((v / 255) + 0.055) / 1.055) ** 2.4 for v in c) + (1.0,)

def mat_pbr(name, color, rough=0.6):
    m = bpy.data.materials.new(name); m.use_nodes = True
    b = next(n for n in m.node_tree.nodes if n.type == 'BSDF_PRINCIPLED')
    b.inputs['Base Color'].default_value = color; b.inputs['Roughness'].default_value = rough
    return m

def mat_img(name, path, rough=0.45, metal=0.0):
    m = bpy.data.materials.new(name); m.use_nodes = True; nt = m.node_tree
    b = next(n for n in nt.nodes if n.type == 'BSDF_PRINCIPLED')
    tx = nt.nodes.new('ShaderNodeTexImage'); tx.image = bpy.data.images.load(path)
    nt.links.new(tx.outputs['Color'], b.inputs['Base Color'])
    b.inputs['Roughness'].default_value = rough; b.inputs['Metallic'].default_value = metal
    return m

def mesh(name, verts, faces, mats, uvs=None, mat_idx=None):
    me = bpy.data.meshes.new(name); me.from_pydata(verts, [], faces); me.update()
    if uvs:
        uvl = me.uv_layers.new(); i = 0
        for poly in me.polygons:
            for li in poly.loop_indices: uvl.data[li].uv = uvs[i]; i += 1
    for m in mats: me.materials.append(m)
    if mat_idx:
        for poly, k in zip(me.polygons, mat_idx): poly.material_index = k
    ob = bpy.data.objects.new(name, me); bpy.context.collection.objects.link(ob); return ob

def quad_uv(name, x0, x1, z0, z1, y, mat, uw=W):
    """a piece of the front wall at y, its photo mapped by position (u = x / W, v = z / HC)"""
    v = [(x0, y, z0), (x1, y, z0), (x1, y, z1), (x0, y, z1)]
    uv = [(x0 / uw, z0 / HC), (x1 / uw, z0 / HC), (x1 / uw, z1 / HC), (x0 / uw, z1 / HC)]
    return mesh(name, v, [(0, 1, 2, 3)], [mat], uv)

def box(name, x0, x1, y0, y1, z0, z1, mat):
    v = [(x0, y0, z0), (x1, y0, z0), (x1, y1, z0), (x0, y1, z0), (x0, y0, z1), (x1, y0, z1), (x1, y1, z1), (x0, y1, z1)]
    f = [(0, 3, 2, 1), (4, 5, 6, 7), (0, 1, 5, 4), (1, 2, 6, 5), (2, 3, 7, 6), (3, 0, 4, 7)]
    return mesh(name, v, f, [mat])

def key(ob, frame, **props):
    for k, v in props.items(): setattr(ob, k, v); ob.keyframe_insert(k, frame=frame)

try:
    sc = bpy.context.scene
    # 1. the front wall, with the doorway cut out of it
    front = bpy.data.objects['W-front']; fm = front.data.materials[0]
    bpy.data.objects.remove(front, do_unlink=True)
    quad_uv('W-front-l', 0, DX0, 0, HC, L, fm); quad_uv('W-front-r', DX1, W, 0, HC, L, fm)
    quad_uv('W-front-t', DX0, DX1, DH, HC, L, fm)
    # its outside: the building's yellow, the corridor's floor and the balcony slab over it
    YEL = mat_pbr('yellow-wall', srgb((208, 184, 104)), 0.8)
    yo = L + T
    for (x0, x1, z0, z1) in [(-3, DX0, 0, 3.3), (DX1, W + 3, 0, 3.3), (DX0, DX1, DH, 3.3)]:
        mesh('outside', [(x1, yo, z0), (x0, yo, z0), (x0, yo, z1), (x1, yo, z1)], [(0, 1, 2, 3)], [YEL])
    FRAME = mat_pbr('door-frame', srgb((104, 50, 42)), 0.45)
    box('jamb-l', DX0 - 0.06, DX0, L - 0.02, yo + 0.02, 0, DH, FRAME)
    box('jamb-r', DX1, DX1 + 0.06, L - 0.02, yo + 0.02, 0, DH, FRAME)
    box('head', DX0 - 0.06, DX1 + 0.06, L - 0.02, yo + 0.02, DH, DH + 0.06, FRAME)
    box('sill', DX0, DX1, L, yo, -0.02, 0.005, bpy.data.materials['terrazzo'])
    box('corridor-floor', -3, W + 3, yo, yo + 2.6, -0.02, 0, bpy.data.materials['terrazzo'])
    box('corridor-slab', -3, W + 3, yo, yo + 2.6, 3.3, 3.42, mat_pbr('slab', srgb((40, 92, 160)), 0.6))
    # 2. the double door: WELCOME on the left leaf, To Our Class on the right (as seen from the corridor)
    STEEL = mat_pbr('steel-edge', srgb((60, 62, 70)), 0.4)
    def leaf(name, hinge_x, sign, outer_tex):
        """sign -1: the leaf lies to -x of its hinge; +1: to +x. Outer face (+y) carries the papers."""
        w, t, h = 0.695, 0.04, DH - 0.03
        xa, xb = (-w, 0) if sign < 0 else (0, w)
        v = [(xa, -t / 2, 0), (xb, -t / 2, 0), (xb, t / 2, 0), (xa, t / 2, 0), (xa, -t / 2, h), (xb, -t / 2, h), (xb, t / 2, h), (xa, t / 2, h)]
        f = [(3, 2, 6, 7),  # outer +y
             (0, 1, 5, 4),  # inner -y
             (0, 3, 2, 1), (4, 5, 6, 7), (1, 2, 6, 5), (3, 0, 4, 7)]
        # outer, as seen from the corridor: screen left is +x
        uo = [(1, 0), (0, 0), (0, 1), (1, 1)] if True else None
        ui = [(0, 0), (1, 0), (1, 1), (0, 1)]
        uvs = uo + ui + [(0, 0)] * 16
        ob = mesh(name, v, f, [mat_img(name + '-out', os.path.join(DIR, outer_tex), 0.5, 0.0),
                              mat_img(name + '-in', os.path.join(DIR, 'door_inner.jpg'), 0.5, 0.0), STEEL], uvs, [0, 1, 2, 2, 2, 2])
        ob.location = (hinge_x, L + 0.12, 0.01); return ob
    # the leaf at x = DX1 shows on the corridor's left: it carries WELCOME
    la = leaf('leaf-welcome', DX1, -1, 'door_welcome.jpg')
    lb = leaf('leaf-class', DX0, +1, 'door_class.jpg')
    # the corridor's daylight, falling on the door
    d = bpy.data.lights.new('corridor-sky', 'AREA'); d.energy = 120; d.shape = 'RECTANGLE'; d.size, d.size_y = 5.0, 1.2
    d.color = (1, 0.98, 0.94)
    lo = bpy.data.objects.new('corridor-sky', d); bpy.context.collection.objects.link(lo)
    lo.location = (5.2, yo + 2.3, 2.6); lo.rotation_euler = (math.radians(-70), 0, math.radians(180))
    lo.rotation_euler = (math.radians(70), 0, 0)
    # aim it at the door
    import mathutils
    dvec = mathutils.Vector((5.2, yo, 1.1)) - lo.location; lo.rotation_euler = dvec.to_track_quat('-Z', 'Y').to_euler()

    # 3. the camera's one move
    cd = bpy.data.cameras.new('walk'); cd.lens = 24; cd.sensor_width = 36
    cam = bpy.data.objects.new('CAM-walk', cd); bpy.context.collection.objects.link(cam); sc.camera = cam
    R = math.radians
    path = [  # frame, (x, y, z), (pitch, yaw)
        (0,   (5.22, L + 2.8, 1.42), (89, 180)),
        (30,  (5.22, L + 2.2, 1.43), (89, 180)),
        (75,  (5.22, L + 0.55, 1.45), (88, 180)),
        (100, (5.12, L - 0.55, 1.45), (87, 172)),
        (148, (4.2, L - 1.05, 1.45), (86, 98)),
        (185, (3.2, L - 2.55, 1.44), (88, 28)),
        (205, (3.15, L - 3.0, 1.42), (90, 0)),
        (240, (3.15, L - 1.12, 1.42), (90, 0)),
    ]
    for f, p, (pi, ya) in path:
        cam.location = p; cam.rotation_euler = (R(pi), 0, R(ya))
        cam.keyframe_insert('location', frame=f); cam.keyframe_insert('rotation_euler', frame=f)
    # the doors open as the camera reaches them
    for ob, s in ((la, 1), (lb, -1)):
        ob.rotation_euler = (0, 0, 0); ob.keyframe_insert('rotation_euler', frame=22)
        ob.rotation_euler = (0, 0, R(100 * s)); ob.keyframe_insert('rotation_euler', frame=70)
    for ob in (cam, la, lb):
        ad = ob.animation_data
        if ad and ad.action:
            fcs = getattr(ad.action, 'fcurves', None)
            if fcs is None:   # layered actions (Blender 4.4+)
                fcs = [fc for layer in ad.action.layers for strip in layer.strips for cb in strip.channelbags for fc in cb.fcurves]
            for fc in fcs:
                for kp in fc.keyframe_points: kp.interpolation = 'BEZIER'; kp.handle_left_type = kp.handle_right_type = 'AUTO_CLAMPED'
    sc.frame_start, sc.frame_end = 0, 240
    sc.render.fps = 24

    try:
        prefs = bpy.context.preferences.addons['cycles'].preferences
        for t in ('OPTIX', 'CUDA', 'HIP', 'ONEAPI'):
            try:
                prefs.compute_device_type = t; prefs.get_devices()
                if any(dv.type == t for dv in prefs.devices):
                    for dv in prefs.devices: dv.use = True
                    sc.cycles.device = 'GPU'; break
            except Exception: pass
    except Exception: pass
    sc.cycles.samples = SAMPLES
    sc.render.resolution_x = WIDTH; sc.render.resolution_y = WIDTH * 9 // 16
    bpy.ops.wm.save_as_mainfile(filepath=os.path.join(DIR, 'classroom_path.blend'))
    if ALL:
        os.makedirs(os.path.join(DIR, 'frames'), exist_ok=True)
        sc.render.filepath = os.path.join(DIR, 'frames', 'f_'); sc.render.image_settings.file_format = 'PNG'
        bpy.ops.render.render(animation=True)
    for f in FRAMES:
        sc.frame_set(f); sc.render.filepath = os.path.join(DIR, f'path_{f:03d}.png')
        bpy.ops.render.render(write_still=True)
    open(LOG, 'w').write('DONE\n')
except Exception:
    open(LOG, 'w').write(traceback.format_exc() + '\nDONE\n')
