# SXEBS street: the school's driveway on Bhairav Road, as the client's photos and Google Street View
# show it. Run by build_street.py after env_terrain / env_town / env_trees, in the same globals, so
# srgb, node, mix_col, math_node, finish, ground and offset are already defined.
#
# Frame: metres, X east, Y north. The origin is (27.41780, 85.03971), where the client stood on the
# road (photo GPS). The driveway leaves the road at M and runs on a bearing of 241 degrees
# (OpenStreetMap path 362517635; the photos' compass reads 225-238).
# Driveway coordinates: s = metres along the driveway from M, t = metres to its left (south side).
import bpy, bmesh, math, os
from mathutils import Vector, Matrix

DATA = globals()['SX_DATA']
TEX = r'C:/Users/legio/Workspace/Satyam_Xaviers_EBS_Frontend/website/model/env/data/polyhaven/tex'
M = Vector((4.0, 7.3))
BEARING = 241.0
U = Vector((math.sin(math.radians(BEARING)), math.cos(math.radians(BEARING))))
L = Vector((-U.y, U.x))

def W(s, t, z=None):
    p = M + U * s + L * t
    return Vector((p.x, p.y, ground(p.x, p.y) if z is None else z))

def gz(s, t):
    return W(s, t).z

C = bpy.data.collections.get('ENV-street') or bpy.data.collections.new('ENV-street')
if C.name not in bpy.context.scene.collection.children: bpy.context.scene.collection.children.link(C)
for o in list(C.objects): bpy.data.objects.remove(o, do_unlink=True)

def obj(name, me):
    o = bpy.data.objects.new(name, me); C.objects.link(o); return o

# --- materials -------------------------------------------------------------------------------------------
def pbr(name, folder, size_m, tint=None, bump=0.4):
    """A scanned Poly Haven material, mapped in metres through the 'UVMap' layer (u, v in metres)."""
    m, nt = new_mat(name)
    uv = nt.nodes.new('ShaderNodeUVMap'); uv.uv_map = 'UVMap'; uv.location = (-1100, 0)
    mp = nt.nodes.new('ShaderNodeMapping'); mp.location = (-900, 0)
    mp.inputs['Scale'].default_value = (1 / size_m, 1 / size_m, 1)
    nt.links.new(uv.outputs[0], mp.inputs[0])
    def tex(kind, non_color, loc):
        f = f'{TEX}/{folder}/{folder}_{kind}_2k.jpg'
        if not os.path.exists(f): f = f[:-3] + 'png'
        t = nt.nodes.new('ShaderNodeTexImage'); t.location = loc
        t.image = bpy.data.images.load(f, check_existing=True)
        if non_color: t.image.colorspace_settings.name = 'Non-Color'
        nt.links.new(mp.outputs[0], t.inputs[0])
        return t
    bsdf = node(nt, 'ShaderNodeBsdfPrincipled', (300, 0))
    d = tex('diff', False, (-600, 300)).outputs[0]
    if tint: d = mix_col(nt, 1.0, d, srgb(tint), (-300, 300), blend='MULTIPLY')
    nt.links.new(d, bsdf.inputs['Base Color'])
    nt.links.new(tex('rough', True, (-600, 0)).outputs[0], bsdf.inputs['Roughness'])
    nm = nt.nodes.new('ShaderNodeNormalMap'); nm.location = (0, -300); nm.inputs['Strength'].default_value = bump
    nt.links.new(tex('nor', True, (-600, -300)).outputs[0], nm.inputs['Color'])
    nt.links.new(nm.outputs[0], bsdf.inputs['Normal'])
    finish(nt, bsdf.outputs[0])
    return m

def flat(name, hexcol, rough=0.7, metal=0.0):
    m, nt = new_mat(name)
    b = node(nt, 'ShaderNodeBsdfPrincipled', (0, 0), Roughness=rough, Metallic=metal)
    b.inputs['Base Color'].default_value = srgb(hexcol)
    finish(nt, b.outputs[0]); return m

def image_mat(name, path):
    m, nt = new_mat(name)
    t = nt.nodes.new('ShaderNodeTexImage'); t.image = bpy.data.images.load(path, check_existing=True)
    uv = nt.nodes.new('ShaderNodeUVMap'); uv.uv_map = 'UVMap'; nt.links.new(uv.outputs[0], t.inputs[0])
    b = node(nt, 'ShaderNodeBsdfPrincipled', (300, 0), Roughness=0.55)
    nt.links.new(t.outputs[0], b.inputs['Base Color'])
    finish(nt, b.outputs[0]); return m

