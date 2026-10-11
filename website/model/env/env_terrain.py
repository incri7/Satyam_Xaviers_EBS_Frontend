# SXEBS environment, part 1: the real ground, the sky and the sun.
# Blender units are metres. X = east, Y = north, Z = up. The origin is (lat0, lon0) at the
# DEM's height there, so the town sits at z ~ 0. Earth curvature is applied (31 m at 20 km).
import bpy, bmesh, json, math, os
import numpy as np

# The caller may set SX_DATA (a data folder) and the radii below before exec'ing this file.
ENV = globals().get('SX_DATA', r'C:/Users/legio/Workspace/Satyam_Xaviers_EBS_Frontend/website/model/env/data')
R_EARTH = 6371000.0
# 2026-10-11 12:40 NPT (the client's photos) is 53.6 / 200.5; the caller may pick another hour
SUN_ALT, SUN_AZ = globals().get('SX_SUN', (53.6, 200.5))

def coll(name):
    c = bpy.data.collections.get(name) or bpy.data.collections.new(name)
    if c.name not in bpy.context.scene.collection.children:
        bpy.context.scene.collection.children.link(c)
    return c

def clear(c):
    for o in list(c.objects):
        bpy.data.objects.remove(o, do_unlink=True)

def load_dem(z):
    m = json.load(open(f'{ENV}/dem_z{z}.json'))
    h = np.fromfile(f'{ENV}/dem_z{z}.f32', dtype=np.float32).reshape(m['size'], m['size'])
    return m, h

m14, h14 = load_dem(14)
H0 = float(h14[int(round(m14['schoolPy'])), int(round(m14['schoolPx']))])

def grid_mesh(name, m, h, step, half_extent=None, sink_inside=None):
    """A terrain grid from a DEM, every `step` pixels, optionally limited to +-half_extent metres.
    sink_inside=(r): vertices inside the square |x|,|y| < r drop 40 m (a finer grid covers them)."""
    mpp, px0, py0 = m['mpp'], m['schoolPx'], m['schoolPy']
    n = m['size']
    idx = np.arange(0, n, step)
    xs = (idx - px0) * mpp
    ys = -(idx - py0) * mpp
    if half_extent:
        keep_x = idx[np.abs(xs) <= half_extent]; keep_y = idx[np.abs(ys) <= half_extent]
    else:
        keep_x = keep_y = idx
    cols, rows = len(keep_x), len(keep_y)
    X = (keep_x[None, :] - px0) * mpp + 0 * keep_y[:, None]
    Y = -(keep_y[:, None] - py0) * mpp + 0 * keep_x[None, :]
    Z = h[np.ix_(keep_y, keep_x)].astype(np.float64) - H0
    Z -= (X ** 2 + Y ** 2) / (2 * R_EARTH)
    if sink_inside:
        Z[(np.abs(X) < sink_inside) & (np.abs(Y) < sink_inside)] -= 40.0
    verts = np.stack([X, Y, Z], -1).reshape(-1, 3)
    faces = []
    for r in range(rows - 1):
        for c in range(cols - 1):
            a = r * cols + c
            faces.append((a, a + cols, a + cols + 1, a + 1))
    me = bpy.data.meshes.new(name)
    me.from_pydata(verts.tolist(), [], faces)
    # UVs = world XY in km, for the terrain shader
    uv = me.uv_layers.new(name='UVMap')
    loops = np.zeros(len(me.loops) * 2)
    vi = np.zeros(len(me.loops), dtype=np.int64); me.loops.foreach_get('vertex_index', vi)
    loops[0::2] = verts[vi, 0] / 1000.0; loops[1::2] = verts[vi, 1] / 1000.0
    uv.data.foreach_set('uv', loops)
    me.update()
    return me

# --- scene + render ---------------------------------------------------------------------------
sc = bpy.context.scene
sc.name = 'SXEBS Environment'
sc.unit_settings.system = 'METRIC'
try:
    sc.render.engine = 'CYCLES'
except TypeError as e:
    print('engine', e)
cp = bpy.context.preferences.addons['cycles'].preferences
cp.compute_device_type = 'OPTIX'; cp.get_devices()
for d in cp.devices: d.use = d.type == 'OPTIX'
sc.cycles.device = 'GPU'
sc.cycles.samples = 128
sc.cycles.use_denoising = True
sc.view_settings.view_transform = 'AgX'
try: sc.view_settings.look = 'AgX - Base Contrast'
except TypeError: pass
sc.render.resolution_x, sc.render.resolution_y = 1600, 900

# --- terrain ------------------------------------------------------------------------------------
cT = coll('ENV-terrain'); clear(cT)
m12, h12 = load_dem(12)
far = bpy.data.objects.new('GEO-terrain_far', grid_mesh('terrain_far', m12, h12, 2, sink_inside=5300))
near = bpy.data.objects.new('GEO-terrain_near', grid_mesh('terrain_near', m14, h14, 2, half_extent=5400))
for o in (far, near): cT.objects.link(o)

# --- sky + sun ------------------------------------------------------------------------------------
w = sc.world or bpy.data.worlds.new('World'); sc.world = w
w.use_nodes = True
nt = w.node_tree; nt.nodes.clear()
out = nt.nodes.new('ShaderNodeOutputWorld')
bg = nt.nodes.new('ShaderNodeBackground')
sky = nt.nodes.new('ShaderNodeTexSky')
# single scattering: the multiple-scattering LUT bands visibly in a 16-bit render
sky.sky_type = 'SINGLE_SCATTERING'
sky.sun_disc = False          # the sun lamp below is the sun
sky.sun_elevation = math.radians(SUN_ALT)
# SKY_ROT_FROM_AZ maps compass azimuth to the node's rotation; checked by a panorama render.
SKY_ROT = globals().get('SKY_ROT_FROM_AZ', lambda a: a)
sky.sun_rotation = math.radians(SKY_ROT(SUN_AZ))
sky.altitude = H0
try: sky.air_density = 1.2; sky.aerosol_density = 2.5   # Terai haze in October, a little dusty
except AttributeError: pass
nt.links.new(sky.outputs[0], bg.inputs[0]); nt.links.new(bg.outputs[0], out.inputs[0])
bg.inputs[1].default_value = 0.25
sc.view_settings.exposure = -0.3
try: sc.view_settings.look = 'AgX - Medium High Contrast'
except TypeError: pass

cL = coll('ENV-light'); clear(cL)
sun = bpy.data.objects.new('LGT-sun', bpy.data.lights.new('LGT-sun', 'SUN'))
sun.data.angle = math.radians(0.53)
sun.data.energy = 4.5
sun.data.color = (1.0, 0.97, 0.92)
# A sun lamp shines along its -Z. Point -Z from the sun's direction towards the ground.
alt, az = math.radians(SUN_ALT), math.radians(SUN_AZ)
to_sun = (math.sin(az) * math.cos(alt), math.cos(az) * math.cos(alt), math.sin(alt))
from mathutils import Vector
sun.rotation_euler = Vector(to_sun).to_track_quat('Z', 'Y').to_euler()
cL.objects.link(sun)

print('terrain verts', len(far.data.vertices), len(near.data.vertices), 'H0', H0)
