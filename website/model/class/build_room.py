"""The early-years classroom as one room: the four walls from the rectified photos (tex_*.jpg), the benches, pillars,
beam, fans, projector and the corner cabinet modelled, rendered as one 360 panorama from the aisle.
Run: blender -b --factory-startup --python build_room.py -- <dir> <width> <samples> <out.png>"""
import bpy, bmesh, math, sys, os, traceback
from mathutils import Vector

argv = sys.argv[sys.argv.index('--') + 1:]
DIR, WIDTH, SAMPLES, OUT = argv[0], int(argv[1]), int(argv[2]), argv[3]
LOG = os.path.join(DIR, 'build_room.log')
W, L, HC, BEAM = 6.2, 7.4, 3.5, 3.05

def srgb(c):
    return tuple(((v / 255) / 12.92) if v / 255 <= 0.04045 else (((v / 255) + 0.055) / 1.055) ** 2.4 for v in c) + (1.0,)

def mat_pbr(name, color, rough=0.6, sheen=0.0, coat=0.0):
    m = bpy.data.materials.new(name); m.use_nodes = True
    b = next(n for n in m.node_tree.nodes if n.type == 'BSDF_PRINCIPLED')
    b.inputs['Base Color'].default_value = color; b.inputs['Roughness'].default_value = rough
    if sheen: b.inputs['Sheen Weight'].default_value = sheen
    if coat: b.inputs['Coat Weight'].default_value = coat; b.inputs['Coat Roughness'].default_value = 0.08
    return m

def mat_photo(name, path, strength=1.0):
    m = bpy.data.materials.new(name); m.use_nodes = True
    nt = m.node_tree; nt.nodes.clear()
    out = nt.nodes.new('ShaderNodeOutputMaterial'); em = nt.nodes.new('ShaderNodeEmission')
    tx = nt.nodes.new('ShaderNodeTexImage'); tx.image = bpy.data.images.load(path); tx.interpolation = 'Cubic'
    tx.extension = 'EXTEND'
    em.inputs['Strength'].default_value = strength
    nt.links.new(tx.outputs['Color'], em.inputs['Color']); nt.links.new(em.outputs['Emission'], out.inputs['Surface'])
    return m

def mat_wood(name):
    m = bpy.data.materials.new(name); m.use_nodes = True; nt = m.node_tree
    b = next(n for n in nt.nodes if n.type == 'BSDF_PRINCIPLED')
    tc = nt.nodes.new('ShaderNodeTexCoord'); mp = nt.nodes.new('ShaderNodeMapping'); mp.inputs['Scale'].default_value = (1.0, 14.0, 1.0)
    wv = nt.nodes.new('ShaderNodeTexWave'); wv.wave_type = 'BANDS'; wv.bands_direction = 'Y'
    wv.inputs['Scale'].default_value = 3.0; wv.inputs['Distortion'].default_value = 6.0; wv.inputs['Detail'].default_value = 4.0
    ramp = nt.nodes.new('ShaderNodeValToRGB')
    ramp.color_ramp.elements[0].color = srgb((92, 44, 20)); ramp.color_ramp.elements[1].color = srgb((150, 82, 38))
    nt.links.new(tc.outputs['Object'], mp.inputs['Vector']); nt.links.new(mp.outputs['Vector'], wv.inputs['Vector'])
    nt.links.new(wv.outputs['Fac'], ramp.inputs['Fac']); nt.links.new(ramp.outputs['Color'], b.inputs['Base Color'])
    b.inputs['Roughness'].default_value = 0.22; b.inputs['Coat Weight'].default_value = 0.6; b.inputs['Coat Roughness'].default_value = 0.05
    return m

def mat_terrazzo(name):
    m = bpy.data.materials.new(name); m.use_nodes = True; nt = m.node_tree
    b = next(n for n in nt.nodes if n.type == 'BSDF_PRINCIPLED')
    vo = nt.nodes.new('ShaderNodeTexVoronoi'); vo.inputs['Scale'].default_value = 420.0
    nz = nt.nodes.new('ShaderNodeTexNoise'); nz.inputs['Scale'].default_value = 4.0
    ramp = nt.nodes.new('ShaderNodeValToRGB')
    ramp.color_ramp.elements[0].color = srgb((84, 86, 86)); ramp.color_ramp.elements[1].color = srgb((176, 176, 170))
    ramp.color_ramp.elements.new(0.5).color = srgb((128, 129, 126))
    mix = nt.nodes.new('ShaderNodeMix'); mix.data_type = 'RGBA'; mix.blend_type = 'OVERLAY'; mix.inputs['Factor'].default_value = 0.25
    nt.links.new(vo.outputs['Color'], ramp.inputs['Fac'])
    nt.links.new(ramp.outputs['Color'], mix.inputs['A']); nt.links.new(nz.outputs['Color'], mix.inputs['B'])
    nt.links.new(mix.outputs['Result'], b.inputs['Base Color'])
    b.inputs['Roughness'].default_value = 0.35
    return m