MAT = {
    'drive': pbr('MAT-drive_dirt', 'rocky_trail', 3.0, tint='#f3e6cf', bump=0.7),
    'brick': pbr('MAT-brick_exposed', 'red_brick_03', 1.6, bump=0.8),
    'yellow': pbr('MAT-plaster_yellow', 'painted_plaster_wall', 2.0, tint='#e8c35a', bump=0.3),
    'block': pbr('MAT-plastered_wall_grey', 'white_plaster_02', 2.0, tint='#bdbab2', bump=0.4),
    'pillar': pbr('MAT-plaster_white', 'white_plaster_02', 1.5, bump=0.3),
    'steel': flat('MAT-pole_steel_black', '#1d1f22', 0.45, 1.0),
    'pole': pbr('MAT-electric_pole', 'concrete_wall_003', 1.0, tint='#9a958c', bump=0.3),
    'wire': flat('MAT-wire', '#0c0c0c', 0.5),
    'school': flat('MAT-school_standin', '#c9c4b8', 0.9),
    'sign': image_mat('MAT-signboard', f'{DATA}/sign_board.jpg'),
    'sign_back': flat('MAT-sign_back', '#3e4a5a', 0.6, 1.0),
}

# --- geometry helpers --------------------------------------------------------------------------------------
def box(name, s0, s1, t0, t1, z0, z1, mat, uv_m=True):
    """A box in driveway coordinates (s along, t left), z relative to the ground at its centre."""
    g = gz((s0 + s1) / 2, (t0 + t1) / 2)
    bm = bmesh.new()
    cs = [W(s, t, g + z) for z in (z0, z1) for s, t in ((s0, t0), (s1, t0), (s1, t1), (s0, t1))]
    v = [bm.verts.new(c) for c in cs]
    for f in ((0, 3, 2, 1), (4, 5, 6, 7), (0, 1, 5, 4), (1, 2, 6, 5), (2, 3, 7, 6), (3, 0, 4, 7)):
        bm.faces.new([v[i] for i in f])
    uvl = bm.loops.layers.uv.new('UVMap')
    bm.normal_update()
    for f in bm.faces:   # metres: horizontal faces by world xy, vertical faces by (along, height)
        n = f.normal
        for lp in f.loops:
            p = lp.vert.co
            if abs(n.z) > 0.5: lp[uvl].uv = (p.x, p.y)
            else:
                h = Vector((-n.y, n.x)).normalized()
                lp[uvl].uv = (p.x * h.x + p.y * h.y, p.z)
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
    me.materials.append(mat)
    return obj(name, me)

def cylinder(name, base, height, r, mat, seg=12):
    bm = bmesh.new()
    bmesh.ops.create_cone(bm, cap_ends=True, segments=seg, radius1=r, radius2=r * 0.85, depth=height,
                          matrix=Matrix.Translation(base + Vector((0, 0, height / 2))))
    uvl = bm.loops.layers.uv.new('UVMap')
    for f in bm.faces:
        for lp in f.loops: lp[uvl].uv = (math.atan2(lp.vert.co.y - base.y, lp.vert.co.x - base.x) * r, lp.vert.co.z)
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free(); me.materials.append(mat)
    return obj(name, me)

def plane(name, corners, mat, uvs):
    bm = bmesh.new(); v = [bm.verts.new(c) for c in corners]; f = bm.faces.new(v)
    uvl = bm.loops.layers.uv.new('UVMap')
    for lp, uv in zip(f.loops, uvs): lp[uvl].uv = uv
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free(); me.materials.append(mat)
    return obj(name, me)

def strip(name, s0, s1, t0, t1, mat, lift=0.06, step=1.0):
    """A ground-hugging surface over the driveway area."""
    bm = bmesh.new(); uvl = bm.loops.layers.uv.new('UVMap')
    ns, nt_ = max(int((s1 - s0) / step), 1), max(int((t1 - t0) / step), 1)
    grid = [[bm.verts.new(W(s0 + (s1 - s0) * i / ns, t0 + (t1 - t0) * j / nt_) + Vector((0, 0, lift)))
             for j in range(nt_ + 1)] for i in range(ns + 1)]
    for i in range(ns):
        for j in range(nt_):
            f = bm.faces.new((grid[i][j], grid[i + 1][j], grid[i + 1][j + 1], grid[i][j + 1]))
            for lp in f.loops: lp[uvl].uv = (lp.vert.co.x, lp.vert.co.y)
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free(); me.materials.append(mat)
    return obj(name, me)

