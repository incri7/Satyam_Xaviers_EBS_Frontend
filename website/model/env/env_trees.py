# SXEBS environment, part 3: the town's trees. Hetauda is green between its houses: mango, sal and
# banana in every yard. Points are scattered on open ground (not on buildings or roads), clustered
# by a noise mask the way yards and gardens cluster, then instanced from Poly Haven's CC0 trees.
import bpy, json, math, random
import numpy as np

# The caller may set SX_DATA (a data folder) and the radii below before exec'ing this file.
ENV = globals().get('SX_DATA', r'C:/Users/legio/Workspace/Satyam_Xaviers_EBS_Frontend/website/model/env/data')
R = globals().get('SX_TREE_R', 620)   # metres around the origin that get real trees
N = int(2 * R)                        # 1 m cells

lib = bpy.data.collections['ENV-tree_lib']
KEEP = ['island_tree_01_LOD1', 'island_tree_02_LOD1', 'island_tree_03_LOD1', 'tree_small_02_LOD1',
        'shrub_02_a_LOD1', 'shrub_02_c_LOD1']
for o in list(lib.all_objects):
    if o.name not in KEEP:
        bpy.data.objects.remove(o, do_unlink=True)
for n in KEEP:
    bpy.data.objects[n].location = (0, 0, 0)

def sub(name, members):
    c = bpy.data.collections.get(name) or bpy.data.collections.new(name)
    if c.name not in lib.children: lib.children.link(c)
    for n in members:
        o = bpy.data.objects[n]
        if o.name not in c.objects: c.objects.link(o)
        if o.name in lib.objects: lib.objects.unlink(o)
    return c
TREES = sub('LIB-trees', KEEP[:4]); SHRUBS = sub('LIB-shrubs', KEEP[4:])

# --- ground height (same as env_town) ----------------------------------------------------------------
m14 = json.load(open(f'{ENV}/dem_z14.json'))
h14 = np.fromfile(f'{ENV}/dem_z14.f32', dtype=np.float32).reshape(m14['size'], m14['size'])
H0 = float(h14[int(round(m14['schoolPy'])), int(round(m14['schoolPx']))])
def ground(x, y):
    fx = m14['schoolPx'] + x / m14['mpp']; fy = m14['schoolPy'] - y / m14['mpp']
    x0, y0 = int(fx), int(fy); tx, ty = fx - x0, fy - y0
    a = h14[y0, x0] * (1 - tx) + h14[y0, x0 + 1] * tx
    b = h14[y0 + 1, x0] * (1 - tx) + h14[y0 + 1, x0 + 1] * tx
    return float(a * (1 - ty) + b * ty) - H0 - (x * x + y * y) / (2 * 6371000.0)

# --- occupancy grid: 1 = building or road ---------------------------------------------------------------
occ = np.zeros((N, N), dtype=bool)
def cells(x0, x1, y0, y1):
    i0, i1 = max(int(math.floor(x0 + R)), 0), min(int(math.ceil(x1 + R)), N - 1)
    j0, j1 = max(int(math.floor(y0 + R)), 0), min(int(math.ceil(y1 + R)), N - 1)
    if i1 < i0 or j1 < j0: return None
    xs = np.arange(i0, i1 + 1) - R + 0.5; ys = np.arange(j0, j1 + 1) - R + 0.5
    X, Y = np.meshgrid(xs, ys)
    return (j0, j1, i0, i1, X, Y)

data = json.load(open(f'{ENV}/osm_local.json', encoding='utf-8'))
for b in data['buildings']:
    P = np.array(b['p'], dtype=float)
    if len(P) < 3: continue
    c = cells(P[:, 0].min() - 2, P[:, 0].max() + 2, P[:, 1].min() - 2, P[:, 1].max() + 2)
    if not c: continue
    j0, j1, i0, i1, X, Y = c
    inside = np.zeros(X.shape, dtype=bool)
    for k in range(len(P)):                                            # even-odd ray test
        (xa, ya), (xb, yb) = P[k], P[(k + 1) % len(P)]
        cond = ((ya > Y) != (yb > Y)) & (X < (xb - xa) * (Y - ya) / (yb - ya + 1e-12) + xa)
        inside ^= cond
    occ[j0:j1 + 1, i0:i1 + 1] |= inside
for r in data['roads']:
    P = np.array(r['p'], dtype=float); hw = r['w'] / 2 + 0.8
    for k in range(len(P) - 1):
        a, b = P[k], P[k + 1]
        c = cells(min(a[0], b[0]) - hw, max(a[0], b[0]) + hw, min(a[1], b[1]) - hw, max(a[1], b[1]) + hw)
        if not c: continue
        j0, j1, i0, i1, X, Y = c
        d = b - a; L2 = max(d @ d, 1e-9)
        t = np.clip(((X - a[0]) * d[0] + (Y - a[1]) * d[1]) / L2, 0, 1)
        dist = np.hypot(X - (a[0] + t * d[0]), Y - (a[1] + t * d[1]))
        occ[j0:j1 + 1, i0:i1 + 1] |= dist < hw
# areas kept clear by the caller (the driveway, the school's yard)
for poly in globals().get('SX_CLEAR', ()):
    P = np.array(poly, dtype=float)
    c = cells(P[:, 0].min(), P[:, 0].max(), P[:, 1].min(), P[:, 1].max())
    if not c: continue
    j0, j1, i0, i1, X, Y = c
    inside = np.zeros(X.shape, dtype=bool)
    for k in range(len(P)):
        (xa, ya), (xb, yb) = P[k], P[(k + 1) % len(P)]
        inside ^= ((ya > Y) != (yb > Y)) & (X < (xb - xa) * (Y - ya) / (yb - ya + 1e-12) + xa)
    occ[j0:j1 + 1, i0:i1 + 1] |= inside
