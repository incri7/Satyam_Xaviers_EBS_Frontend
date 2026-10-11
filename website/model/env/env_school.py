# The school's main block, from the client's photos (IMG_3017, 3019, 3020, 3082-3086). Run after
# env_street.py in the same globals (W, gz, plane, obj, MAT, image_mat, new_mat, node, finish, srgb...).
#
# A long, narrow concrete block, its short end facing the driveway. Open corridors run across the
# front and turn down the long side (viewer's right) round a rounded corner: four corridor levels
# over a semi-basement, each a deep slate-blue slab edge with a steel railing, thin steel posts from
# slab to slab. Walls yellow up to the door heads, white above. A flat roof with rebar left up for a
# future floor, a stair head, and the flag. Painted storeys: make_school_textures.py.
import bpy, bmesh, math
from mathutils import Vector

ST = DATA
SF = 30.5            # front corridor's outer edge, metres along the driveway (photo GPS: its corner is ~29 m in)
CORR = 1.6           # corridor depth
TL = 7.0             # the front's left end (square)
TR = -5.0            # outer edge of the side corridor (the viewer's right)
TC = TR + CORR       # the core's right wall
SB = 60.5            # the back
R = 1.6              # the rounded corner's radius
Z0, STOREY, SLAB = 1.0, 3.2, 0.45
LEVELS = [Z0 + STOREY * k for k in range(5)]          # four corridor floors and the roof
G = gz(SF + 10, 0.0)                                  # the plot is levelled: one ground height

def P(s, t, z): return W(s, t, G + z)

def mat_img(name, file, rough=0.8, alpha=False):
    m, nt = new_mat(name)
    t = nt.nodes.new('ShaderNodeTexImage'); t.image = bpy.data.images.load(f'{ST}/{file}', check_existing=True)
    t.extension = 'REPEAT'
    uv = nt.nodes.new('ShaderNodeUVMap'); uv.uv_map = 'UVMap'; nt.links.new(uv.outputs[0], t.inputs[0])
    b = node(nt, 'ShaderNodeBsdfPrincipled', (300, 0), Roughness=rough)
    nt.links.new(t.outputs[0], b.inputs['Base Color'])
    finish(nt, b.outputs[0]); return m
SM = {
    'front': mat_img('MAT-school_front', 'school_front.png'),
    'side': mat_img('MAT-school_side', 'school_side.png'),
    'fascia': mat_img('MAT-school_slab_edge', 'school_fascia.png', 0.7),
    'gate': mat_img('MAT-school_basement_gate', 'school_gate.png', 0.5),
    'banner': mat_img('MAT-school_banner', 'school_banner.jpg', 0.6),
    'soffit': flat('MAT-school_soffit', '#ecebe4', 0.85),
    'deck': flat('MAT-school_corridor_floor', '#8f8d88', 0.6),
    'plain': flat('MAT-school_wall_plain', '#eedc92', 0.85),
    'post': flat('MAT-school_post_steel', '#c9ccd0', 0.25, 1.0),
    'rebar': flat('MAT-rebar', '#4a3a30', 0.7, 1.0),
    'flag': flat('MAT-flag_nepal', '#c8102e', 0.6),
    'ac': flat('MAT-ac_unit', '#e9ebec', 0.4),
    'front_ground': mat_img('MAT-school_front_ground', 'school_front_ground.png'),
    'side_ground': mat_img('MAT-school_side_ground', 'school_side_ground.png'),
    'base_front': mat_img('MAT-school_basement_front', 'school_base_front.png'),
    'base_side': mat_img('MAT-school_basement_side', 'school_base_side.png'),
    'concrete': flat('MAT-school_ramp_wall', '#b9b6ae', 0.9),
    'bracket': flat('MAT-school_bracket', '#5d80a8', 0.6),
}
W_FRONT_TEX = 10.4      # make_school_textures.py's front width; the core's front is TL - TC wide

def mesh(name, build, mats):
    bm = bmesh.new(); uvl = bm.loops.layers.uv.new('UVMap')
    build(bm, uvl)
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
    for m in mats: me.materials.append(m)
    return obj(name, me)

def quad(bm, uvl, a, b, c, d, uvs, mi=0):
    f = bm.faces.new([bm.verts.new(v) for v in (a, b, c, d)]); f.material_index = mi
    for lp, uv in zip(f.loops, uvs): lp[uvl].uv = uv
    return f

# --- the outline of a corridor slab: across the front, round the corner, down the long side ------------------
def outer_line():
    pts = [(SF, TL), (SF, TR + R)]
    for i in range(1, 9):                      # the rounded corner, centre (SF + R, TR + R)
        a = math.pi + (math.pi / 2) * i / 8    # from facing -s to facing -t
        pts.append((SF + R + R * math.cos(a), TR + R + R * math.sin(a)))
    pts.append((SB, TR))
    return pts