# --- the driveway and the yard in front of the school -------------------------------------------------------
strip('GEO-driveway', -0.2, 35.0, -3.1, 5.8, MAT['drive'])
strip('GEO-school_forecourt', 22.0, 35.0, -8.0, 10.0, MAT['drive'], lift=0.05)

# --- right side: brick wall along the driveway, the signboard at its start, the gate on the road ------------------
box('GEO-brick_wall', 2.6, 26.0, -3.35, -3.12, 0, 1.75, MAT['brick'])
box('GEO-brick_wall_cap', 2.6, 26.0, -3.4, -3.07, 1.75, 1.82, MAT['pillar'])
box('GEO-yellow_low_wall', 2.2, 3.4, -4.9, -2.2, 0, 1.05, MAT['yellow'])
# the signboard on two black posts, facing the road (its face looks along -U); the admission board below it
SS = 2.0
sg = gz(SS, -3.6)
for t in (-2.55, -4.65):
    cylinder(f'GEO-sign_post_{t}', W(SS + 0.05, t, sg), 3.7, 0.045, MAT['steel'])
b0, b1 = sg + 2.35, sg + 3.6          # 2.3 m x 1.25 m board
plane('GEO-signboard', [W(SS, -2.4, b0), W(SS, -4.8, b0), W(SS, -4.8, b1), W(SS, -2.4, b1)],
      MAT['sign'], [(0, 0), (1, 0), (1, 1), (0, 1)])
box('GEO-signboard_back', SS + 0.02, SS + 0.07, -4.82, -2.38, 2.33, 3.62, MAT['sign_back'])

def admission_material():
    m, nt = new_mat('MAT-admission_board')
    uv = nt.nodes.new('ShaderNodeUVMap'); uv.uv_map = 'UVMap'
    sp = nt.nodes.new('ShaderNodeSeparateXYZ'); nt.links.new(uv.outputs[0], sp.inputs[0])
    y = sp.outputs['Y']
    band = math_node(nt, 'LESS_THAN', y, 0.16)
    head = math_node(nt, 'GREATER_THAN', y, 0.82)
    # lines of lettering, suggested: not readable at this distance
    rows = math_node(nt, 'LESS_THAN', math_node(nt, 'FRACT', math_node(nt, 'MULTIPLY', y, 9.0)), 0.45)
    body = math_node(nt, 'MULTIPLY', math_node(nt, 'GREATER_THAN', y, 0.22), math_node(nt, 'LESS_THAN', y, 0.78))
    nz = node(nt, 'ShaderNodeTexNoise', (0, 0), Scale=60.0, Detail=2.0); nt.links.new(uv.outputs[0], nz.inputs['Vector'])
    ln = math_node(nt, 'MULTIPLY', math_node(nt, 'MULTIPLY', rows, body), math_node(nt, 'GREATER_THAN', nz.outputs['Fac'], 0.5))
    c = mix_col(nt, ln, srgb('#f4f1ea'), srgb('#1f3c8a'))
    c = mix_col(nt, band, c, srgb('#d0262d')); c = mix_col(nt, head, c, srgb('#1f3c8a'))
    bb = node(nt, 'ShaderNodeBsdfPrincipled', (300, 0), Roughness=0.5)
    nt.links.new(c, bb.inputs['Base Color']); finish(nt, bb.outputs[0]); return m
MAT['admission'] = admission_material()
plane('GEO-admission_board', [W(SS, -2.6, sg + 0.95), W(SS, -4.6, sg + 0.95), W(SS, -4.6, sg + 2.25), W(SS, -2.6, sg + 2.25)],
      MAT['admission'], [(0, 0), (1, 0), (1, 1), (0, 1)])