# keep trunks 1.5 m clear of walls
grow = occ.copy()
for s in (1, -1):
    grow[:, :] |= np.roll(occ, s, 0) | np.roll(occ, s, 1)
occ = grow
print('occupied', round(occ.mean() * 100, 1), '%')

# --- clustered yards: low-frequency random field ---------------------------------------------------------
rng = np.random.default_rng(11)
coarse = rng.random((N // 22 + 3, N // 22 + 3))
def field(x, y):
    fx, fy = (x + R) / 22, (y + R) / 22
    i, j = int(fx), int(fy); tx, ty = fx - i, fy - j
    return (coarse[j, i] * (1 - tx) + coarse[j, i + 1] * tx) * (1 - ty) + (coarse[j + 1, i] * (1 - tx) + coarse[j + 1, i + 1] * tx) * ty

def scatter(n_try, min_gap, keep_p, seed):
    rnd = random.Random(seed); pts = []; taken = {}
    for _ in range(n_try):
        x, y = rnd.uniform(-R + 2, R - 2), rnd.uniform(-R + 2, R - 2)
        if x * x + y * y > R * R or occ[int(y + R), int(x + R)]: continue
        if rnd.random() > keep_p(field(x, y)): continue
        key = (int(x // min_gap), int(y // min_gap))
        if key in taken: continue
        taken[key] = 1; pts.append((x, y))
    return pts

trees = scatter(int(160000 * (R / 620) ** 2), 5.5, lambda f: max(0.0, (f - 0.3) * 1.5), 3)
shrubs = scatter(int(60000 * (R / 620) ** 2), 4.0, lambda f: 0.3, 5)

def points_object(name, pts, kinds, smin, smax, seed):
    rnd = random.Random(seed)
    me = bpy.data.meshes.get(name)
    if me: bpy.data.meshes.remove(me)
    me = bpy.data.meshes.new(name)
    me.from_pydata([(x, y, ground(x, y) - 0.15) for x, y in pts], [], [])
    a_s = me.attributes.new('tscale', 'FLOAT', 'POINT'); a_r = me.attributes.new('trot', 'FLOAT', 'POINT')
    a_k = me.attributes.new('tkind', 'INT', 'POINT')
    a_s.data.foreach_set('value', [rnd.uniform(smin, smax) for _ in pts])
    a_r.data.foreach_set('value', [rnd.uniform(0, math.tau) for _ in pts])
    a_k.data.foreach_set('value', [rnd.randrange(kinds) for _ in pts])
    o = bpy.data.objects.get(name) or bpy.data.objects.new(name, me)
    o.data = me
    return o

def instancer(obj, coll_src):
    g = bpy.data.node_groups.get('GN-' + obj.name)
    if g: bpy.data.node_groups.remove(g)
    g = bpy.data.node_groups.new('GN-' + obj.name, 'GeometryNodeTree')
    g.interface.new_socket('Geometry', in_out='INPUT', socket_type='NodeSocketGeometry')
    g.interface.new_socket('Geometry', in_out='OUTPUT', socket_type='NodeSocketGeometry')
    N_ = g.nodes; L = g.links
    gi = N_.new('NodeGroupInput'); go = N_.new('NodeGroupOutput')
    ci = N_.new('GeometryNodeCollectionInfo'); ci.inputs['Collection'].default_value = coll_src
    ci.inputs['Separate Children'].default_value = True; ci.inputs['Reset Children'].default_value = True
    iop = N_.new('GeometryNodeInstanceOnPoints'); iop.inputs['Pick Instance'].default_value = True
    def named(n, t):
        a = N_.new('GeometryNodeInputNamedAttribute'); a.data_type = t; a.inputs['Name'].default_value = n; return a
    k, s, r = named('tkind', 'INT'), named('tscale', 'FLOAT'), named('trot', 'FLOAT')
    cmb = N_.new('ShaderNodeCombineXYZ')
    L.new(r.outputs['Attribute'], cmb.inputs['Z'])
    L.new(gi.outputs[0], iop.inputs['Points']); L.new(ci.outputs[0], iop.inputs['Instance'])
    L.new(k.outputs['Attribute'], iop.inputs['Instance Index'])
    L.new(cmb.outputs[0], iop.inputs['Rotation']); L.new(s.outputs['Attribute'], iop.inputs['Scale'])
    L.new(iop.outputs[0], go.inputs[0])
    mod = obj.modifiers.get('scatter') or obj.modifiers.new('scatter', 'NODES')
    mod.node_group = g

cV = bpy.data.collections.get('ENV-vegetation') or bpy.data.collections.new('ENV-vegetation')
if cV.name not in bpy.context.scene.collection.children: bpy.context.scene.collection.children.link(cV)
for name, pts, src, kinds, smin, smax, seed in (("GEO-trees", trees, TREES, 4, 1.4, 2.6, 21), ('GEO-shrubs', shrubs, SHRUBS, 2, 0.9, 1.8, 22)):
    o = points_object(name, pts, kinds, smin, smax, seed)
    if o.name not in cV.objects: cV.objects.link(o)
    instancer(o, src)
lib.hide_render = True; lib.hide_viewport = True
print('trees', len(trees), 'shrubs', len(shrubs))