OUT = outer_line()
INNER = [(SB, TC), (SF + CORR, TC), (SF + CORR, TL)]

def slab(name, z, full=False):
    """A slab whose outer edge is the blue fascia; full covers the core too (the roof)."""
    ring = OUT + ([(SB, TL)] if full else INNER)
    def build(bm, uvl):
        top = [bm.verts.new(P(s, t, z)) for s, t in ring]
        bot = [bm.verts.new(P(s, t, z - SLAB)) for s, t in ring]
        ft = bm.faces.new(top); ft.material_index = 1
        fb = bm.faces.new(bot[::-1]); fb.material_index = 2
        for f in (ft, fb):
            for lp in f.loops: lp[uvl].uv = (lp.vert.co.x, lp.vert.co.y)
        u = 0.0
        n_out = len(OUT) if not full else len(OUT) + 1
        for i in range(len(ring)):
            j = (i + 1) % len(ring)
            seg = math.dist(ring[i], ring[j])
            f = bm.faces.new((bot[i], bot[j], top[j], top[i]))
            f.material_index = 0 if i < n_out - 1 or full else 2
            for lp, uv in zip(f.loops, ((u / 4, 0), ((u + seg) / 4, 0), ((u + seg) / 4, 1), (u / 4, 1))): lp[uvl].uv = uv
            u += seg
    return mesh(name, build, [SM['fascia'], SM['deck'], SM['soffit']])

for k, z in enumerate(LEVELS):
    slab(f'GEO-school_slab_{k}', z, full=(k == len(LEVELS) - 1))

# --- railings on every corridor level, along the slab's outer edge --------------------------------------------
def railing(name, z):
    def build(bm, uvl):
        u = 0.0
        for (s0, t0), (s1, t1) in zip(OUT, OUT[1:]):
            seg = math.dist((s0, t0), (s1, t1))
            # 6 cm inside the edge
            d = Vector((s1 - s0, t1 - t0)).normalized(); n = Vector((-d.y, d.x)) * 0.06
            a, b = (s0 + n.x, t0 + n.y), (s1 + n.x, t1 + n.y)
            quad(bm, uvl, P(*a, z), P(*b, z), P(*b, z + 1.0), P(*a, z + 1.0), [(u, 0), (u + seg, 0), (u + seg, 1), (u, 1)])
            u += seg
    return mesh(name, build, [MAT['rail']])
for k, z in enumerate(LEVELS[:4]):
    railing(f'GEO-school_railing_{k}', z)

# --- thin steel posts from the ground corridor to the roof, at the corners and down the long side ---------------
posts = [(SF + 0.08, TL - 0.08), (SF + 0.1, TR + R + 0.0), (SF + R, TR + 0.1)]
s = SF + R + 3.95
while s < SB - 0.5:
    posts.append((s, TR + 0.08)); s += 3.95
for i, (s, t) in enumerate(posts):
    cylinder(f'GEO-school_post_{i}', P(s, t, Z0), LEVELS[-1] - SLAB - Z0, 0.035, SM['post'], seg=8)

# --- the core: painted storeys on the front and the long side; plain walls behind ------------------------------
def wall_strip(name, a, b, z0, z1, m, u1, v0=0.0):
    return mesh(name, lambda bm, uvl: quad(bm, uvl, P(*a, z0), P(*b, z0), P(*b, z1), P(*a, z1), [(0, v0), (u1, v0), (u1, 1), (0, 1)]), [m])
for k in range(4):
    z = LEVELS[k]
    ground_floor = k == 0       # the ground storey's wall is painted with pupils, the flag, a welcome panel
    wall_strip(f'GEO-school_front_{k}', (SF + CORR, TL), (SF + CORR, TC), z, z + STOREY - SLAB + 0.45,
               SM['front_ground' if ground_floor else 'front'], 1.0)
    wall_strip(f'GEO-school_side_{k}', (SF + CORR, TC), (SB, TC), z, z + STOREY - SLAB + 0.45,
               SM['side_ground' if ground_floor else 'side'], (SB - SF - CORR) / 30.0)
# The semi-basement under the ground-floor corridor: barred windows, and on the front the collapsible gate at
# the foot of a ramp between two low concrete walls (IMG_3055 0:02, 0:14). The painted band is 1.6 m tall;
# the 1 m above the ground shows its upper part (the rest is below the ramp's level).
wall_strip('GEO-school_basement_front', (SF + CORR, TL), (SF + CORR, TC), 0.0, Z0, SM['base_front'], 1.0, v0=0.375)
wall_strip('GEO-school_basement_side', (SF + CORR, TC), (SB, TC), 0.0, Z0, SM['base_side'], (SB - SF - CORR) / 30.0, v0=0.375)
GATE_T = TL - (W_FRONT_TEX / 2 + 0.4)          # the gate's centre: where make_school_textures.py paints it
for i, t in enumerate((GATE_T + 1.75, GATE_T - 1.75)):
    off = G - gz(SF - 1.6, t)
    box(f'GEO-school_ramp_wall_{i}', SF - 3.6, SF + 0.05, t - 0.13, t + 0.13, off, off + 0.85, SM['concrete'])