# the blue gate with yellow circles, between two white pillars, in a block wall along the road
def gate_material():
    m, nt = new_mat('MAT-gate_blue_circles')
    uv = nt.nodes.new('ShaderNodeUVMap'); uv.uv_map = 'UVMap'
    sp = nt.nodes.new('ShaderNodeSeparateXYZ'); nt.links.new(uv.outputs[0], sp.inputs[0])
    cu = math_node(nt, 'SUBTRACT', math_node(nt, 'FRACT', math_node(nt, 'DIVIDE', sp.outputs['X'], 0.75)), 0.5)
    cv = math_node(nt, 'SUBTRACT', math_node(nt, 'FRACT', math_node(nt, 'DIVIDE', sp.outputs['Y'], 0.75)), 0.5)
    r = math_node(nt, 'SQRT', math_node(nt, 'ADD', math_node(nt, 'MULTIPLY', cu, cu), math_node(nt, 'MULTIPLY', cv, cv)))
    disc = math_node(nt, 'LESS_THAN', r, 0.28)
    ring = math_node(nt, 'MULTIPLY', math_node(nt, 'GREATER_THAN', r, 0.33), math_node(nt, 'LESS_THAN', r, 0.36))
    c = mix_col(nt, disc, srgb('#7d93b8'), srgb('#e9c22e'))
    c = mix_col(nt, ring, c, srgb('#2c4f8c'))
    b = node(nt, 'ShaderNodeBsdfPrincipled', (300, 0), Roughness=0.45)
    nt.links.new(c, b.inputs['Base Color']); finish(nt, b.outputs[0]); return m
MAT['gate'] = gate_material()
box('GEO-gate_pillar_a', 0.6, 1.0, -7.4, -7.0, 0, 2.4, MAT['pillar'])
box('GEO-gate_pillar_b', 0.6, 1.0, -10.9, -10.5, 0, 2.4, MAT['pillar'])
box('GEO-gate', 0.76, 0.82, -10.5, -7.4, 0.05, 2.15, MAT['gate'])
box('GEO-road_wall_right_a', 0.65, 0.9, -7.0, -4.9, 0, 1.7, MAT['block'])
box('GEO-road_wall_right_b', 0.65, 0.9, -17.0, -10.9, 0, 1.7, MAT['block'])

# --- left side: the shop house's road wall line is OpenStreetMap's; add its yard wall ------------------------

# --- electric poles along Bhairav Road, and the wires between them -------------------------------------------
road_dir = Vector((11.06 - -0.97, -4.23 - 29.31)).normalized()     # the road's own line here (OSM)
def road_pt(k, side):   # k metres along the road from M's foot, side metres to its east
    east = Vector((road_dir.y, -road_dir.x))
    p = M + road_dir * k - east * 1.0 + east * side
    return Vector((p.x, p.y, ground(p.x, p.y)))
poles = []
for k, side in ((-36, -0.6), (-5.5, -0.6), (26, -0.6), (58, -0.6), (-20, 9.2), (12, 9.2), (44, 9.2)):
    base = road_pt(k, side)
    cylinder(f'GEO-pole_{k}_{side}', base, 9.0, 0.13, MAT['pole'], seg=10)
    poles.append((k, side, base))
def wire(name, a, b, sag, r=0.007):
    cu = bpy.data.curves.new(name, 'CURVE'); cu.dimensions = '3D'; cu.bevel_depth = r; cu.bevel_resolution = 1
    sp = cu.splines.new('POLY'); n = 16; sp.points.add(n)
    for i in range(n + 1):
        f = i / n; p = a.lerp(b, f); p.z -= sag * 4 * f * (1 - f)
        sp.points[i].co = (p.x, p.y, p.z, 1)
    cu.materials.append(MAT['wire']); return obj(name, cu)
for side in (-0.6, 9.2):
    row = sorted([p for p in poles if p[1] == side], key=lambda p: p[0])
    for (k0, _, a), (k1, _, b) in zip(row, row[1:]):
        for j, (dz, sag, r) in enumerate(((8.6, 0.5, 0.007), (8.2, 0.7, 0.007), (7.6, 0.9, 0.012), (7.0, 1.2, 0.02))):
            wire(f'GEO-wire_{side}_{k0}_{j}', a + Vector((0.18 * (j % 2), 0, dz)), b + Vector((0.18 * (j % 2), 0, dz)), sag, r)
