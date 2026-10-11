# SXEBS environment, part 2: materials (haze, terrain), the town from OpenStreetMap, the roads.
# Run after env_terrain.py. Same frame: metres, X east, Y north, origin at the DEM height H0.
import bpy, bmesh, json, math, os, random
import numpy as np
from mathutils import Vector

# The caller may set SX_DATA (a data folder) and the radii below before exec'ing this file.
ENV = globals().get('SX_DATA', r'C:/Users/legio/Workspace/Satyam_Xaviers_EBS_Frontend/website/model/env/data')

def coll(name):
    c = bpy.data.collections.get(name) or bpy.data.collections.new(name)
    if c.name not in bpy.context.scene.collection.children:
        bpy.context.scene.collection.children.link(c)
    return c

def clear(c):
    for o in list(c.objects):
        me = o.data if o.type == 'MESH' else None
        bpy.data.objects.remove(o, do_unlink=True)
        if me and me.users == 0: bpy.data.meshes.remove(me)

def srgb(h):
    h = h.lstrip('#'); c = [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    return tuple(x / 12.92 if x <= 0.04045 else ((x + 0.055) / 1.055) ** 2.4 for x in c) + (1.0,)

# --- ground height from the fine DEM ---------------------------------------------------------------
m14 = json.load(open(f'{ENV}/dem_z14.json'))
h14 = np.fromfile(f'{ENV}/dem_z14.f32', dtype=np.float32).reshape(m14['size'], m14['size'])
H0 = float(h14[int(round(m14['schoolPy'])), int(round(m14['schoolPx']))])
def ground(x, y):
    fx = m14['schoolPx'] + x / m14['mpp']; fy = m14['schoolPy'] - y / m14['mpp']
    x0, y0 = int(fx), int(fy); tx, ty = fx - x0, fy - y0
    a = h14[y0, x0] * (1 - tx) + h14[y0, x0 + 1] * tx
    b = h14[y0 + 1, x0] * (1 - tx) + h14[y0 + 1, x0 + 1] * tx
    return float(a * (1 - ty) + b * ty) - H0 - (x * x + y * y) / (2 * 6371000.0)

# --- node helpers --------------------------------------------------------------------------------
def new_mat(name):
    m = bpy.data.materials.get(name)
    if m: bpy.data.materials.remove(m)
    m = bpy.data.materials.new(name); m.use_nodes = True
    nt = m.node_tree; nt.nodes.clear()
    return m, nt

def node(nt, kind, loc=(0, 0), **inputs):
    n = nt.nodes.new(kind); n.location = loc
    for k, v in inputs.items():
        for s in n.inputs:
            if s.name == k: s.default_value = v; break
    return n

def math_node(nt, op, a=None, b=None, loc=(0, 0), clamp=False):
    n = nt.nodes.new('ShaderNodeMath'); n.operation = op; n.location = loc; n.use_clamp = clamp
    for i, v in enumerate((a, b)):
        if v is None: continue
        if isinstance(v, (int, float)): n.inputs[i].default_value = v
        else: nt.links.new(v, n.inputs[i])
    return n.outputs[0]

def mix_col(nt, fac, a, b, loc=(0, 0), blend='MIX'):
    n = nt.nodes.new('ShaderNodeMix'); n.data_type = 'RGBA'; n.blend_type = blend; n.location = loc
    for sock, v in ((n.inputs[0], fac), (n.inputs[6], a), (n.inputs[7], b)):
        if isinstance(v, (int, float)): sock.default_value = v
        elif isinstance(v, tuple): sock.default_value = v
        else: nt.links.new(v, sock)
    return n.outputs[2]

# --- the haze: the distance tint every material ends with ----------------------------------------
HAZE_COLOR = srgb('#b4c4d8'); HAZE_STRENGTH = 1.35; HAZE_KM = 10.0; HAZE_MAX = 0.88
def haze_group():
    g = bpy.data.node_groups.get('SX_haze')
    if g: bpy.data.node_groups.remove(g)
    g = bpy.data.node_groups.new('SX_haze', 'ShaderNodeTree')
    g.interface.new_socket('Shader', in_out='INPUT', socket_type='NodeSocketShader')
    g.interface.new_socket('Shader', in_out='OUTPUT', socket_type='NodeSocketShader')
    gi = g.nodes.new('NodeGroupInput'); go = g.nodes.new('NodeGroupOutput')
    cam = g.nodes.new('ShaderNodeCameraData')
    # fac = HAZE_MAX * (1 - exp(-d / k))
    e = math_node(g, 'DIVIDE', cam.outputs['View Distance'], -HAZE_KM * 1000)
    e = math_node(g, 'EXPONENT', e)
    e = math_node(g, 'SUBTRACT', 1.0, e)
    fac = math_node(g, 'MULTIPLY', e, HAZE_MAX)
    em = g.nodes.new('ShaderNodeEmission'); em.inputs[0].default_value = HAZE_COLOR; em.inputs[1].default_value = HAZE_STRENGTH
    mx = g.nodes.new('ShaderNodeMixShader')
    g.links.new(fac, mx.inputs[0]); g.links.new(gi.outputs[0], mx.inputs[1]); g.links.new(em.outputs[0], mx.inputs[2])
    g.links.new(mx.outputs[0], go.inputs[0])
    return g
HAZE = haze_group()

def finish(nt, shader_out, loc=(900, 0)):
    h = nt.nodes.new('ShaderNodeGroup'); h.node_tree = HAZE; h.location = loc
    o = nt.nodes.new('ShaderNodeOutputMaterial'); o.location = (loc[0] + 200, loc[1])
    nt.links.new(shader_out, h.inputs[0]); nt.links.new(h.outputs[0], o.inputs['Surface'])

# --- terrain: sal forest on the hills, the dusty valley floor, bare earth on steep cuts ------------
def terrain_material():
    m, nt = new_mat('MAT-terrain_real')
    geo = node(nt, 'ShaderNodeNewGeometry', (-1400, 0))
    sep = nt.nodes.new('ShaderNodeSeparateXYZ'); sep.location = (-1200, 200)
    nt.links.new(geo.outputs['Normal'], sep.inputs[0])
    pos = nt.nodes.new('ShaderNodeSeparateXYZ'); pos.location = (-1200, -100)
    nt.links.new(geo.outputs['Position'], pos.inputs[0])
    slope = math_node(nt, 'SUBTRACT', 1.0, sep.outputs['Z'])                       # 0 flat .. 1 vertical
    # big patches (km) and canopy-scale noise (tens of m)
    n_big = node(nt, 'ShaderNodeTexNoise', (-1000, -300), Scale=0.0012, Detail=6.0, Roughness=0.6)
    n_mid = node(nt, 'ShaderNodeTexNoise', (-1000, -500), Scale=0.03, Detail=8.0, Roughness=0.65)
    vor = nt.nodes.new('ShaderNodeTexVoronoi'); vor.location = (-1000, -700); vor.inputs['Scale'].default_value = 0.16
    for n in (n_big, n_mid, vor): nt.links.new(geo.outputs['Position'], n.inputs['Vector'])
    # forest colour: dark sal green, patches of lighter / yellower canopy, shadowed gaps between crowns
    f1 = mix_col(nt, n_big.outputs['Fac'], srgb('#2a4a1c'), srgb('#4d6a26'), (-700, -300))
    f2 = mix_col(nt, n_mid.outputs['Fac'], f1, srgb('#22351a'), (-500, -300))
    gaps = math_node(nt, 'POWER', vor.outputs['Distance'], 0.6)
    forest = mix_col(nt, math_node(nt, 'MULTIPLY', gaps, 0.55), f2, srgb('#121c0e'), (-300, -300))
    # valley floor (under the town and the fields): dusty brown-green
    n_yard = node(nt, 'ShaderNodeTexNoise', (-1000, 300), Scale=0.08, Detail=10.0, Roughness=0.7)
    nt.links.new(geo.outputs['Position'], n_yard.inputs['Vector'])
    grass = math_node(nt, 'MULTIPLY', math_node(nt, 'SUBTRACT', n_yard.outputs['Fac'], 0.5), 6.0, clamp=True)
    dirt = mix_col(nt, n_mid.outputs['Fac'], srgb('#9a8466'), srgb('#7d6b52'), (-700, 100))
    v1 = mix_col(nt, grass, dirt, srgb('#5f7038'), (-500, 100))
    # where the land is high above the valley or steep, it is forest
    hi = math_node(nt, 'SUBTRACT', pos.outputs['Z'], 25.0)
    hi = math_node(nt, 'MULTIPLY', hi, 1 / 60.0, clamp=True)
    st = math_node(nt, 'MULTIPLY', math_node(nt, 'SUBTRACT', slope, 0.012), 25.0, clamp=True)
    is_forest = math_node(nt, 'MAXIMUM', hi, st)
    col = mix_col(nt, is_forest, v1, forest, (0, 0))
    # steep cuts and landslide scars show earth
    bare = math_node(nt, 'MULTIPLY', math_node(nt, 'SUBTRACT', slope, 0.45), 4.0, clamp=True)
    col = mix_col(nt, bare, col, srgb('#8a6a4c'), (200, 0))
    bsdf = node(nt, 'ShaderNodeBsdfPrincipled', (500, 0), Roughness=0.92)
    nt.links.new(col, bsdf.inputs['Base Color'])
    # canopy bump: crowns read at a few hundred metres
    bump = node(nt, 'ShaderNodeBump', (300, -300), Strength=0.9, Distance=6.0)
    nt.links.new(math_node(nt, 'MULTIPLY', vor.outputs['Distance'], is_forest), bump.inputs['Height'])
    nt.links.new(bump.outputs['Normal'], bsdf.inputs['Normal'])
    finish(nt, bsdf.outputs[0])
    return m

MAT_T = terrain_material()
for n in ('GEO-terrain_far', 'GEO-terrain_near'):
    o = bpy.data.objects[n]; o.data.materials.clear(); o.data.materials.append(MAT_T)
    for p in o.data.polygons: p.use_smooth = True

# --- the town ------------------------------------------------------------------------------------
WALLS = [('#ecebe6', 25), ('#cfd1cd', 14), ('#eadcae', 12), ('#86c9c6', 8), ('#e5bba7', 8), ('#bcd0e2', 8),
         ('#9c5c42', 7), ('#a19f99', 8), ('#cbd98f', 4), ('#e3a061', 4), ('#f2f0ea', 6)]
ROOFS_FLAT = [('#8f8d88', 6), ('#a3a19b', 3), ('#77756f', 2)]
ROOFS_TIN = [('#a8432f', 4), ('#3d6fb0', 4), ('#4f7a4a', 1), ('#7a5a44', 3), ('#8f9399', 2)]
def pick(rnd, pal):
    tot = sum(w for _, w in pal); r = rnd.random() * tot
    for c, w in pal:
        r -= w
        if r <= 0: return srgb(c)
    return srgb(pal[-1][0])

def wall_material():
    m, nt = new_mat('MAT-town_wall')
    attr = nt.nodes.new('ShaderNodeAttribute'); attr.attribute_name = 'bcol'; attr.location = (-1200, 300)
    rnd = nt.nodes.new('ShaderNodeAttribute'); rnd.attribute_name = 'brnd'; rnd.location = (-1200, 100)
    uv = nt.nodes.new('ShaderNodeUVMap'); uv.uv_map = 'wallUV'; uv.location = (-1400, -100)
    sp = nt.nodes.new('ShaderNodeSeparateXYZ'); sp.location = (-1200, -100); nt.links.new(uv.outputs[0], sp.inputs[0])
    u, v = sp.outputs['X'], sp.outputs['Y']
    bay = math_node(nt, 'ADD', 2.6, math_node(nt, 'MULTIPLY', rnd.outputs['Fac'], 1.0))
    fu = math_node(nt, 'FRACT', math_node(nt, 'DIVIDE', u, bay))
    fv = math_node(nt, 'FRACT', math_node(nt, 'DIVIDE', v, 3.0))
    def band(x, lo, hi):
        a = math_node(nt, 'GREATER_THAN', x, lo); b = math_node(nt, 'LESS_THAN', x, hi)
        return math_node(nt, 'MULTIPLY', a, b)
    ww = math_node(nt, 'ADD', 0.16, math_node(nt, 'MULTIPLY', rnd.outputs['Fac'], 0.1))   # half-width varies per house
    win = math_node(nt, 'MULTIPLY', band(fu, math_node(nt, 'SUBTRACT', 0.5, ww), math_node(nt, 'ADD', 0.5, ww)), band(fv, 0.33, 0.8))
    fw = math_node(nt, 'ADD', ww, 0.035)
    frame = math_node(nt, 'MULTIPLY', band(fu, math_node(nt, 'SUBTRACT', 0.5, fw), math_node(nt, 'ADD', 0.5, fw)), band(fv, 0.3, 0.83))
    upper = math_node(nt, 'GREATER_THAN', v, 3.0)
    win = math_node(nt, 'MULTIPLY', win, upper); frame = math_node(nt, 'MULTIPLY', frame, upper)
    # shop shutters on the ground floor of about half the buildings
    shop = math_node(nt, 'MULTIPLY', math_node(nt, 'GREATER_THAN', rnd.outputs['Fac'], 0.5),
                     math_node(nt, 'MULTIPLY', band(fu, 0.08, 0.92), band(v, 0.05, 2.6)))
    # grime: rain streaks and a darker plinth
    streak = node(nt, 'ShaderNodeTexNoise', (-1000, -500), Scale=1.2, Detail=4.0)
    mp = nt.nodes.new('ShaderNodeMapping'); mp.location = (-1200, -500); mp.inputs['Scale'].default_value = (1.0, 0.08, 1.0)
    nt.links.new(uv.outputs[0], mp.inputs[0]); nt.links.new(mp.outputs[0], streak.inputs['Vector'])
    grime = math_node(nt, 'MULTIPLY', math_node(nt, 'SUBTRACT', streak.outputs['Fac'], 0.45), 1.6, clamp=True)
    base = mix_col(nt, math_node(nt, 'MULTIPLY', grime, 0.35), attr.outputs['Color'], srgb('#5a554c'), (-600, 300))
    plinth = math_node(nt, 'LESS_THAN', v, 0.5)
    base = mix_col(nt, math_node(nt, 'MULTIPLY', plinth, 0.6), base, srgb('#4c4840'), (-400, 300))
    # each window pane its own: curtains drawn or open, a frame that is brown, white or green
    cell = nt.nodes.new('ShaderNodeCombineXYZ'); cell.location = (-800, -300)
    nt.links.new(math_node(nt, 'FLOOR', math_node(nt, 'DIVIDE', u, bay)), cell.inputs[0])
    nt.links.new(math_node(nt, 'FLOOR', math_node(nt, 'DIVIDE', v, 3.0)), cell.inputs[1])
    nt.links.new(math_node(nt, 'MULTIPLY', rnd.outputs['Fac'], 97.0), cell.inputs[2])
    wn = nt.nodes.new('ShaderNodeTexWhiteNoise'); wn.noise_dimensions = '3D'; wn.location = (-600, -300)
    nt.links.new(cell.outputs[0], wn.inputs['Vector'])
    glass = mix_col(nt, wn.outputs['Value'], srgb('#161b20'), srgb('#3b4148'), (-400, -300))
    curtain = mix_col(nt, wn.outputs['Color'], srgb('#8a5a4a'), srgb('#c9b48a'), (-400, -450))
    drawn = math_node(nt, 'GREATER_THAN', wn.outputs['Value'], 0.62)
    glass = mix_col(nt, math_node(nt, 'MULTIPLY', drawn, 0.7), glass, curtain, (-200, -300))
    frame_col = mix_col(nt, math_node(nt, 'GREATER_THAN', rnd.outputs['Fac'], 0.72), srgb('#4a3426'), srgb('#d8d8d2'), (-400, 150))
    c = mix_col(nt, frame, base, frame_col, (-200, 300))
    c = mix_col(nt, win, c, glass, (0, 300))
    shutter = mix_col(nt, rnd.outputs['Fac'], srgb('#6d7177'), srgb('#3f5f7d'), (-200, 0))
    c = mix_col(nt, shop, c, shutter, (200, 300))
    rough = math_node(nt, 'SUBTRACT', 0.88, math_node(nt, 'MULTIPLY', win, 0.7))
    bsdf = node(nt, 'ShaderNodeBsdfPrincipled', (500, 0))
    nt.links.new(c, bsdf.inputs['Base Color']); nt.links.new(rough, bsdf.inputs['Roughness'])
    finish(nt, bsdf.outputs[0])
    return m

def roof_material():
    m, nt = new_mat('MAT-town_roof')
    attr = nt.nodes.new('ShaderNodeAttribute'); attr.attribute_name = 'bcol'; attr.location = (-800, 200)
    tx = nt.nodes.new('ShaderNodeTexCoord'); tx.location = (-1000, -100)
    n = node(nt, 'ShaderNodeTexNoise', (-800, -100), Scale=0.6, Detail=6.0)
    nt.links.new(tx.outputs['Object'], n.inputs['Vector'])
    c = mix_col(nt, math_node(nt, 'MULTIPLY', n.outputs['Fac'], 0.45), attr.outputs['Color'], srgb('#4d4a44'), (-400, 100))
    bsdf = node(nt, 'ShaderNodeBsdfPrincipled', (0, 0), Roughness=0.8)
    nt.links.new(c, bsdf.inputs['Base Color'])
    finish(nt, bsdf.outputs[0])
    return m

def tank_material():
    m, nt = new_mat('MAT-water_tank')
    bsdf = node(nt, 'ShaderNodeBsdfPrincipled', (0, 0), Roughness=0.45)
    bsdf.inputs['Base Color'].default_value = srgb('#151515')
    finish(nt, bsdf.outputs[0])
    return m

MAT_WALL, MAT_ROOF, MAT_TANK = wall_material(), roof_material(), tank_material()

def offset(pts, d):
    """Offset a CCW polygon outwards by d (inwards if d < 0), mitred and clamped at sharp corners."""
    out = []
    n = len(pts)
    for i in range(n):
        p0, p1, p2 = Vector(pts[i - 1]), Vector(pts[i]), Vector(pts[(i + 1) % n])
        e1 = (p1 - p0).normalized(); e2 = (p2 - p1).normalized()
        n1 = Vector((e1.y, -e1.x)); n2 = Vector((e2.y, -e2.x))
        m = n1 + n2
        k = 1.0 + n1.dot(n2)
        v = m / k if k > 0.3 else (n1 + n2).normalized() * 1.6 if m.length > 1e-6 else n1
        q = p1 + v * d
        out.append((q.x, q.y))
    return out

def build_town(max_r=650):
    data = json.load(open(f'{ENV}/osm_local.json', encoding='utf-8'))
    bm = bmesh.new()
    lay_col = bm.loops.layers.float_color.new('bcol')
    lay_rnd = bm.loops.layers.float_color.new('brndc')
    uvl = bm.loops.layers.uv.new('wallUV')
    tanks = []
    n = 0

    def face(vs, mat, col, r, uvs=None):
        try: f = bm.faces.new(vs)
        except ValueError: return None
        f.material_index = mat
        for k, lp in enumerate(f.loops):
            lp[lay_col] = col; lp[lay_rnd] = (r, r, r, 1)
            lp[uvl].uv = uvs[k] if uvs else (0.0, 1.5)
        return f

    def ring(outer, inner, z0, z1, col, r, mat=0):
        """A solid band between two rings: a floor ledge or a parapet cap."""
        ot = [bm.verts.new((x, y, z1)) for x, y in outer]; it = [bm.verts.new((x, y, z1)) for x, y in inner]
        ob = [bm.verts.new((x, y, z0)) for x, y in outer]; ib = [bm.verts.new((x, y, z0)) for x, y in inner]
        for i in range(len(outer)):
            j = (i + 1) % len(outer)
            face((ot[i], ot[j], it[j], it[i]), mat, col, r)          # top
            face((ob[j], ob[i], ib[i], ib[j]), mat, col, r)          # underside
            face((ob[i], ob[j], ot[j], ot[i]), mat, col, r)          # outer edge
            face((ib[j], ib[i], it[i], it[j]), mat, col, r)          # inner edge

    def prism(pts, z0, z1, col, r, u0=0.0, g=0.0, roof=None):
        lo = [bm.verts.new((x, y, z0)) for x, y in pts]
        hi = [bm.verts.new((x, y, z1)) for x, y in pts]
        u = u0
        for i in range(len(pts)):
            j = (i + 1) % len(pts)
            seg = math.dist(pts[i], pts[j])
            face((lo[i], lo[j], hi[j], hi[i]), 0, col, r,
                 [(u, z0 - g), (u + seg, z0 - g), (u + seg, z1 - g), (u, z1 - g)])
            u += seg
        if roof is not None:
            face(hi, 1, roof, r)
        return hi

    skip = set(globals().get('SX_SKIP_IDS', ()))
    for b in data['buildings'] + list(globals().get('SX_EXTRA', ())):
        pts = b['p']
        if len(pts) < 3 or b['id'] in skip: continue
        if b['id'] in globals().get('SX_OVERRIDE', {}) and 'p' in globals()['SX_OVERRIDE'][b['id']]:
            pts = globals()['SX_OVERRIDE'][b['id']]['p']     # a footprint corrected from the photos
        cx = sum(p[0] for p in pts) / len(pts); cy = sum(p[1] for p in pts) / len(pts)
        if math.hypot(cx, cy) > max_r: continue
        area2 = sum(pts[i][0] * pts[(i + 1) % len(pts)][1] - pts[(i + 1) % len(pts)][0] * pts[i][1] for i in range(len(pts)))
        if abs(area2) < 8: continue
        if area2 < 0: pts = pts[::-1]
        area = abs(area2) / 2
        rnd = random.Random(b['id'])
        gs = [ground(x, y) for x, y in pts]
        g0, g1 = min(gs) - 1.0, max(gs)
        floors = b['floors']
        if area > 600: floors = max(floors, rnd.choice([3, 4, 5]))
        top = g1 + floors * 3.0 + rnd.uniform(0.1, 0.4)
        tin = rnd.random() < 0.3
        wall = pick(rnd, WALLS); roof = pick(rnd, ROOFS_TIN if tin else ROOFS_FLAT)
        ov = globals().get('SX_OVERRIDE', {}).get(b['id'])
        ledge_override = None
        if ov:   # a house seen in the client's photos: its storeys and colours by hand
            floors = ov.get('floors', floors); top = g1 + floors * 3.0 + 0.2
            tin = ov.get('tin', tin)
            if 'wall' in ov: wall = srgb(ov['wall'])
            if 'roof' in ov: roof = srgb(ov['roof'])
            if 'ledge' in ov: ledge_override = srgb(ov['ledge'])
        r = rnd.random()
        if ov and 'shops' in ov: r = 0.9 if ov['shops'] else 0.1      # shutters on the ground floor
        ledge_col = tuple(c * 0.82 for c in wall[:3]) + (1.0,) if rnd.random() < 0.7 else pick(rnd, WALLS)
        if ledge_override: ledge_col = ledge_override
        small = area < 30
        if tin or small:
            prism(pts, g0, top, wall, r, g=g1, roof=roof)
            if tin and not small:   # the eave of a tin roof
                ring(offset(pts, 0.5), pts, top - 0.05, top + 0.08, roof, r, mat=1)
        else:
            # walls run up past the roof slab into a 1 m parapet
            prism(pts, g0, top + 1.0, wall, r, g=g1)
            inner = offset(pts, -0.22)
            prism(inner[::-1], top, top + 1.0, wall, r, g=g1)    # the parapet seen from the roof
            hi = [bm.verts.new((x, y, top)) for x, y in inner]
            face(hi, 1, roof, r)
            ring(pts, inner, top + 1.0, top + 1.08, ledge_col, r)
            # the stair head ("mumty") on most flat roofs
            if area > 70 and rnd.random() < 0.6:
                vx, vy = pts[0]
                sx, sy = cx + (vx - cx) * 0.45, cy + (vy - cy) * 0.45
                sq = [(sx - 1.6, sy - 1.6), (sx + 1.6, sy - 1.6), (sx + 1.6, sy + 1.6), (sx - 1.6, sy + 1.6)]
                prism(sq, top, top + 2.7, wall, r, g=top - 3.0, roof=roof)
            if rnd.random() < 0.6:
                tanks.append((cx + rnd.uniform(-1.5, 1.5), cy + rnd.uniform(-1.5, 1.5), top, rnd.choice([1, 1, 2])))
        # a slab ledge (chajja) at every floor: the line that makes a Nepali house read as one
        if not small and rnd.random() < 0.85:
            out = offset(pts, 0.42)
            for k in range(1, floors + (0 if not tin else 0)):
                z = g1 + 3.0 * k
                ring(out, pts, z - 0.16, z, ledge_col, r)
        n += 1
    me = bpy.data.meshes.new('town'); bm.to_mesh(me); bm.free()
    if 'brndc' in me.color_attributes:
        me.color_attributes['brndc'].name = 'brnd'
    me.materials.append(MAT_WALL); me.materials.append(MAT_ROOF)
    return me, tanks, n

cTown = coll('ENV-town'); clear(cTown)
me, tanks, n = build_town(globals().get('SX_TOWN_R', 650))
town = bpy.data.objects.new('GEO-town', me); cTown.objects.link(town)

# water tanks (black 1000 L Sintex) on the flat roofs
bm = bmesh.new()
for x, y, z, k in tanks:
    for t in range(k):
        bmesh.ops.create_cone(bm, cap_ends=True, segments=14, radius1=0.55, radius2=0.55, depth=1.25,
                              matrix=__import__('mathutils').Matrix.Translation((x + t * 1.3, y, z + 0.62 + 0.25)))
tm = bpy.data.meshes.new('tanks'); bm.to_mesh(tm); bm.free(); tm.materials.append(MAT_TANK)
cTown.objects.link(bpy.data.objects.new('GEO-roof_tanks', tm))

# --- roads ------------------------------------------------------------------------------------------
def road_material(name, dark, light):
    m, nt = new_mat(name)
    tx = nt.nodes.new('ShaderNodeTexCoord')
    nz = node(nt, 'ShaderNodeTexNoise', (-600, 0), Scale=0.35, Detail=8.0)
    nt.links.new(tx.outputs['Object'], nz.inputs['Vector'])
    c = mix_col(nt, nz.outputs['Fac'], srgb(dark), srgb(light), (-300, 0))
    bsdf = node(nt, 'ShaderNodeBsdfPrincipled', (0, 0), Roughness=0.9)
    nt.links.new(c, bsdf.inputs['Base Color'])
    finish(nt, bsdf.outputs[0])
    return m
MAT_ASPH = road_material('MAT-road_asphalt', '#67645e', '#8c877d')
MAT_DIRT = road_material('MAT-road_dirt', '#8b7a62', '#b39f80')

def build_roads(max_r=900):
    data = json.load(open(f'{ENV}/osm_local.json', encoding='utf-8'))
    bm = bmesh.new()
    for r in data['roads']:
        pts = [p for p in r['p']]
        if len(pts) < 2 or min(math.hypot(*p) for p in pts) > max_r: continue
        if r['id'] in globals().get('SX_SKIP_ROADS', ()): continue      # drawn by hand instead
        w = r['w'] / 2
        paved = r['surface'] in ('asphalt', 'paved', 'concrete') or r['kind'] in ('trunk', 'primary', 'secondary', 'tertiary')
        L, R = [], []
        for i, p in enumerate(pts):
            a = Vector(pts[max(i - 1, 0)]); b = Vector(pts[min(i + 1, len(pts) - 1)])
            d = (b - a).normalized(); nrm = Vector((-d.y, d.x))
            for side, lst in ((1, L), (-1, R)):
                q = Vector(p) + nrm * w * side
                lst.append(bm.verts.new((q.x, q.y, ground(q.x, q.y) + 0.12)))
        for i in range(len(pts) - 1):
            try:
                f = bm.faces.new((R[i], R[i + 1], L[i + 1], L[i])); f.material_index = 0 if paved else 1
            except ValueError: pass
    me = bpy.data.meshes.new('roads'); bm.to_mesh(me); bm.free()
    me.materials.append(MAT_ASPH); me.materials.append(MAT_DIRT)
    return me
cRoad = coll('ENV-roads'); clear(cRoad)
cRoad.objects.link(bpy.data.objects.new('GEO-roads', build_roads(globals().get('SX_ROAD_R', 900))))

print('buildings', n, 'tanks', len(tanks))