# blue brackets under every corridor slab, at the posts and across the front (IMG_3099 4:00, 4:40)
def bracket(name, s0, s1, t0, t1, z):
    off = G - gz((s0 + s1) / 2, (t0 + t1) / 2)
    box(name, s0, s1, t0, t1, off + z - SLAB - 0.32, off + z - SLAB + 0.01, SM['bracket'])
for k, z in enumerate(LEVELS):
    for i, t in enumerate((TL - 0.15, TL - 3.6, TL - 7.0)):
        bracket(f'GEO-school_bracket_f{k}_{i}', SF + 0.05, SF + CORR, t - 0.09, t + 0.09, z)
    for i, (ps, pt) in enumerate(posts[3:]):
        bracket(f'GEO-school_bracket_s{k}_{i}', ps - 0.09, ps + 0.09, TR + 0.05, TC, z)
wall_strip('GEO-school_wall_left', (SB, TL), (SF + CORR, TL), 0.0, LEVELS[-1], SM['plain'], 1.0)
wall_strip('GEO-school_wall_back', (SB, TC), (SB, TL), 0.0, LEVELS[-1], SM['plain'], 1.0)
wall_strip('GEO-school_left_end_cap', (SF + CORR, TL), (SF, TL), 0.0, Z0, SM['plain'], 1.0)

# --- the banner on the first-floor railing (IMG_3017, IMG_3019) ---------------------------------------------------
z = LEVELS[1]
wall_strip('GEO-school_banner', (SF - 0.03, -0.3), (SF - 0.03, -4.3), z + 0.05, z + 1.0, SM['banner'], 1.0)

# --- the roof: rebar left up for another floor, the stair head, the AC unit, the flag -----------------------------
roof = LEVELS[-1]
bm = bmesh.new()
spots = [(SF + CORR + 0.3, TL - 0.3), (SF + CORR + 0.3, TC + 0.3), (SF + CORR + 0.3, 0.8)]
s = SF + CORR + 3.95
while s < SB - 0.5:
    spots += [(s, TC + 0.3), (s, TL - 0.3)]; s += 3.95
for s, t in spots:
    for dx, dy in ((0.1, 0.1), (-0.1, 0.1), (0.1, -0.1), (-0.1, -0.1)):
        base = P(s, t, roof); lean = Vector((dx, dy, 0)) * 0.4
        bmesh.ops.create_cone(bm, cap_ends=True, segments=5, radius1=0.009, radius2=0.009, depth=1.3,
                              matrix=__import__('mathutils').Matrix.Translation(base + Vector((dx, dy, 0.65)) + lean))
me = bpy.data.meshes.new('rebar'); bm.to_mesh(me); bm.free(); me.materials.append(SM['rebar']); obj('GEO-school_rebar', me)
def on_level(name, s0, s1, t0, t1, z0, z1, m):
    # box() stands on the ground under its centre; the school's plot is levelled at G
    off = G - gz((s0 + s1) / 2, (t0 + t1) / 2)
    return box(name, s0, s1, t0, t1, off + z0, off + z1, m)
on_level('GEO-school_stair_head', SB - 7.0, SB - 3.5, TC + 0.6, TC + 4.0, roof, roof + 2.7, SM['plain'])
cylinder('GEO-school_flag_pole', P(SF + CORR + 0.6, TC + 0.7, roof), 4.6, 0.025, SM['post'], seg=8)
fp = P(SF + CORR + 0.6, TC + 0.7, roof + 4.55)
side = (W(0, -1, 0) - W(0, 0, 0)); side.z = 0; side.normalize()
def flag(bm, uvl):
    # Nepal's flag: two pennants, one above the other, flying towards the viewer's right
    pts = [fp, fp + side * 0.95 + Vector((0, 0, -0.5)), fp + side * 0.35 + Vector((0, 0, -0.55)),
           fp + side * 0.95 + Vector((0, 0, -1.15)), fp + Vector((0, 0, -1.2))]
    f = bm.faces.new([bm.verts.new(p) for p in pts])
    for lp in f.loops: lp[uvl].uv = (0, 0)
mesh('GEO-school_flag', flag, [SM['flag']])
on_level('GEO-school_ac_unit', SF + CORR - 0.32, SF + CORR - 0.02, TL - 1.65, TL - 0.8, LEVELS[3] + 2.0, LEVELS[3] + 2.6, SM['ac'])
print('school built')