# service drops: from the pole by the driveway into the houses either side
pa = [p for p in poles if p[0] == -5.5][0][2]
for j, tgt in enumerate((W(6.0, 6.0, None) + Vector((0, 0, 6.5)), W(4.0, -5.0, None) + Vector((0, 0, 6.0)), W(10.0, -6.0, None) + Vector((0, 0, 5.5)))):
    wire(f'GEO-drop_{j}', pa + Vector((0, 0, 7.4 - 0.2 * j)), tgt, 0.4, 0.006)

# --- the school, as a plain stand-in: not modelled yet ---------------------------------------------------------

# --- balconies: slabs with railings, the line every Hetauda house has -----------------------------------------
def railing_material():
    m, nt = new_mat('MAT-railing_steel_bars')
    uv = nt.nodes.new('ShaderNodeUVMap'); uv.uv_map = 'UVMap'
    sp = nt.nodes.new('ShaderNodeSeparateXYZ'); nt.links.new(uv.outputs[0], sp.inputs[0])
    bar = math_node(nt, 'LESS_THAN', math_node(nt, 'FRACT', math_node(nt, 'DIVIDE', sp.outputs['X'], 0.12)), 0.18)
    rail = math_node(nt, 'MAXIMUM', math_node(nt, 'GREATER_THAN', sp.outputs['Y'], 0.93), math_node(nt, 'LESS_THAN', sp.outputs['Y'], 0.05))
    a = math_node(nt, 'MAXIMUM', bar, rail)
    b = node(nt, 'ShaderNodeBsdfPrincipled', (300, 0), Roughness=0.25, Metallic=1.0)
    b.inputs['Base Color'].default_value = srgb('#c9ccd0')
    nt.links.new(a, b.inputs['Alpha'])
    finish(nt, b.outputs[0]); return m
def panel_material():
    # the blue-and-white wave panels on the shop house's balconies (Street View)
    m, nt = new_mat('MAT-balcony_panel_waves')
    uv = nt.nodes.new('ShaderNodeUVMap'); uv.uv_map = 'UVMap'
    sp = nt.nodes.new('ShaderNodeSeparateXYZ'); nt.links.new(uv.outputs[0], sp.inputs[0])
    w = math_node(nt, 'SINE', math_node(nt, 'ADD', math_node(nt, 'MULTIPLY', sp.outputs['X'], 22.0),
                                         math_node(nt, 'MULTIPLY', math_node(nt, 'SINE', math_node(nt, 'MULTIPLY', sp.outputs['Y'], 14.0)), 1.2)))
    c = mix_col(nt, math_node(nt, 'GREATER_THAN', w, 0.55), srgb('#e9edf1'), srgb('#4a7fbd'))
    b = node(nt, 'ShaderNodeBsdfPrincipled', (300, 0), Roughness=0.35)
    nt.links.new(c, b.inputs['Base Color']); finish(nt, b.outputs[0]); return m
MAT['rail'] = railing_material(); MAT['panel'] = panel_material()
MAT['slab'] = pbr('MAT-slab_edge', 'white_plaster_02', 1.5, tint='#b9bcc0', bump=0.3)

def balcony_driveway(s0, s1, t_face, out, z, kind='rail'):
    """A balcony on a wall that runs along the driveway (constant t); out = +1 or -1 towards the driveway."""
    t1 = t_face + out * 1.1
    box(f'GEO-balc_slab_{s0}_{z}', s0, s1, min(t_face, t1), max(t_face, t1), z - 0.15, z, MAT['slab'])
    g = gz((s0 + s1) / 2, (t_face + t1) / 2)
    plane(f'GEO-balc_{kind}_{s0}_{z}', [W(s0, t1, g + z), W(s1, t1, g + z), W(s1, t1, g + z + 1.0), W(s0, t1, g + z + 1.0)],
          MAT[kind], [(0, 0), (s1 - s0, 0), (s1 - s0, 1), (0, 1)])

def balcony_road(s_face, t0, t1, z, kind='panel'):
    """A balcony on a wall that faces the road (constant s), standing out towards the road."""
    s1 = s_face - 1.1
    box(f'GEO-balc_slab_r_{t0}_{z}', s1, s_face, t0, t1, z - 0.15, z, MAT['slab'])
    g = gz((s_face + s1) / 2, (t0 + t1) / 2)
    plane(f'GEO-balc_{kind}_r_{t0}_{z}', [W(s1, t1, g + z), W(s1, t0, g + z), W(s1, t0, g + z + 1.0), W(s1, t1, g + z + 1.0)],
          MAT[kind], [(0, 0), (t1 - t0, 0), (t1 - t0, 1), (0, 1)])