def mat_tex(name, path, scale, rough=0.5, coat=0.0, sheen=0.0, val=1.0, sat=1.0):
    """a real surface from the photos, box-projected in world space; scale = metres per repeat (x, y, z)"""
    m = bpy.data.materials.new(name); m.use_nodes = True; nt = m.node_tree
    b = next(n for n in nt.nodes if n.type == 'BSDF_PRINCIPLED')
    tc = nt.nodes.new('ShaderNodeTexCoord'); mp = nt.nodes.new('ShaderNodeMapping')
    mp.inputs['Scale'].default_value = tuple(1 / s for s in scale)
    tx = nt.nodes.new('ShaderNodeTexImage'); tx.image = bpy.data.images.load(path); tx.projection = 'BOX'; tx.projection_blend = 0.1
    nt.links.new(tc.outputs['Object'], mp.inputs['Vector']); nt.links.new(mp.outputs['Vector'], tx.inputs['Vector'])
    hsv = nt.nodes.new('ShaderNodeHueSaturation'); hsv.inputs['Value'].default_value = val; hsv.inputs['Saturation'].default_value = sat
    nt.links.new(tx.outputs['Color'], hsv.inputs['Color']); nt.links.new(hsv.outputs['Color'], b.inputs['Base Color'])
    b.inputs['Roughness'].default_value = rough
    if coat: b.inputs['Coat Weight'].default_value = coat; b.inputs['Coat Roughness'].default_value = 0.06
    if sheen: b.inputs['Sheen Weight'].default_value = sheen
    return m

def mesh(name, verts, faces, mat, uvs=None):
    me = bpy.data.meshes.new(name); me.from_pydata(verts, [], faces); me.update()
    if uvs:
        uvl = me.uv_layers.new(); i = 0
        for poly in me.polygons:
            for li in poly.loop_indices: uvl.data[li].uv = uvs[i]; i += 1
    ob = bpy.data.objects.new(name, me); bpy.context.collection.objects.link(ob)
    me.materials.append(mat); return ob

def box(name, x0, x1, y0, y1, z0, z1, mat):
    v = [(x0, y0, z0), (x1, y0, z0), (x1, y1, z0), (x0, y1, z0), (x0, y0, z1), (x1, y0, z1), (x1, y1, z1), (x0, y1, z1)]
    f = [(0, 3, 2, 1), (4, 5, 6, 7), (0, 1, 5, 4), (1, 2, 6, 5), (2, 3, 7, 6), (3, 0, 4, 7)]
    return mesh(name, v, f, mat)

def wall(name, a, b, tex):
    """a vertical quad from floor point a to floor point b (as seen from inside, a on the left), floor to ceiling"""
    v = [(a[0], a[1], 0), (b[0], b[1], 0), (b[0], b[1], HC), (a[0], a[1], HC)]
    return mesh(name, v, [(0, 1, 2, 3)], mat_photo(name, os.path.join(DIR, tex)), [(0, 0), (1, 0), (1, 1), (0, 1)])