# the shop house: wave-panel balconies on its road front, railings along the driveway
for z in (3.0, 6.0):
    balcony_road(0.6, 6.2, 15.2, z, 'panel')
    balcony_driveway(2.0, 10.5, 5.8, -1, z, 'rail')
# the house beyond it: stacked balconies with steel railings, facing the driveway
for z in (3.0, 6.0, 9.0):
    balcony_driveway(13.2, 25.4, 6.4, -1, z, 'rail')

# --- weeds and shrubs along the foot of the right-hand wall (IMG_3017) ----------------------------------------
import random as _r
_rnd = _r.Random(7)
s = 4.0
while s < 25.5:
    src = _rnd.choice(['shrub_02_a_LOD1', 'shrub_02_c_LOD1'])
    o = bpy.data.objects.new(f'GEO-wall_shrub_{s:.1f}', bpy.data.objects[src].data)
    o.location = W(s, -2.75 + _rnd.uniform(-0.2, 0.2)) + Vector((0, 0, -0.05))
    sc_ = _rnd.uniform(0.9, 1.7); o.scale = (sc_, sc_, sc_ * _rnd.uniform(0.9, 1.4)); o.rotation_euler = (0, 0, _rnd.uniform(0, 6.28))
    C.objects.link(o)
    s += _rnd.uniform(1.0, 2.2)

# --- the mango trees at the driveway's mouth -------------------------------------------------------------------
def tree(name, src, s, t, scale, rot):
    o = bpy.data.objects.new(name, bpy.data.objects[src].data)
    o.location = W(s, t) + Vector((0, 0, -0.1)); o.scale = (scale,) * 3; o.rotation_euler = (0, 0, rot)
    C.objects.link(o); return o
# three slim young trees at the mouth, their crowns run together (Street View)
tree('GEO-mouth_tree_a', 'tree_small_02_LOD1', 4.6, 0.2, 1.45, 0.4)
tree('GEO-mouth_tree_b', 'tree_small_02_LOD1', 5.4, -0.9, 1.6, 2.3)
tree('GEO-mouth_tree_c', 'tree_small_02_LOD1', 6.6, -2.2, 1.4, 4.1)
tree('GEO-tree_right', 'island_tree_02_LOD1', 3.5, -18.5, 2.6, 1.3)

# --- the buses: block-outs at true size (Eicher Skyline: 7.6 x 2.3 x 2.9 m) --------------------------------------
def bus_paint():
    m, nt = new_mat('MAT-bus_paint')
    b = node(nt, 'ShaderNodeBsdfPrincipled', (300, 0), Roughness=0.3)
    b.inputs['Base Color'].default_value = srgb('#f0b400')
    for sck in b.inputs:
        if sck.name == 'Coat Weight': sck.default_value = 0.4
    finish(nt, b.outputs[0]); return m
MAT['bus'] = bus_paint()
MAT['glass'] = flat('MAT-bus_glass', '#141a1f', 0.08)
MAT['tyre'] = flat('MAT-tyre', '#151515', 0.85)
MAT['red'] = flat('MAT-bus_stripe_red', '#c3262c', 0.4)
MAT['bumper'] = flat('MAT-bus_bumper', '#2a2a2a', 0.5)
MAT['plate'] = flat('MAT-plate', '#c4232b', 0.5)
MAT['tail'] = flat('MAT-tail_light', '#8a1414', 0.2)