try:
    sc = bpy.context.scene
    for o in list(bpy.data.objects): bpy.data.objects.remove(o, do_unlink=True)

    # the walls (front at y = L, facing the camera; left wall at x = 0)
    wall('W-front', (0, L), (W, L), 'tex_front.jpg')
    wall('W-right', (W, L), (W, 0), 'tex_right.jpg')
    wall('W-back', (W, 0), (0, 0), 'tex_back.jpg')
    wall('W-left', (0, 0), (0, L), 'tex_left.jpg')

    RED = mat_pbr('red-paint', srgb((138, 34, 30)), 0.55)
    WHITE = mat_pbr('ceiling', srgb((236, 236, 230)), 0.8)
    cb = next(n for n in WHITE.node_tree.nodes if n.type == 'BSDF_PRINCIPLED')
    cb.inputs['Emission Color'].default_value = srgb((226, 226, 220)); cb.inputs['Emission Strength'].default_value = 0.75
    floor = box('floor', 0, W, 0, L, -0.02, 0, mat_terrazzo('terrazzo'))
    box('ceiling', 0, W, 0, L, HC, HC + 0.02, WHITE)
    # corner pillars and the beam across the middle
    P = 0.23
    for (x, y) in [(0, 0), (W - P, 0), (0, L - P), (W - P, L - P)]: box('pillar', x, x + P, y, y + P, 0, HC, RED)
    yb = L - 2.1   # the beam across the ceiling, 2.1 m from the front wall, as in the photos (no pillars under it)
    box('beam', 0, W, yb - 0.15, yb + 0.15, BEAM, HC, RED)
    # the dark runner down the aisle
    box('runner', 2.82, 3.38, 0.6, L - 1.2, 0, 0.004, mat_pbr('runner', srgb((38, 38, 40)), 0.95))

    # benches: the desk's front panel, red cloth, is the back of the seat in front of it
    WOOD = mat_tex('wood', os.path.join(DIR, 'tx_wood.jpg'), (1.7, 0.42, 0.42), 0.32, coat=0.25, val=0.72, sat=1.35); DARK = mat_pbr('dark-wood', srgb((45, 26, 18)), 0.45)
    CLOTH = mat_pbr('red-cloth', srgb((120, 22, 30)), 0.9, sheen=0.5)
    BOARD = mat_tex('board', os.path.join(DIR, 'tx_board.jpg'), (0.3, 0.3, 0.55), 0.6, val=1.3, sat=0.85)
    cols = [(0.22, 2.78), (3.42, 5.98)]
    yps = [L - 1.55 - 0.82 * i for i in range(6)]
    for (x0, x1) in cols:
        for i, yp in enumerate(yps):
            box('desk-top', x0, x1, yp - 0.44, yp + 0.02, 0.64, 0.675, WOOD)
            box('desk-edge', x0, x1, yp - 0.46, yp - 0.44, 0.60, 0.675, DARK)
            box('desk-shelf', x0 + 0.03, x1 - 0.03, yp - 0.40, yp - 0.05, 0.48, 0.50, DARK)
            box('panel-cloth', x0, x1, yp - 0.025, yp, 0.30 if i else 0.12, 0.64, CLOTH)
            box('panel-back', x0, x1, yp - 0.05, yp - 0.025, 0.30 if i else 0.12, 0.64, DARK)
            for x in (x0, x1 - 0.04): box('leg', x, x + 0.04, yp - 0.44, yp - 0.40, 0, 0.64, DARK)
            if i:   # the seat in front of this panel (for the desk ahead)
                box('seat-base', x0, x1, yp, yp + 0.34, 0, 0.30, BOARD)
                box('seat', x0 + 0.02, x1 - 0.02, yp, yp + 0.34, 0.30, 0.38, CLOTH)
                for x in (x0 - 0.02, x1): box('side', x, x + 0.02, yp - 0.05, yp + 0.34, 0, 0.66, BOARD)
        # the last row's own bench, against nothing
        yb6 = yps[-1] - 0.82
        box('seat-base', x0, x1, yb6, yb6 + 0.34, 0, 0.30, BOARD)
        box('seat', x0 + 0.02, x1 - 0.02, yb6, yb6 + 0.34, 0.30, 0.38, CLOTH)
        box('back-cloth', x0, x1, yb6 - 0.025, yb6, 0.30, 0.72, CLOTH)
        box('back-board', x0, x1, yb6 - 0.05, yb6 - 0.025, 0.0, 0.72, BOARD)
        for x in (x0 - 0.02, x1): box('side', x, x + 0.02, yb6 - 0.05, yb6 + 0.34, 0, 0.72, BOARD)

    # the cabinet, set across the front-left corner
    cab = box('cabinet', -0.475, 0.475, -0.175, 0.175, 0, 0.75, RED)
    face = mesh('cabinet-face', [(-0.475, -0.177, 0), (0.475, -0.177, 0), (0.475, -0.177, 0.75), (-0.475, -0.177, 0.75)],
                [(0, 1, 2, 3)], mat_photo('cab-face', os.path.join(DIR, 'cab_face.jpg')), [(0, 0), (1, 0), (1, 1), (0, 1)])
    for o in (cab, face):
        o.rotation_euler = (0, 0, math.radians(45)); o.location = (0.46, L - 0.46, 0.33)
    spk = box('speaker', -0.14, 0.14, -0.12, 0.12, 0, 0.3, mat_pbr('black', srgb((20, 20, 22)), 0.4))
    spk.rotation_euler = (0, 0, math.radians(45)); spk.location = (0.42, L - 0.42, 1.08)

    # fans and the projector
    FAN = mat_pbr('fan', srgb((168, 170, 140)), 0.45)
    for (fx, fy) in [(1.6, L - 1.15), (4.6, L - 1.15), (1.6, L - 4.6), (4.6, L - 4.6)]:
        box('fan-rod', fx - 0.015, fx + 0.015, fy - 0.015, fy + 0.015, 3.12, HC, FAN)
        box('fan-hub', fx - 0.11, fx + 0.11, fy - 0.11, fy + 0.11, 3.03, 3.13, FAN)
        for k in range(3):
            bl = box('fan-blade', 0.1, 0.72, -0.055, 0.055, -0.006, 0.006, FAN)
            bl.location = (fx, fy, 3.07); bl.rotation_euler = (math.radians(8), 0, math.radians(k * 120 + 20))
    BLACK = mat_pbr('projector', srgb((24, 24, 26)), 0.35)
    box('proj-rod', 3.09, 3.13, L - 2.42, L - 2.38, 2.98, BEAM, mat_pbr('rod', srgb((220, 220, 220)), 0.3))
    box('projector', 2.93, 3.29, L - 2.55, L - 2.25, 2.86, 2.98, BLACK)

    # light: the room's own daylight, from the back windows and the high side windows, and the white ceiling
    def area(name, loc, rot, size, energy, color=(1, 0.98, 0.95)):
        d = bpy.data.lights.new(name, 'AREA'); d.energy = energy; d.shape = 'RECTANGLE'
        d.size, d.size_y = size; d.color = color
        o = bpy.data.objects.new(name, d); bpy.context.collection.objects.link(o)
        o.location = loc; o.rotation_euler = rot; return o
    area('back-win-1', (1.4, 0.08, 1.4), (math.radians(-90), 0, 0), (1.6, 1.7), 260)
    area('back-win-2', (4.8, 0.08, 1.4), (math.radians(-90), 0, 0), (1.6, 1.7), 260)
    area('side-win', (0.08, L / 2, 2.8), (0, math.radians(90), 0), (0.7, 5.0), 260)
    area('ceiling-fill', (W / 2, L / 2, HC - 0.05), (0, 0, 0), (W - 0.6, L - 0.6), 420, (1, 1, 1))
    sc.world = bpy.data.worlds.new('w'); sc.world.use_nodes = True
    bg = next(n for n in sc.world.node_tree.nodes if n.type == 'BACKGROUND')
    bg.inputs['Color'].default_value = (1, 1, 1, 1); bg.inputs['Strength'].default_value = 0.35

    # the camera: in the aisle, in the middle of the room, a child's standing eye height, looking at the board
    cd = bpy.data.cameras.new('pano'); cd.type = 'PANO'
    try: cd.panorama_type = 'EQUIRECTANGULAR'
    except Exception: cd.cycles.panorama_type = 'EQUIRECTANGULAR'
    cam = bpy.data.objects.new('CAM-pano', cd); bpy.context.collection.objects.link(cam)
    cam.location = (3.15, 3.55, 1.3); cam.rotation_euler = (math.radians(90), 0, 0)
    sc.camera = cam

    sc.render.engine = 'CYCLES'
    try:
        prefs = bpy.context.preferences.addons['cycles'].preferences
        for t in ('OPTIX', 'CUDA', 'HIP', 'ONEAPI'):
            try:
                prefs.compute_device_type = t; prefs.get_devices()
                if any(d.type == t for d in prefs.devices):
                    for d in prefs.devices: d.use = True
                    sc.cycles.device = 'GPU'; break
            except Exception: pass
    except Exception: pass
    sc.cycles.samples = SAMPLES; sc.cycles.use_denoising = True
    sc.cycles.max_bounces = 4; sc.cycles.diffuse_bounces = 2
    sc.render.resolution_x = WIDTH; sc.render.resolution_y = WIDTH // 2; sc.render.resolution_percentage = 100
    sc.view_settings.view_transform = 'Standard'; sc.view_settings.look = 'None'
    sc.render.image_settings.file_format = 'PNG'
    sc.render.filepath = OUT
    bpy.ops.render.render(write_still=True)
    bpy.ops.wm.save_as_mainfile(filepath=os.path.join(DIR, 'classroom.blend'))
    open(LOG, 'w').write(f'device {sc.cycles.device}\nDONE\n')
except Exception:
    open(LOG, 'w').write(traceback.format_exc() + '\nDONE\n')