def bus(name, s, t, length=7.6, width=2.3, facing_road=True):
    # A school bus at true size; local +Y is its front.
    parts = []
    def part(nm, cx, cy, cz, sx, sy, sz, mat, bevel=0.0):
        bm = bmesh.new(); bmesh.ops.create_cube(bm, size=1.0)
        for v in bm.verts: v.co = Vector((cx + v.co.x * sx, cy + v.co.y * sy, cz + v.co.z * sz))
        me = bpy.data.meshes.new(nm); bm.to_mesh(me); bm.free(); me.materials.append(mat)
        o = obj(nm, me)
        if bevel:
            md = o.modifiers.new('bevel', 'BEVEL'); md.width = bevel; md.segments = 3
        parts.append(o); return o
    h0, h1 = 0.55, 3.0
    part(name + '_body', 0, 0, (h0 + h1) / 2, width, length, h1 - h0, MAT['bus'], bevel=0.14)
    part(name + '_windshield', 0, length / 2 + 0.005, 2.15, width * 0.86, 0.02, 1.15, MAT['glass'])
    for side in (-1, 1):
        part(name + f'_windows_{side}', side * (width / 2 + 0.005), -0.3, 2.2, 0.02, length * 0.78, 0.85, MAT['glass'])
        part(name + f'_stripe_{side}', side * (width / 2 + 0.006), 0, 1.45, 0.02, length * 0.96, 0.09, MAT['red'])
    part(name + '_stripe_front', 0, length / 2 + 0.006, 1.35, width * 0.9, 0.02, 0.08, MAT['red'])
    part(name + '_bumper', 0, length / 2 + 0.05, 0.62, width * 0.98, 0.14, 0.26, MAT['bumper'])
    part(name + '_rear_window', 0, -length / 2 - 0.005, 2.2, width * 0.8, 0.02, 0.85, MAT['glass'])
    part(name + '_rear_bumper', 0, -length / 2 - 0.05, 0.62, width * 0.98, 0.14, 0.26, MAT['bumper'])
    part(name + '_stripe_rear', 0, -length / 2 - 0.006, 1.35, width * 0.9, 0.02, 0.08, MAT['red'])
    part(name + '_plate', 0, -length / 2 - 0.01, 0.98, 0.42, 0.02, 0.2, MAT['plate'])
    for side in (-1, 1):
        part(name + f'_tail_{side}', side * (width / 2 - 0.25), -length / 2 - 0.01, 1.05, 0.22, 0.02, 0.3, MAT['tail'])
    for wy in (length / 2 - 1.5, -length / 2 + 1.9):
        for side in (-1, 1):
            bm = bmesh.new()
            bmesh.ops.create_cone(bm, cap_ends=True, segments=20, radius1=0.47, radius2=0.47, depth=0.28,
                                  matrix=Matrix.Translation((side * (width / 2 - 0.12), wy, 0.47)) @ Matrix.Rotation(math.pi / 2, 4, 'Y'))
            me = bpy.data.meshes.new(name + '_wheel'); bm.to_mesh(me); bm.free(); me.materials.append(MAT['tyre'])
            parts.append(obj(name + '_wheel', me))
    root = bpy.data.objects.new(name, None); C.objects.link(root)
    for p in parts: p.parent = root
    root.location = W(s, t)
    ang = math.atan2(U.x, U.y)
    root.rotation_euler = (0, 0, -ang + (math.pi if facing_road else 0))
    return root
# 11 October 2026 (the client's photos): all three at the far end, facing the school; two together on the
# left, a wide gap, one on the right. (Older Street View has one parked at the mouth.)
bus('GEO-bus_end_a', 28.0, 4.6, facing_road=False)
bus('GEO-bus_end_b', 29.0, 2.1, facing_road=False)
bus('GEO-bus_end_c', 28.5, -2.0, facing_road=False)

# --- cameras ------------------------------------------------------------------------------------------------------
def camera(name, s, t, h, lens, pitch=0.0, yaw=0.0):
    cam = bpy.data.objects.get(name) or bpy.data.objects.new(name, bpy.data.cameras.new(name))
    if cam.name not in bpy.context.scene.collection.objects: bpy.context.scene.collection.objects.link(cam)
    cam.data.lens = lens; cam.data.sensor_width = 36; cam.data.clip_start = 0.1; cam.data.clip_end = 60000
    p = W(s, t); cam.location = p + Vector((0, 0, h))
    d = U.copy(); d.rotate(Matrix.Rotation(math.radians(-yaw), 2))
    look = Vector((d.x, d.y, math.tan(math.radians(pitch))))
    cam.rotation_euler = look.to_track_quat('-Z', 'Y').to_euler()
    return cam
# Google's car camera, across the road, about 2.5 m up; the screenshot's view is about 75 degrees wide
camera('CAM-streetview', -7.5, 0.9, 2.5, 15.5, pitch=3.0)
# where IMG_3017 was taken: a few metres in, at eye height, a little upward (iPhone main lens = 26 mm)
camera('CAM-img3017', 9.0, 2.6, 1.5, 24.0, pitch=9.0)
print('street built')
