"""Build the school building model, v2: cinematic look with baked lighting.

Follows website/docs/model-brief.md and the photos in website/refs/building/.
Run with Blender's engine as a Python module (no Blender interface needed):

    python3.11 -m venv .venv-bpy && .venv-bpy/bin/pip install bpy==4.5.4 numpy pillow
    .venv-bpy/bin/python website/model/build_school.py            # everything (~1 h on 4 cores)
    .venv-bpy/bin/python website/model/build_school.py --quick    # fast low-quality check
    .venv-bpy/bin/python website/model/build_school.py --no-render
    .venv-bpy/bin/python website/model/build_school.py --renders-only  # stills only, keeps the bake

Outputs (relative to website/):
    public/models/school.glb             desktop model, Draco
    public/models/school-mobile.glb      same geometry, smaller textures
    public/models/lightmaps/{desktop,mobile}/{morning,day}/<node>.webp
    public/models/lightmaps/manifest.json how the site applies the lightmaps
    model/previews/hero_morning.png, gate_street.png, balcony.png
    public/og-image.jpg                  1200x630 share image

Blender is Z-up; the glTF exporter converts to Y-up. The front of the building
faces Blender -Y, which becomes +Z in three.js.
"""
import json
import math
import os
import shutil
import sys
import tempfile

import bpy  # must come first: bmesh and mathutils are provided by bpy
import bmesh
import numpy as np
from mathutils import Matrix, Vector
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
WEBSITE = os.path.dirname(HERE)
MODELS = os.path.join(WEBSITE, "public", "models")
LIGHTMAPS = os.path.join(MODELS, "lightmaps")
PREVIEWS = os.path.join(HERE, "previews")
QUICK = "--quick" in sys.argv
RENDER = "--no-render" not in sys.argv
RENDERS_ONLY = "--renders-only" in sys.argv  # rebuild the scene and re-render the stills; keep the existing bake
SHOTS = next((a.split("=", 1)[1].split(",") for a in sys.argv if a.startswith("--shots=")), None)  # e.g. --shots=balcony

# ---------------------------------------------------------------- dimensions
H = 3.2            # floor-to-floor height
FLOORS = 4
PLINTH = 1.0       # ground floor sits on a raised base faced with concrete blocks
SLAB = 0.35        # slab thickness; its edge is the deep blue fascia in the photos
BAYS = 6
BAY = 3.8          # main block 22.8 m
MAIN_W = BAYS * BAY
TOWER_W = 3.2      # stair tower -> 26 m overall
ROOM_D = 6.0
CORR_D = 2.4
WALL_T = 0.2       # front wall thickness
R = 1.2            # rounded slab corners at both ends of the corridor
RAIL_H = 1.0
BAR_PITCH = 0.15   # the photos show closely spaced bars
PARAPET_H = 1.0
BAND = 2.5         # yellow below, white band above (height above the floor)
HEAD = 2.35        # door and window head height
SILL = 0.6
GATE_Y = -CORR_D - 11.0
GATE_X = MAIN_W / 2
STAIR_X = (1.4, 2.8)  # ground-floor steps at the west end, as in the photos

# The photos show a compacted gravel/earth yard, not paving. Set to "paved" to switch.
FORECOURT_SURFACE = "gravel"

OX = -(MAIN_W + TOWER_W) / 2
OY = -(ROOM_D - CORR_D) / 2

PHOTO_BAYS = {0: (2, 3), 1: (3, 4), 2: (4, 5), 3: (5, 6)}
INTERIOR_BAY = {f: f + 1 for f in range(FLOORS)}  # one classroom per floor, next to the photo slots
INTERIOR_LABEL = {
    0: "Nursery classroom (illustrative, not the real room)",
    1: "Primary classroom (illustrative, not the real room)",
    2: "Middle school classroom (illustrative, not the real room)",
    3: "Class 10 classroom (illustrative, not the real room)",
}


def base_z(f):
    """Origin height of floor f (floor_0 starts at the ground, under the plinth)."""
    return 0.0 if f == 0 else PLINTH + f * H


def top_z(f):
    """Walking surface of floor f."""
    return PLINTH + f * H + SLAB


def ceil_z(f):
    return PLINTH + (f + 1) * H


# ----------------------------------------------------------------- colours
C = {
    "wall": "#F0C84B", "wall_white": "#F3F1EA", "tower": "#E2B53B",
    "fascia": "#2D5FA6", "slab": "#F6F6F2", "steel": "#D9DCDF",
    "frame": "#4A3A30", "door": "#5A4334", "glass": "#22304D",
    "room_dark": "#2B2A2A", "tank": "#1D2026", "flag_red": "#DC143C",
    "concrete": "#A9A59D",
    # illustrative interiors
    "int_wall": "#F1E9D6", "int_floor": "#B8B2A6", "int_ceiling": "#F7F6F2",
    "wood": "#8A5A3B", "board": "#24382F", "mat_red": "#D94841", "mat_yellow": "#F2B134",
    "mat_green": "#3E8E5E", "mat_blue": "#2D5FA6", "book_a": "#B5473A", "book_b": "#3F6E9C",
    "book_c": "#D9A441", "book_d": "#4D7F4B",
    # setting
    "trunk": "#5B4636", "leaf_a": "#4E7A3A", "leaf_b": "#5F8F45", "leaf_c": "#3F6B33",
    "leaf_d": "#79A04F", "leaf_e": "#2F5A2C",
    # four hill ridges, paler with distance (aerial perspective)
    "hill_1": "#5F7F57", "hill_2": "#7F9A78", "hill_3": "#A1B3A2", "hill_4": "#BCC9C8",
    "grass": "#7C8A5A", "grass_dark": "#5E7444", "grass_light": "#93A262", "grass_dry": "#A7A06E",
    # student uniforms, from the photos: teal shirts and white shirts with navy
    "uni_teal": "#22897F", "uni_white": "#F1F1EE", "uni_navy": "#1E2948", "skin": "#A9775A",
    "hair": "#1A1612", "shoe": "#151515",
}


def srgb_to_linear(c):
    return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4


def rgb(h):
    h = h.lstrip("#")
    return [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]


def lin(h):
    return tuple(srgb_to_linear(c) for c in rgb(h)) + (1.0,)


# ---------------------------------------------------------------- textures
def fbm(n, scale, power, seed):
    """Tileable fractal noise in [0,1]: filtered white noise is periodic."""
    r = np.random.default_rng(seed)
    white = r.standard_normal((n, n))
    f = np.sqrt(np.fft.fftfreq(n)[None, :] ** 2 + np.fft.fftfreq(n)[:, None] ** 2)
    f[0, 0] = 1.0
    amp = f ** (-power / 2) * (np.exp(-(f * n / (scale * 40)) ** 2) + 0.15)
    amp[0, 0] = 0
    out = np.real(np.fft.ifft2(np.fft.fft2(white) * amp))
    return (out - out.min()) / (out.max() - out.min())


def make_textures(folder, n):
    """Generate the tiling textures at size n. Returns {name: path}."""
    os.makedirs(folder, exist_ok=True)
    paths = {}

    def save(name, arr, ext="jpg"):
        p = os.path.join(folder, f"{name}.{ext}")
        img = Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8))
        img.save(p, quality=88) if ext == "jpg" else img.save(p, optimize=True)
        paths[name] = p

    large, grit = fbm(n, 1.5, 3.0, 1), fbm(n, 30, 1.0, 2)
    plaster = 0.6 * large + 0.4 * grit - 0.5  # zero-mean, so the average colour stays the brief's hex
    for name, base in (("plaster_yellow", C["wall"]), ("plaster_white", C["wall_white"]), ("plaster_tower", C["tower"])):
        save(name, np.array(rgb(base)) * 255 * (1 + plaster[..., None] * 0.10))

    # Concrete blocks, 0.4 x 0.2 m, one tile = 2 x 2 m (cube_size 2).
    b = np.full((n, n, 3), rgb("#9C9890"), float) * 255
    rows, cols = 10, 5
    rng = np.random.default_rng(3)
    for r_ in range(rows):
        shift = 0.5 if r_ % 2 else 0
        for c_ in range(cols + 1):
            tone = rng.uniform(-14, 14)
            y0, y1 = int(r_ * n / rows), int((r_ + 1) * n / rows)
            x0 = int((c_ - shift) * n / cols)
            x1 = x0 + int(n / cols)
            xs = np.arange(max(x0, 0), min(x1, n))
            b[y0:y1, xs] += tone
    b *= (1 + (fbm(n, 25, 1.2, 4)[..., None] - 0.5) * 0.25)
    m = max(2, n // 256)
    for r_ in range(rows + 1):
        b[max(0, int(r_ * n / rows) - m):int(r_ * n / rows) + m] = np.array(rgb("#7E7A73")) * 255
    for r_ in range(rows):
        shift = 0.5 if r_ % 2 else 0
        y0, y1 = int(r_ * n / rows), int((r_ + 1) * n / rows)
        for c_ in range(cols + 1):
            x = int((c_ - shift) * n / cols) % n
            b[y0:y1, max(0, x - m):x + m] = np.array(rgb("#7E7A73")) * 255
    save("blocks", b)

    save("yard", yard_texture(2 * n))

    # Ground beyond the compound: grass with large tonal patches; alpha fades to 0 at the rim.
    gn = n
    yy, xx = np.mgrid[0:gn, 0:gn]
    rr = np.hypot(xx - gn / 2 + 0.5, yy - gn / 2 + 0.5) / (gn / 2)
    alpha = np.clip((1 - rr) / 0.6, 0, 1) ** 1.5
    patches, fine = fbm(gn, 4, 3.0, 41), fbm(gn, 40, 1.2, 42)
    grass = mix_palette(patches, [C["grass_dark"], C["grass"], C["grass_light"], C["grass_dry"]]) * (0.92 + 0.16 * fine[..., None])
    save("ground_fade", np.dstack([grass * 255, alpha * 255]), "png")
    return paths


def mix_palette(t, hexes):
    """Map t in [0,1] smoothly through a list of colours."""
    cols = np.array([rgb(h) for h in hexes])
    x = np.clip(t, 0, 1) * (len(cols) - 1)
    i = np.minimum(x.astype(int), len(cols) - 2)
    f = (x - i)[..., None]
    return cols[i] * (1 - f) + cols[i + 1] * f


YARD_PATH = [(GATE_X, GATE_Y - 0.6), (10.2, -10.5), (7.0, -7.6), (3.8, -5.7), ((STAIR_X[0] + STAIR_X[1]) / 2, -4.8)]


def yard_texture(n):
    """One unique texture over the whole yard: gravel and earth (as in the photos), grass creeping in at the
    walls, and a worn path from the gate to the steps."""
    x0, x1, y0, y1 = YARD
    v = 1 - (np.arange(n) + 0.5) / n
    u = (np.arange(n) + 0.5) / n
    X = x0 + u[None, :] * (x1 - x0)
    Y = y0 + v[:, None] * (y1 - y0)
    X, Y = np.broadcast_to(X, (n, n)), np.broadcast_to(Y, (n, n))
    tone, g = fbm(n, 3, 3.0, 7), fbm(n, 90, 0.8, 5)
    speck = (np.random.default_rng(6).random((n, n)) > 0.94) * 0.22
    base = np.array(rgb("#A39785")) * (0.8 + 0.3 * tone + (g - 0.5) * 0.3 + speck)[..., None]
    if FORECOURT_SURFACE == "paved":
        base = np.array(rgb("#B9B5AC")) * (0.92 + 0.12 * tone)[..., None]
        joints = (np.abs(((X - x0) / 0.5) % 1 - 0.5) > 0.47) | (np.abs(((Y - y0) / 0.5) % 1 - 0.5) > 0.47)
        base[joints] *= 0.72
    # Grass creeping in along the compound wall and in loose patches away from the building.
    edge = np.minimum.reduce([X - x0, x1 - X, Y - y0, y1 - Y])
    clump = fbm(n, 12, 2.0, 43)
    grassy = np.clip((1.8 - edge) / 1.4 + (clump - 0.62) * 2.5, 0, 1)
    grassy = np.where((X > -1) & (X < MAIN_W + TOWER_W + 1) & (Y > -CORR_D - 2.5), grassy * 0.15, grassy)
    gcol = mix_palette(fbm(n, 20, 1.5, 44), [C["grass_dark"], C["grass"], C["grass_light"]])
    out = base * (1 - grassy[..., None]) + gcol * grassy[..., None]
    # Worn path: compacted, lighter earth with a soft, irregular edge.
    d = np.full((n, n), 1e9)
    for (ax, ay), (bx, by) in zip(YARD_PATH, YARD_PATH[1:]):
        ex, ey = bx - ax, by - ay
        t = np.clip(((X - ax) * ex + (Y - ay) * ey) / (ex * ex + ey * ey), 0, 1)
        d = np.minimum(d, np.hypot(X - ax - t * ex, Y - ay - t * ey))
    width = 0.8 + 0.25 * (fbm(n, 6, 2.5, 45) - 0.5)
    worn = np.clip((width - d) / 0.35, 0, 1)
    path_col = np.array(rgb("#BCA98C")) * (0.94 + 0.1 * tone)[..., None]
    out = out * (1 - worn[..., None]) + path_col * worn[..., None]
    return out * 255


# ----------------------------------------------------------------- materials
MATS = {}


def material(name, hex_, rough=0.85, metal=0.0, alpha=1.0, image=None):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    bsdf = nt.nodes["Principled BSDF"]
    bsdf.inputs["Base Color"].default_value = lin(hex_)
    bsdf.inputs["Roughness"].default_value = rough
    bsdf.inputs["Metallic"].default_value = metal
    m.diffuse_color = lin(hex_)
    if image:
        tex = nt.nodes.new("ShaderNodeTexImage")
        tex.image = image
        uv = nt.nodes.new("ShaderNodeUVMap")
        uv.uv_map = "UVMap"
        nt.links.new(uv.outputs["UV"], tex.inputs["Vector"])
        nt.links.new(tex.outputs["Color"], bsdf.inputs["Base Color"])
        if image.name.startswith("ground_fade"):
            nt.links.new(tex.outputs["Alpha"], bsdf.inputs["Alpha"])
            m.surface_render_method = "BLENDED"
    if alpha < 1.0:
        bsdf.inputs["Alpha"].default_value = alpha
        m.surface_render_method = "BLENDED"
    MATS[name] = m
    return m


def make_materials(tex):
    imgs = {k: bpy.data.images.load(p) for k, p in tex.items()}
    for img in imgs.values():
        img.pack()
    M = {}
    M["wall"] = material("wall", C["wall"], image=imgs["plaster_yellow"])
    M["wall_white"] = material("wall_white", C["wall_white"], image=imgs["plaster_white"])
    M["tower"] = material("tower", C["tower"], image=imgs["plaster_tower"])
    M["blocks"] = material("blocks", "#9C9890", image=imgs["blocks"])
    M["yard"] = material("yard", "#A39785", 0.95, image=imgs["yard"])
    M["ground"] = material("ground", C["grass"], 0.95, image=imgs["ground_fade"])
    M["glass"] = material("glass", C["glass"], 0.08)
    M["glass_clear"] = material("glass_clear", "#9FB4C8", 0.05, alpha=0.18)
    M["photo_slot"] = material("photo_slot", C["glass"], 0.35)
    for k in ("fascia", "slab", "frame", "door", "room_dark", "tank", "flag_red", "concrete",
              "int_wall", "int_floor", "int_ceiling", "wood", "board", "mat_red", "mat_yellow",
              "mat_green", "mat_blue", "book_a", "book_b", "book_c", "book_d", "trunk",
              "leaf_a", "leaf_b", "leaf_c", "leaf_d", "leaf_e", "hill_1", "hill_2", "hill_3", "hill_4"):
        M[k] = material(k, C[k])
    M["steel"] = material("steel", C["steel"], 0.45)
    M["board"].node_tree.nodes["Principled BSDF"].inputs["Roughness"].default_value = 0.95
    return M, imgs


# ------------------------------------------------------------------ geometry
def link(ob):
    bpy.context.collection.objects.link(ob)
    return ob


def bm_object(name, bm, mats, bevel=False):
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    for m in mats:
        me.materials.append(m)
    ob = link(bpy.data.objects.new(name, me))
    ob["bevel"] = bevel
    return ob


def P(x, y, z=0.0):
    """Building coordinates (x from the west end, y from the front wall) to world."""
    return Vector((x + OX, y + OY, z))


def box(name, x0, x1, y0, y1, z0, z1, mat, bevel=True, drop=(), **faces):
    """Axis-aligned box. faces: nx/px/ny/py/nz/pz -> material override for that side.
    drop: sides that are always hidden, removed so they don't waste lightmap space."""
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1.0)
    for v in bm.verts:
        v.co = P(x0 if v.co.x < 0 else x1, y0 if v.co.y < 0 else y1, z0 if v.co.z < 0 else z1)
    mats = [mat]
    for f in bm.faces:
        n = f.normal
        key = ("px" if n.x > 0 else "nx") if abs(n.x) > 0.5 else ("py" if n.y > 0 else "ny") if abs(n.y) > 0.5 else ("pz" if n.z > 0 else "nz")
        f.tag = key in drop
        m = faces.get(key)
        if m is not None:
            if m not in mats:
                mats.append(m)
            f.material_index = mats.index(m)
    bmesh.ops.delete(bm, geom=[f for f in bm.faces if f.tag], context="FACES_ONLY")
    return bm_object(name, bm, mats, bevel)


def cylinders(name, specs, mat, segments=10):
    """Many vertical cylinders in one mesh: specs = [(x, y, z0, z1, r), ...] building coords."""
    bm = bmesh.new()
    for x, y, z0, z1, r in specs:
        bmesh.ops.create_cone(bm, cap_ends=True, segments=segments, radius1=r, radius2=r,
                              depth=z1 - z0, matrix=Matrix.Translation(P(x, y, (z0 + z1) / 2)))
    ob = bm_object(name, bm, [mat])
    for p in ob.data.polygons:
        p.use_smooth = len(p.vertices) == 4
    return ob


def tube(name, pts, radius, mat, res=2):
    """A round tube along a polyline (building coords), via a bevelled curve."""
    cu = bpy.data.curves.new(name, "CURVE")
    cu.dimensions = "3D"
    cu.bevel_depth = radius
    cu.bevel_resolution = res
    cu.use_fill_caps = True
    sp = cu.splines.new("POLY")
    sp.points.add(len(pts) - 1)
    for p, (x, y, z) in zip(sp.points, pts):
        p.co = (*P(x, y, z), 1.0)
    tmp = link(bpy.data.objects.new(name + "_curve", cu))
    dg = bpy.context.evaluated_depsgraph_get()
    me = bpy.data.meshes.new_from_object(tmp.evaluated_get(dg))
    bpy.data.objects.remove(tmp)
    bpy.data.curves.remove(cu)
    me.materials.append(mat)
    for p in me.polygons:
        p.use_smooth = True
    ob = link(bpy.data.objects.new(name, me))
    ob["bevel"] = False
    return ob


def arc(cx, cy, r, a0, a1, n=10):
    return [(cx + r * math.cos(math.radians(a0 + (a1 - a0) * i / n)),
             cy + r * math.sin(math.radians(a0 + (a1 - a0) * i / n))) for i in range(n + 1)]


def corridor_path(inset):
    """Front edge of the slab, inset, with both corners rounded: west wall -> east wall."""
    pts = [(inset, 0.0), (inset, -CORR_D + R)]
    pts += arc(R, -CORR_D + R, R - inset, 180, 270)[1:]
    pts += arc(MAIN_W - R, -CORR_D + R, R - inset, 270, 360)
    pts += [(MAIN_W - inset, 0.0)]
    return pts


def footprint(inset=0.0):
    """Slab outline: rooms plus the corridor with rounded front corners."""
    return [(inset, ROOM_D - inset)] + corridor_path(inset) + [(MAIN_W - inset, ROOM_D - inset)]


def extrude(name, pts, z0, z1, top_mat, side_mat, bevel=True, drop_top=False, drop_bottom=False):
    bm = bmesh.new()
    lo = [bm.verts.new(P(x, y, z0)) for x, y in pts]
    hi = [bm.verts.new(P(x, y, z1)) for x, y in pts]
    bot = bm.faces.new(list(reversed(lo)))
    top = bm.faces.new(hi)
    n = len(pts)
    sides = [bm.faces.new((lo[i], lo[(i + 1) % n], hi[(i + 1) % n], hi[i])) for i in range(n)]
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    for f in sides:
        f.material_index = 1
    bot.material_index = top.material_index = 0
    gone = ([top] if drop_top else []) + ([bot] if drop_bottom else [])
    if gone:
        bmesh.ops.delete(bm, geom=gone, context="FACES_ONLY")
    return bm_object(name, bm, [top_mat, side_mat], bevel)


def ring(name, outer, inner, z0, z1, mat):
    """A wall following an outline: outer and inner loops with the same point count."""
    bm = bmesh.new()
    n = len(outer)
    lo_o = [bm.verts.new(P(x, y, z0)) for x, y in outer]
    hi_o = [bm.verts.new(P(x, y, z1)) for x, y in outer]
    lo_i = [bm.verts.new(P(x, y, z0)) for x, y in inner]
    hi_i = [bm.verts.new(P(x, y, z1)) for x, y in inner]
    for i in range(n):
        j = (i + 1) % n
        bm.faces.new((lo_o[i], lo_o[j], hi_o[j], hi_o[i]))
        bm.faces.new((lo_i[j], lo_i[i], hi_i[i], hi_i[j]))
        bm.faces.new((hi_o[i], hi_o[j], hi_i[j], hi_i[i]))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    return bm_object(name, bm, [mat], True)


def resample(pts, spacing):
    """Points every `spacing` metres along a 2D polyline."""
    out, carry = [], 0.0
    for (x0, y0), (x1, y1) in zip(pts, pts[1:]):
        seg = math.hypot(x1 - x0, y1 - y0)
        d = carry
        while d <= seg:
            t = d / seg if seg else 0
            out.append((x0 + (x1 - x0) * t, y0 + (y1 - y0) * t))
            d += spacing
        carry = d - seg
    return out


def split_at_gap(pts, gx0, gx1):
    """Cut a front-straight gap (x in [gx0, gx1]) out of a corridor path."""
    y = pts[len(pts) // 2][1]  # x rises monotonically along the path; the gap is on the front straight
    i = next(i for i, p in enumerate(pts) if p[0] >= gx0)
    west = pts[:i] + [(gx0, y)]
    east = [(gx1, y)] + [p for p in pts[i:] if p[0] > gx1]
    return [west, east]


def flat_polygon(name, pts, y, mat):
    bm = bmesh.new()
    f = bm.faces.new([bm.verts.new(P(x, y, z)) for x, z in pts])
    if f.normal.y > 0:
        f.normal_flip()
    return bm_object(name, bm, [mat])


# ----------------------------------------------------------------- openings
def front_wall_pieces(prefix, x0, f, y0, y1, low, high, bevel=True):
    """Wall around one bay's door and window, split into yellow below and white above."""
    t, c = top_z(f), ceil_z(f)
    zb = t + BAND
    d0, d1 = x0 + 0.6, x0 + 1.6
    w0, w1 = x0 + 2.05, x0 + 3.35
    rects = [(x0, d0, t, c), (d1, w0, t, c), (w1, x0 + BAY, t, c),
             (d0, d1, t + HEAD, c), (w0, w1, t + HEAD, c), (w0, w1, t, t + SILL)]
    parts = []
    for i, (a, b, z0, z1) in enumerate(rects):
        lo_drop = ("py", "nz") if z0 == t else ("py",)
        if z0 < zb:
            parts.append(box(f"{prefix}_{i}l", a, b, y0, y1, z0, min(z1, zb), low, bevel, drop=lo_drop + (("pz",) if z1 > zb else ())))
        if z1 > zb:
            parts.append(box(f"{prefix}_{i}h", a, b, y0, y1, max(z0, zb), z1, high, bevel,
                             drop=("py", "pz") + (("nz",) if z0 < zb else ())))
    return parts


def window(prefix, x0, x1, z0, z1, M, glass, mullions=True, y=0.04):
    """Frame inside an opening, glass pane, and a centre mullion with a transom."""
    fw, d = 0.06, 0.1
    parts = [box(f"{prefix}_fl", x0, x0 + fw, y, y + d, z0, z1, M["frame"], False),
             box(f"{prefix}_fr", x1 - fw, x1, y, y + d, z0, z1, M["frame"], False),
             box(f"{prefix}_fb", x0, x1, y, y + d, z0, z0 + fw, M["frame"], False),
             box(f"{prefix}_ft", x0, x1, y, y + d, z1 - fw, z1, M["frame"], False)]
    if mullions:
        xm, zt = (x0 + x1) / 2, z0 + (z1 - z0) * 0.72
        parts += [box(f"{prefix}_mv", xm - 0.025, xm + 0.025, y, y + d, z0, zt, M["frame"], False),
                  box(f"{prefix}_mh", x0, x1, y, y + d, zt - 0.025, zt + 0.025, M["frame"], False)]
    if glass is not None:
        parts.append(box(f"{prefix}_g", x0 + fw, x1 - fw, y + 0.05, y + 0.06, z0 + fw, z1 - fw, glass, False))
    return parts


def door(prefix, x0, x1, z0, z1, M, leaf=True):
    fw = 0.07
    parts = [box(f"{prefix}_fl", x0, x0 + fw, 0.0, WALL_T, z0, z1, M["frame"], False),
             box(f"{prefix}_fr", x1 - fw, x1, 0.0, WALL_T, z0, z1, M["frame"], False),
             box(f"{prefix}_ft", x0, x1, 0.0, WALL_T, z1 - fw, z1, M["frame"], False)]
    if leaf:
        parts.append(box(f"{prefix}_leaf", x0 + fw, x1 - fw, 0.08, 0.12, z0, z1 - fw, M["door"], False))
    return parts


# ------------------------------------------------------------------ assembly
def merge(name, parts, origin):
    vl = bpy.context.view_layer
    for p in parts:
        if p.get("bevel"):
            mod = p.modifiers.new("bevel", "BEVEL")
            mod.width, mod.segments = 0.012, 2
            mod.limit_method = "ANGLE"
            mod.angle_limit = math.radians(40)
            mod.harden_normals = True
            vl.objects.active = p
            bpy.ops.object.modifier_apply(modifier="bevel")
    bpy.ops.object.select_all(action="DESELECT")
    for p in parts:
        p.select_set(True)
    vl.objects.active = parts[0]
    bpy.ops.object.join()
    ob = vl.objects.active
    ob.name = ob.data.name = name
    o = Vector(origin)
    ob.data.transform(Matrix.Translation(-o))
    ob.location = o
    return ob


def parent_to(child, parent):
    """Parent with an identity inverse so the child's location is relative to the parent."""
    world = child.location.copy()
    child.parent = parent
    child.location = world - parent.location


def build_floor(f, M):
    t, c, z = top_z(f), ceil_z(f), base_z(f)
    k_int = INTERIOR_BAY[f]
    ix0, ix1 = (k_int - 1) * BAY, k_int * BAY
    parts = []

    if f == 0:
        # Raised base faced with concrete blocks, and steps up at the west end.
        parts.append(extrude("plinth", footprint(), 0.0, PLINTH, M["slab"], M["blocks"], drop_top=True, drop_bottom=True))
        n_steps = 8
        rise, run = (PLINTH + SLAB) / n_steps, 0.28
        for i in range(n_steps):
            y0 = -CORR_D - (n_steps - i) * run
            parts.append(box(f"step{i}", STAIR_X[0], STAIR_X[1], y0, y0 + run + 0.01, 0, rise * (i + 1), M["concrete"]))
    sz = PLINTH if f == 0 else z
    # Slab: the corridor strip is fully visible; under the rooms only its edges show.
    corridor = [(0.0, WALL_T)] + corridor_path(0.0) + [(MAIN_W, WALL_T)]
    parts.append(extrude(f"slab{f}", corridor, sz, sz + SLAB, M["slab"], M["fascia"], drop_bottom=(f == 0)))
    parts.append(box(f"slabrooms{f}", 0.0, MAIN_W, WALL_T, ROOM_D, sz, sz + SLAB, M["fascia"], drop=("nz", "pz", "ny")))

    # Front wall around the openings, then the room masses behind it.
    for k in range(1, BAYS + 1):
        parts += front_wall_pieces(f"fw{f}_{k}", (k - 1) * BAY, f, 0.0, WALL_T, M["wall"], M["wall_white"])
    for a, b in ((0.0, ix0), (ix1, MAIN_W)):
        if b - a > 0.01:
            parts.append(box(f"mass{f}_{a:.0f}", a, b, WALL_T, ROOM_D, t, c, M["wall"], drop=("ny", "nz", "pz")
                             + (("nx",) if a > 0 else ()) + (("px",) if b < MAIN_W else ())))
    parts.append(box(f"backwall{f}", ix0, ix1, ROOM_D - 0.2, ROOM_D, t, c, M["wall"], drop=("ny", "nz", "pz", "nx", "px")))
    if k_int == 1:
        parts.append(box(f"westwall{f}", 0.0, 0.2, WALL_T, ROOM_D - 0.2, t, c, M["wall"], drop=("px", "nz", "pz", "ny", "py")))

    # Doors and windows: brown frames, glass with a mullion and transom.
    for k in range(1, BAYS + 1):
        x0 = (k - 1) * BAY
        parts += door(f"door{f}_{k}", x0 + 0.6, x0 + 1.6, t, t + HEAD, M, leaf=(k != k_int))
        photo = k in PHOTO_BAYS[f]
        glass = None if photo else (M["glass_clear"] if k == k_int else M["glass"])
        parts += window(f"win{f}_{k}", x0 + 2.05, x0 + 3.35, t + SILL, t + HEAD, M, glass, mullions=not photo)

    # Thin white pipe columns along the slab edge, and steel railings on every corridor.
    col_r = 0.05
    cols = [(k * BAY, -CORR_D + 0.15) for k in range(1, BAYS)]
    for cx, a in ((R, 225), (MAIN_W - R, 315)):
        cols.append((cx + (R - 0.15) * math.cos(math.radians(a)), -CORR_D + R + (R - 0.15) * math.sin(math.radians(a))))
    parts.append(cylinders(f"cols{f}", [(x, y, t, c, col_r) for x, y in cols], M["slab"]))

    path = corridor_path(0.08)
    runs = split_at_gap(path, *STAIR_X) if f == 0 else [path]
    bars = []
    for i, run in enumerate(runs):
        parts.append(tube(f"toprail{f}_{i}", [(x, y, t + RAIL_H) for x, y in run], 0.025, M["steel"]))
        parts.append(tube(f"botrail{f}_{i}", [(x, y, t + 0.1) for x, y in run], 0.015, M["steel"]))
        bars += [(x, y, t, t + RAIL_H, 0.009) for x, y in resample(run, BAR_PITCH)]
    parts.append(cylinders(f"bars{f}", bars, M["steel"], segments=6))

    floor_ob = merge(f"floor_{f}", parts, P(MAIN_W / 2, 0, z))

    # Photo slots: separate panes in the window openings, children of the floor.
    for slot, k in zip("ab", PHOTO_BAYS[f]):
        cx, zz = (k - 1) * BAY + 2.7, t + SILL + 0.075
        pane = photo_pane(f"win_f{f}_{slot}", cx, zz, 1.2, 1.6, 0.10, M["photo_slot"])
        parent_to(pane, floor_ob)

    interior = build_interior(f, ix0, ix1, M)
    parent_to(interior, floor_ob)
    return floor_ob, interior


def photo_pane(name, cx, z0, w, h, y, mat):
    """Portrait 3:4 quad facing the front with 0..1 UVs, so the site can map a photo onto it."""
    x0, x1 = cx - w / 2, cx + w / 2
    me = bpy.data.meshes.new(name)
    me.from_pydata([P(x0, y, z0) - P(cx, y, z0), P(x1, y, z0) - P(cx, y, z0),
                    P(x1, y, z0 + h) - P(cx, y, z0), P(x0, y, z0 + h) - P(cx, y, z0)], [], [(0, 1, 2, 3)])
    uv = me.uv_layers.new(name="UVMap")
    for loop, co in zip(uv.data, [(0, 0), (1, 0), (1, 1), (0, 1)]):
        loop.uv = co
    me.update()
    assert me.polygons[0].normal.y < 0
    me.materials.append(mat)
    ob = link(bpy.data.objects.new(name, me))
    ob.location = P(cx, y, z0)
    return ob


# ----------------------------------------------------------------- interiors
def build_interior(f, ix0, ix1, M):
    """One small illustrative classroom behind the bay's open door."""
    t, c = top_z(f), ceil_z(f)
    x0 = ix0 + (0.2 if ix0 == 0 else 0.0) + 0.005
    x1 = ix1 - 0.005
    y0, y1 = WALL_T + 0.005, ROOM_D - 0.205
    cx = (x0 + x1) / 2
    p = []
    # Room shell: floor, ceiling, side and back walls, inside face of the front wall.
    p.append(box("ifloor", x0, x1, y0, y1, t, t + 0.01, M["int_floor"], False))
    p.append(box("iceil", x0, x1, y0, y1, c - 0.01, c, M["int_ceiling"], False))
    p.append(box("iwall_w", x0, x0 + 0.01, y0, y1, t, c, M["int_wall"], False))
    p.append(box("iwall_e", x1 - 0.01, x1, y0, y1, t, c, M["int_wall"], False))
    p.append(box("iwall_b", x0, x1, y1 - 0.01, y1, t, c, M["int_wall"], False))
    p += front_wall_pieces("iwall_f", ix0, f, WALL_T, WALL_T + 0.01, M["int_wall"], M["int_wall"], bevel=False)
    # The door stands open, swung back against the inside wall.
    p.append(box("ileaf", ix0 + 0.62, ix0 + 0.66, WALL_T + 0.02, WALL_T + 0.98, t + 0.01, t + HEAD - 0.07, M["door"], False))

    def desk(name, x, y, w, d, h):
        return [box(name + "_top", x - w / 2, x + w / 2, y - d / 2, y + d / 2, t + h - 0.04, t + h, M["wood"], False),
                box(name + "_l", x - w / 2, x - w / 2 + 0.04, y - d / 2, y + d / 2, t, t + h - 0.04, M["wood"], False),
                box(name + "_r", x + w / 2 - 0.04, x + w / 2, y - d / 2, y + d / 2, t, t + h - 0.04, M["wood"], False)]

    def blackboard():
        return [box("board", cx - 1.2, cx + 1.2, y1 - 0.03, y1 - 0.01, t + 0.85, t + 2.05, M["board"], False),
                box("board_frame", cx - 1.25, cx + 1.25, y1 - 0.035, y1 - 0.01, t + 0.80, t + 0.85, M["wood"], False)]

    if f == 0:  # nursery: colourful floor mats, low tables, small stools
        mats = [M["mat_red"], M["mat_yellow"], M["mat_green"], M["mat_blue"]]
        for i in range(3):
            for j in range(3):
                mx, my = x0 + 0.9 + i * 0.85, 2.2 + j * 0.85
                p.append(box(f"mat{i}{j}", mx - 0.4, mx + 0.4, my - 0.4, my + 0.4, t + 0.01, t + 0.025, mats[(i + j) % 4], False))
        for i, (tx, ty) in enumerate(((cx - 0.7, 1.3), (cx + 0.8, 4.8))):
            p += desk(f"lowtable{i}", tx, ty, 1.0, 0.6, 0.45)
        stools = [(cx - 0.7 + dx, 1.3 + dy, t, t + 0.28, 0.14) for dx in (-0.35, 0.35) for dy in (-0.5, 0.5)]
        stools += [(cx + 0.8 + dx, 4.8 + dy, t, t + 0.28, 0.14) for dx in (-0.35, 0.35) for dy in (-0.5, 0.5)]
        p.append(cylinders("stools", stools, M["mat_yellow"], 12))
    elif f in (1, 2):  # primary and middle: bench-desks facing a blackboard
        p += blackboard()
        for i, dx in enumerate((-0.85, 0.85)):
            for j, dy in enumerate((2.0, 3.1, 4.2)):
                p += desk(f"desk{i}{j}", cx + dx, dy, 1.2, 0.42, 0.72)
                p.append(box(f"bench{i}{j}", cx + dx - 0.6, cx + dx + 0.6, dy - 0.55, dy - 0.3, t + 0.40, t + 0.44, M["wood"], False))
                p.append(box(f"benchleg{i}{j}", cx + dx - 0.55, cx + dx + 0.55, dy - 0.45, dy - 0.4, t, t + 0.40, M["wood"], False))
        if f == 2:  # middle school: a bookshelf on the side wall
            sx = x1 - 0.36
            p.append(box("shelf_back", sx, x1 - 0.01, 1.4, 3.0, t, t + 1.9, M["wood"], False))
            books = [M["book_a"], M["book_b"], M["book_c"], M["book_d"]]
            for s in range(5):
                zs = t + 0.02 + s * 0.38
                p.append(box(f"shelf{s}", sx, x1 - 0.01, 1.4, 3.0, zs, zs + 0.03, M["wood"], False))
                if s < 4:
                    yb = 1.45
                    rng = np.random.default_rng(10 + s)
                    while yb < 2.9:
                        w = rng.uniform(0.03, 0.07)
                        h = rng.uniform(0.2, 0.3)
                        p.append(box(f"book{s}_{yb:.2f}", sx + 0.04, sx + 0.3, yb, yb + w, zs + 0.03, zs + 0.03 + h, books[int(rng.integers(4))], False))
                        yb += w + 0.005
    else:  # Class 10: single desks in exam-style rows
        p += blackboard()
        for i, dx in enumerate((-1.1, 0.0, 1.1)):
            for j, dy in enumerate((1.6, 2.6, 3.6, 4.6)):
                p += desk(f"xdesk{i}{j}", cx + dx, dy, 0.6, 0.42, 0.72)
                p.append(box(f"chair{i}{j}", cx + dx - 0.2, cx + dx + 0.2, dy - 0.62, dy - 0.24, t + 0.42, t + 0.45, M["wood"], False))
                p.append(box(f"chairback{i}{j}", cx + dx - 0.2, cx + dx + 0.2, dy - 0.64, dy - 0.61, t + 0.45, t + 0.85, M["wood"], False))
    if f >= 1:
        p += desk("teacher", x1 - 0.8, y1 - 1.0, 1.1, 0.55, 0.76)

    ob = merge(f"interior_f{f}", p, P(cx, (y0 + y1) / 2, base_z(f)))
    ob["illustrative"] = True
    ob["label"] = INTERIOR_LABEL[f]
    return ob


# ------------------------------------------------------------------- the rest
def build_roof(M):
    rz = PLINTH + FLOORS * H
    rtop = rz + SLAB
    parts = [extrude("roofslab", footprint(), rz, rtop, M["slab"], M["fascia"]),
             ring("parapet", footprint(0.0), footprint(0.15), rtop, rtop + PARAPET_H, M["slab"]),
             cylinders("tanks", [(MAIN_W - 4.6, ROOM_D - 1.4, rtop, rtop + 1.3, 0.55),
                                 (MAIN_W - 3.0, ROOM_D - 1.4, rtop, rtop + 1.3, 0.55)], M["tank"], 32),
             cylinders("flagpole", [(1.6, -CORR_D + 1.2, rtop, rtop + 4.5, 0.03)], M["slab"], 12)]
    # Nepal flag: double pennant, crimson with a blue border.
    fw, fh = 1.0, 1.22
    outline = [(0, 0), (fw, 0), (0.33 * fw, 0.42 * fh), (0.92 * fw, 0.42 * fh), (0, fh)]
    inner = [(0.06, 0.05), (0.85, 0.05), (0.23, 0.45 * fh), (0.80, 0.45 * fh), (0.06, fh - 0.12)]
    fx, fz, fy = 1.63, rtop + 4.5 - fh, -CORR_D + 1.2
    parts.append(flat_polygon("flag_border", [(fx + x, fz + z) for x, z in outline], fy, M["fascia"]))
    parts.append(flat_polygon("flag_field", [(fx + x, fz + z) for x, z in inner], fy - 0.005, M["flag_red"]))
    back = flat_polygon("flag_field_back", [(fx + x, fz + z) for x, z in inner], fy + 0.005, M["flag_red"])
    back.data.flip_normals()
    parts.append(back)
    return merge("roof", parts, P(MAIN_W / 2, 0, rz))


def build_tower(M):
    tx0, tx1 = MAIN_W, MAIN_W + TOWER_W
    t_top = PLINTH + FLOORS * H + SLAB + PARAPET_H
    parts = [box("towerbody", tx0, tx1, 0.0, ROOM_D, PLINTH, t_top, M["tower"], drop=("nz", "nx")),
             box("towerbase", tx0, tx1, 0.0, ROOM_D, 0, PLINTH, M["blocks"], drop=("nz", "pz", "nx"))]
    for f in range(FLOORS):
        wz = top_z(f) + 0.8
        xm = tx0 + TOWER_W / 2
        parts.append(box(f"twin_front_rev{f}", xm - 0.3, xm + 0.3, -0.02, 0.02, wz - 0.02, wz + 1.62, M["room_dark"], False))
        parts += window(f"twf{f}", xm - 0.28, xm + 0.28, wz, wz + 1.6, M, M["glass"], mullions=False, y=-0.12)
        parts.append(box(f"twin_east{f}", tx1 - 0.02, tx1 + 0.06, 2.75, 3.25, wz, wz + 1.6, M["glass"], False))
        parts.append(box(f"twin_east_fr{f}", tx1 + 0.02, tx1 + 0.08, 2.7, 3.3, wz - 0.05, wz, M["frame"], False))
    return merge("tower", parts, P(tx0 + TOWER_W / 2, ROOM_D / 2, 0))


def build_gate(M):
    gx, gy = GATE_X, GATE_Y
    parts = [box("pillar_w", gx - 3.3, gx - 2.7, gy - 0.3, gy + 0.3, 0, 2.6, M["blocks"]),
             box("pillar_e", gx + 2.7, gx + 3.3, gy - 0.3, gy + 0.3, 0, 2.6, M["blocks"]),
             box("beam", gx - 3.5, gx + 3.5, gy - 0.2, gy + 0.2, 2.6, 2.95, M["fascia"])]
    return merge("gate", parts, P(gx, gy, 0))


YARD = (-7.0, MAIN_W + TOWER_W + 7.0, GATE_Y, ROOM_D + 6.0)


def build_setting(M):
    x0, x1, y0, y1 = YARD
    objs = {}
    # The yard is one quad with planar UVs: its texture (path, grass) and its lightmap both span the whole yard.
    bm = bmesh.new()
    quad = bm.faces.new([bm.verts.new(P(x, y, 0.0)) for x, y in ((x0, y0), (x1, y0), (x1, y1), (x0, y1))])
    for name in ("UVMap", "lightmap"):
        layer = bm.loops.layers.uv.new(name)
        for lp, uv in zip(quad.loops, ((0, 0), (1, 0), (1, 1), (0, 1))):
            lp[layer].uv = uv
    yard = bm_object("yard", bm, [M["yard"]])
    o = P((x0 + x1) / 2, (y0 + y1) / 2, 0)
    yard.data.transform(Matrix.Translation(-o))
    yard.location = o
    objs["yard"] = yard
    # Compound wall of concrete blocks, open at the gate.
    t, h = 0.25, 1.6
    walls = [box("cw_back", x0, x1, y1 - t, y1, 0, h, M["blocks"]),
             box("cw_west", x0, x0 + t, y0, y1, 0, h, M["blocks"]),
             box("cw_east", x1 - t, x1, y0, y1, 0, h, M["blocks"]),
             box("cw_front_w", x0, GATE_X - 3.3, y0 - t / 2, y0 + t / 2, 0, h, M["blocks"]),
             box("cw_front_e", GATE_X + 3.3, x1, y0 - t / 2, y0 + t / 2, 0, h, M["blocks"])]
    objs["compound_wall"] = merge("compound_wall", walls, P((x0 + x1) / 2, (y0 + y1) / 2, 0))

    # Stylized trees: canopies of clustered leaf blobs in several greens (darker underneath), and shrubs.
    rng = np.random.default_rng(21)
    light = [M["leaf_d"], M["leaf_b"], M["leaf_a"]]
    dark = [M["leaf_a"], M["leaf_c"], M["leaf_e"]]
    tparts = []

    def canopy(name, cx, cy, cz, rx, rz, blobs, rmin, rmax):
        bm = bmesh.new()
        mats = list(dict.fromkeys(light + dark))
        for j in range(blobs):
            # points spread through an ellipsoid, biased to its surface so the cluster reads as one crown
            d = Vector(rng.normal(0, 1, 3)).normalized() * rng.uniform(0.55, 1.0)
            c = Vector((cx + OX + d.x * rx, cy + OY + d.y * rx, cz + d.z * rz))
            r = rng.uniform(rmin, rmax)
            res = bmesh.ops.create_icosphere(bm, subdivisions=2, radius=r, matrix=Matrix.Translation(c))
            pool = dark if d.z < -0.15 else light
            idx = mats.index(pool[int(rng.integers(len(pool)))])
            for f in {f for v in res["verts"] for f in v.link_faces}:
                f.material_index = idx
        for v in bm.verts:
            v.co += Vector(rng.normal(0, rmin * 0.08, 3))
        ob = bm_object(name, bm, mats)
        for poly in ob.data.polygons:
            poly.use_smooth = True
        return ob

    spots = [(-4.0, -8.5, 7.0), (MAIN_W + TOWER_W + 4.0, -9.0, 8.0), (-4.5, 9.0, 8.5), (MAIN_W + TOWER_W + 3.5, 9.5, 7.5),
             (-16.0, -3.0, 9.0), (MAIN_W + 16.0, 2.0, 10.0), (4.0, 19.0, 9.5), (21.0, 21.0, 8.0), (-12.0, 14.0, 7.5)]
    for i, (tx, ty, th) in enumerate(spots):
        tparts.append(cylinders(f"trunk{i}", [(tx, ty, 0, th * 0.6, 0.15)], M["trunk"], 8))
        tparts.append(canopy(f"canopy{i}", tx, ty, th * 0.7, th * 0.3, th * 0.22, int(rng.integers(10, 15)), th * 0.11, th * 0.17))
    shrubs = [(-6.0, -11.5), (-6.2, -4.0), (-6.0, 4.0), (MAIN_W + TOWER_W + 6.1, -12.0), (MAIN_W + TOWER_W + 6.0, 1.0),
              (GATE_X - 4.6, GATE_Y + 0.9), (GATE_X + 4.8, GATE_Y + 0.9), (STAIR_X[0] - 1.1, -CORR_D - 1.6)]
    for i, (sx, sy) in enumerate(shrubs):
        tparts.append(canopy(f"shrub{i}", sx, sy, 0.45, 0.55, 0.32, 5, 0.3, 0.45))
    objs["trees"] = merge("trees", tparts, P((x0 + x1) / 2, (y0 + y1) / 2, 0))

    # Ground beyond the compound, fading to transparent at the rim (the site's fog takes over).
    rad, seg = 600.0, 96
    bm = bmesh.new()
    centre = bm.verts.new(P(MAIN_W / 2, 0, -0.06))
    rim = [bm.verts.new(P(MAIN_W / 2 + rad * math.cos(2 * math.pi * i / seg), rad * math.sin(2 * math.pi * i / seg), -0.06)) for i in range(seg)]
    faces = [bm.faces.new((centre, rim[i], rim[(i + 1) % seg])) for i in range(seg)]
    uv0 = bm.loops.layers.uv.new("UVMap")
    uv1 = bm.loops.layers.uv.new("lightmap")
    c0 = centre.co
    for fc in faces:
        for lp in fc.loops:
            u = (lp.vert.co.x - c0.x) / (2 * rad) + 0.5
            v = (lp.vert.co.y - c0.y) / (2 * rad) + 0.5
            lp[uv0].uv = lp[uv1].uv = (u, v)
    g = bm_object("ground", bm, [M["ground"]])
    g.location = (0, 0, 0)
    objs["ground"] = g

    # Layered hills behind (the Mahabharat range above Hetauda; illustrative shape): four ridges,
    # each farther, taller and paler, so they read as receding into haze.
    hparts = []
    ridges = ((1300, 90, 220, "hill_1", 31), (1900, 160, 360, "hill_2", 32), (2700, 260, 520, "hill_3", 33), (3700, 380, 720, "hill_4", 34))
    for k, (radius, hmin, hmax, mat, seed) in enumerate(ridges):
        n = 220
        prof = fbm(512, 2.5, 3.2, seed)[0][:n]
        prof = (prof - prof.min()) / (prof.max() - prof.min())
        bm = bmesh.new()
        lo, hi = [], []
        for i in range(n):
            a = math.radians(-40 + 260 * i / (n - 1))
            x, y = MAIN_W / 2 + radius * math.cos(a), radius * math.sin(a)
            lo.append(bm.verts.new(P(x, y, -60)))
            hi.append(bm.verts.new(P(x, y, hmin + (hmax - hmin) * prof[i])))
        for i in range(n - 1):
            bm.faces.new((lo[i], lo[i + 1], hi[i + 1], hi[i]))
        bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
        for fc in bm.faces:  # face the building
            if fc.normal.dot(P(MAIN_W / 2, 0, 0) - fc.calc_center_median()) < 0:
                fc.normal_flip()
        hparts.append(bm_object(f"ridge{k}", bm, [M[mat]]))
    objs["hills"] = merge("hills", hparts, P(MAIN_W / 2, 0, 0))
    objs["hills"]["illustrative"] = True
    objs["hills"]["label"] = "Hill silhouette (illustrative shape, not a survey of the real skyline)"
    return objs


# ------------------------------------------------------------------- students
# About 20 small stylized students (illustrative, not real people) in the uniforms seen in the photos:
# teal shirts, and white shirts with a navy tie, both with navy trousers or skirts. One low-poly set:
# three mesh variants shared by every instance, exported with EXT_mesh_gpu_instancing.
STUDENTS = [  # (x, y, floor or None for the yard, facing in degrees from the front)
    (5.0, None, 1, 10), (8.6, None, 1, -15), (13.0, None, 1, 5), (17.6, None, 1, 20),
    (3.1, None, 2, -10), (10.2, None, 2, 15), (12.0, None, 2, -25), (20.2, None, 2, 0),
    (6.3, None, 3, 12), (12.1, None, 3, -8), (15.6, None, 3, 18),
    (8.0, None, 0, -5), (16.4, None, 0, 25),
    (4.0, -6.0, None, 70), (4.7, -6.3, None, -110), (8.5, -9.0, None, 100), (9.2, -9.2, None, -80),
    (14.5, -7.5, None, 30), (15.3, -7.1, None, -150), (18.0, -10.0, None, -20),
]


def student_mesh(name, shirt, skirt=False, tie=False):
    """One figure about 1.45 m tall, feet at the origin, facing -Y. Colours are vertex colours with a soft
    top-to-bottom shading baked in, so the site can draw it unlit."""
    bm = bmesh.new()
    part = bm.verts.layers.int.new("part")  # which colour each vertex takes, survives deletions
    palette = []

    def tag(verts, col):
        palette.append(col)
        for v in verts:
            v[part] = len(palette) - 1

    def cyl(z0, z1, r0, r1, col, x=0.0, y=0.0, seg=8):
        res = bmesh.ops.create_cone(bm, cap_ends=True, segments=seg, radius1=r0, radius2=r1, depth=z1 - z0,
                                    matrix=Matrix.Translation((x, y, (z0 + z1) / 2)))
        tag(res["verts"], col)

    def ball(z, r, col, y=0.0, cut=None):
        res = bmesh.ops.create_icosphere(bm, subdivisions=2, radius=r, matrix=Matrix.Translation((0, y, z)))
        tag(res["verts"], col)
        if cut is not None:  # hair: a cap that sits higher over the forehead (-Y) than at the back
            bmesh.ops.delete(bm, geom=[v for v in res["verts"] if v.co.z < cut - 0.45 * v.co.y], context="VERTS")

    for x in (-0.07, 0.07):
        cyl(0.0, 0.06, 0.06, 0.06, C["shoe"], x=x, y=-0.02, seg=6)
    if skirt:
        for x in (-0.06, 0.06):
            cyl(0.06, 0.36, 0.045, 0.05, C["skin"], x=x, seg=6)
        cyl(0.36, 0.68, 0.22, 0.15, C["uni_navy"])
    else:
        for x in (-0.07, 0.07):
            cyl(0.06, 0.68, 0.06, 0.075, C["uni_navy"], x=x, seg=6)
    cyl(0.66, 1.12, 0.15, 0.18, shirt)
    for x in (-0.205, 0.205):
        cyl(0.94, 1.1, 0.05, 0.05, shirt, x=x, seg=6)
        cyl(0.72, 0.94, 0.04, 0.045, C["skin"], x=x, seg=6)
    cyl(1.1, 1.17, 0.05, 0.05, C["skin"], seg=6)
    if tie:
        cyl(0.86, 1.1, 0.02, 0.025, C["uni_navy"], y=-0.17, seg=4)
    ball(1.28, 0.12, C["skin"])
    ball(1.295, 0.13, C["hair"], y=0.012, cut=1.255)
    me = bpy.data.meshes.new(name)
    bm.verts.index_update()
    colours = {v.index: palette[v[part]] for v in bm.verts}
    bm.to_mesh(me)
    bm.free()
    attr = me.color_attributes.new("Col", "BYTE_COLOR", "CORNER")
    vals = np.empty((len(me.loops), 4), np.float32)
    for i, lp in enumerate(me.loops):
        z = me.vertices[lp.vertex_index].co.z
        shade = 0.8 + 0.2 * min(z / 1.4, 1.0)
        vals[i] = [*(c * shade for c in rgb(colours[lp.vertex_index])), 1.0]
    attr.data.foreach_set("color_srgb", vals.ravel())
    for p in me.polygons:
        p.use_smooth = True
    return me


def build_students():
    m = bpy.data.materials.new("student")
    m.use_nodes = True
    nt = m.node_tree
    vc = nt.nodes.new("ShaderNodeVertexColor")
    vc.layer_name = "Col"
    bsdf = nt.nodes["Principled BSDF"]
    nt.links.new(vc.outputs["Color"], bsdf.inputs["Base Color"])
    bsdf.inputs["Roughness"].default_value = 0.8
    variants = [student_mesh("student_teal", C["uni_teal"]), student_mesh("student_white", C["uni_white"], tie=True),
                student_mesh("student_white_skirt", C["uni_white"], skirt=True, tie=True)]
    for me in variants:
        me.materials.append(m)
    root = link(bpy.data.objects.new("students", None))
    root["illustrative"] = True
    root["label"] = "Students (illustrative figures in the school uniforms, not real people)"
    rng = np.random.default_rng(51)
    for i, (x, y, f, facing) in enumerate(STUDENTS):
        if f is not None:
            y, z = -CORR_D + 0.45, top_z(f)
        else:
            z = 0.0
        ob = link(bpy.data.objects.new(f"student_{i}", variants[i % 3]))
        ob.parent = root
        ob.location = P(x, y, z)
        ob.rotation_euler = (0, 0, math.radians(facing))
        sc = rng.uniform(0.92, 1.06)
        ob.scale = (sc, sc, sc)
    return root


# ------------------------------------------------------------------ lightmaps
LM_SIZE = {"floor_0": 2048, "floor_1": 2048, "floor_2": 2048, "floor_3": 2048, "yard": 2048,
           "interior_f0": 1024, "interior_f1": 1024, "interior_f2": 1024, "interior_f3": 1024,
           "roof": 1024, "tower": 1024, "compound_wall": 1024, "trees": 2048, "ground": 1024,
           "gate": 512, "hills": 512}

MOODS = {
    # Warm low sun from the front-right; hazy golden sky.
    "morning": dict(elev=11, azim=-35, sun=(1.0, 0.63, 0.36), sun_strength=5.0, angle=1.5,
                    sky_strength=0.22, still_sky_strength=1.15, dust=4.0, still_dust=1.2, air=1.2, interior=35.0,
                    background="#F2C9A0", fog="#E9C7A6",
                    sky_top="#8FB4D9", sky_mid="#F3E7D2", sky_horizon="#F4D3B0", figure_tint=(1.0, 0.88, 0.76)),
    # Soft high sun from the front-left, more sky light, softer shadows.
    "day": dict(elev=55, azim=-140, sun=(1.0, 0.97, 0.92), sun_strength=3.2, angle=8.0,
                sky_strength=0.45, still_sky_strength=1.1, dust=1.0, air=1.0, interior=25.0,
                background="#BFD3E6", fog="#D3DEE6",
                sky_top="#7FA9D6", sky_mid="#CFE0EE", sky_horizon="#E6EDF1", figure_tint=(0.96, 0.98, 1.0)),
}


def prepare_uvs(ob):
    """UV0: box mapping in metres for the tiling textures. UV1 'lightmap': unique, non-overlapping."""
    me = ob.data
    vl = bpy.context.view_layer
    bpy.ops.object.select_all(action="DESELECT")
    ob.select_set(True)
    vl.objects.active = ob
    if "UVMap" not in me.uv_layers:
        me.uv_layers.new(name="UVMap")
        me.uv_layers.active = me.uv_layers["UVMap"]
        bpy.ops.object.mode_set(mode="EDIT")
        bpy.ops.mesh.select_all(action="SELECT")
        bpy.ops.uv.cube_project(cube_size=2.0)
        bpy.ops.object.mode_set(mode="OBJECT")
    if "lightmap" not in me.uv_layers:
        lm = me.uv_layers.new(name="lightmap")
        me.uv_layers.active = lm
        bpy.ops.object.mode_set(mode="EDIT")
        bpy.ops.mesh.select_all(action="SELECT")
        size = LM_SIZE[ob.name] // (8 if QUICK else 1)
        bpy.ops.uv.smart_project(angle_limit=math.radians(66), island_margin=max(4.0 / size, 0.002), area_weight=0.0)
        bpy.ops.uv.select_all(action="SELECT")
        bpy.ops.uv.pack_islands(rotate=True, shape_method="CONCAVE", margin_method="FRACTION", margin=max(4.0 / size, 0.002))
        bpy.ops.object.mode_set(mode="OBJECT")
    me.uv_layers["UVMap"].active_render = True
    me.uv_layers.active = me.uv_layers["UVMap"]


def own_materials(ob):
    """Give each lightmapped object its own material copies, so each can carry its own lightmap."""
    for i, slot in enumerate(ob.material_slots):
        m = slot.material.copy()
        m.name = f"{slot.material.name}.{ob.name}"
        ob.material_slots[i].material = m


def set_mood(name, sun, interior_lights, still=False):
    s = MOODS[name]
    scene = bpy.context.scene
    world = scene.world
    nt = world.node_tree
    sky = nt.nodes.get("Sky") or nt.nodes.new("ShaderNodeTexSky")
    sky.name = "Sky"
    sky.sky_type = "NISHITA"
    sky.sun_disc = False
    sky.sun_elevation = math.radians(s["elev"])
    # Nishita measures the sun's rotation from +Y towards +X; our azimuth is from +X towards +Y.
    sky.sun_rotation = math.radians(90 - s["azim"])
    sky.altitude = 450
    sky.air_density = s["air"]
    # The bake uses a dustier sky for warmer fill light; the stills use a clearer one so the sky reads as sky.
    sky.dust_density = s.get("still_dust", s["dust"]) if still else s["dust"]
    bg = nt.nodes["Background"]
    nt.links.new(sky.outputs["Color"], bg.inputs["Color"])
    bg.inputs["Strength"].default_value = s["sky_strength"]
    # Stills: the camera sees a brighter sky; the light it casts stays at the baked strength.
    bg_cam = nt.nodes.get("BackgroundCamera") or nt.nodes.new("ShaderNodeBackground")
    bg_cam.name = "BackgroundCamera"
    nt.links.new(sky.outputs["Color"], bg_cam.inputs["Color"])
    bg_cam.inputs["Strength"].default_value = s["still_sky_strength"] if still else s["sky_strength"]
    # Stills show a soft two-colour gradient instead of the physical sky; the bake never sees it.
    tc = nt.nodes.get("SkyCoord") or nt.nodes.new("ShaderNodeTexCoord")
    tc.name = "SkyCoord"
    sep = nt.nodes.get("SkySep") or nt.nodes.new("ShaderNodeSeparateXYZ")
    sep.name = "SkySep"
    rng_ = nt.nodes.get("SkyRange") or nt.nodes.new("ShaderNodeMapRange")
    rng_.name = "SkyRange"
    rng_.inputs["From Min"].default_value, rng_.inputs["From Max"].default_value = -0.02, 0.5
    ramp = nt.nodes.get("SkyRamp") or nt.nodes.new("ShaderNodeValToRGB")
    ramp.name = "SkyRamp"
    els = ramp.color_ramp.elements
    if len(els) < 3:
        els.new(0.35)
    # three stops: going straight from warm horizon to blue top passes through grey
    els[0].color, els[1].color, els[2].color = lin(s["sky_horizon"]), lin(s["sky_mid"]), lin(s["sky_top"])
    nt.links.new(tc.outputs["Generated"], sep.inputs["Vector"])
    nt.links.new(sep.outputs["Z"], rng_.inputs["Value"])
    nt.links.new(rng_.outputs["Result"], ramp.inputs["Fac"])
    if still:
        nt.links.new(ramp.outputs["Color"], bg_cam.inputs["Color"])
        bg_cam.inputs["Strength"].default_value = s["still_sky_strength"]
    else:
        nt.links.new(sky.outputs["Color"], bg_cam.inputs["Color"])
    path = nt.nodes.get("LightPath") or nt.nodes.new("ShaderNodeLightPath")
    path.name = "LightPath"
    mix = nt.nodes.get("SkyMix") or nt.nodes.new("ShaderNodeMixShader")
    mix.name = "SkyMix"
    nt.links.new(path.outputs["Is Camera Ray"], mix.inputs["Fac"])
    nt.links.new(bg.outputs["Background"], mix.inputs[1])
    nt.links.new(bg_cam.outputs["Background"], mix.inputs[2])
    nt.links.new(mix.outputs["Shader"], nt.nodes["World Output"].inputs["Surface"])
    el, az = math.radians(s["elev"]), math.radians(s["azim"])
    to_sun = Vector((math.cos(el) * math.cos(az), math.cos(el) * math.sin(az), math.sin(el)))
    sun.rotation_euler = (-to_sun).to_track_quat("-Z", "Y").to_euler()
    sun.data.color = s["sun"]
    sun.data.energy = s["sun_strength"]
    sun.data.angle = math.radians(s["angle"])
    for lamp in interior_lights:
        lamp.data.energy = s["interior"]


def bake_lightmaps(objs, sun, interior_lights, tmp):
    scene = bpy.context.scene
    scene.render.engine = "CYCLES"
    scene.cycles.device = "CPU"
    scene.cycles.samples = 8 if QUICK else 40  # denoised afterwards
    scene.cycles.max_bounces = 4
    scene.cycles.diffuse_bounces = 3
    scene.render.bake.margin = 8
    scene.render.bake.margin_type = "EXTEND"
    scene.render.bake.use_pass_direct = True
    scene.render.bake.use_pass_indirect = True
    scene.render.bake.use_pass_color = False
    results = {}
    vl = bpy.context.view_layer
    for mood in MOODS:
        set_mood(mood, sun, interior_lights)
        for name, ob in objs.items():
            size = LM_SIZE[name] // (8 if QUICK else 1)
            img = bpy.data.images.new(f"lm_{mood}_{name}", size, size, alpha=False, float_buffer=True)
            nodes = []
            for slot in ob.material_slots:
                nt = slot.material.node_tree
                n = nt.nodes.new("ShaderNodeTexImage")
                n.image = img
                nt.nodes.active = n
                nodes.append((nt, n))
            ob.data.uv_layers.active = ob.data.uv_layers["lightmap"]
            bpy.ops.object.select_all(action="DESELECT")
            ob.select_set(True)
            vl.objects.active = ob
            bpy.ops.object.bake(type="DIFFUSE")
            ob.data.uv_layers.active = ob.data.uv_layers["UVMap"]
            for nt, n in nodes:
                nt.nodes.remove(n)
            arr = np.empty(size * size * 4, np.float32)
            img.pixels.foreach_get(arr)
            arr = arr.reshape(size, size, 4)[..., :3]
            results[(mood, name)] = denoise(arr, tmp) if not QUICK else arr
            bpy.data.images.remove(img)
            print(f"baked {mood} lightmap for {name} ({size}px)", flush=True)
    return results


def denoise(arr, tmp):
    """Run Open Image Denoise on a baked lightmap via the compositor; fall back to the raw bake."""
    scene = bpy.context.scene
    h, w, _ = arr.shape
    src = bpy.data.images.new("dn_src", w, h, alpha=False, float_buffer=True)
    rgba = np.concatenate([arr, np.ones((h, w, 1), np.float32)], axis=2)
    src.pixels.foreach_set(rgba.ravel())
    scene.use_nodes = True
    tree = scene.node_tree
    tree.nodes.clear()
    n_in = tree.nodes.new("CompositorNodeImage")
    n_in.image = src
    n_dn = tree.nodes.new("CompositorNodeDenoise")
    n_dn.use_hdr = True
    n_out = tree.nodes.new("CompositorNodeComposite")
    tree.links.new(n_in.outputs["Image"], n_dn.inputs["Image"])
    tree.links.new(n_dn.outputs["Image"], n_out.inputs["Image"])
    r = scene.render
    saved = (r.resolution_x, r.resolution_y, r.resolution_percentage, r.filepath)
    r.resolution_x, r.resolution_y, r.resolution_percentage = w, h, 100
    r.image_settings.file_format = "OPEN_EXR"
    r.image_settings.color_depth = "32"
    r.filepath = os.path.join(tmp, "dn.exr")
    try:
        bpy.ops.render.render(write_still=True)
        out = bpy.data.images.load(r.filepath, check_existing=False)
        px = np.empty(w * h * 4, np.float32)
        out.pixels.foreach_get(px)
        bpy.data.images.remove(out)
        result = px.reshape(h, w, 4)[..., :3]
        if not np.isfinite(result).all() or result.max() <= 0:
            raise RuntimeError("denoise produced no image")
    except Exception as e:  # keep the raw bake rather than fail the build
        print("denoise skipped:", e)
        result = arr
    finally:
        r.resolution_x, r.resolution_y, r.resolution_percentage, r.filepath = saved
        scene.use_nodes = False
        bpy.data.images.remove(src)
    return result


def write_lightmaps(results):
    """Encode each mood with one shared scale: 8-bit sRGB WebP, flipped to top-left origin."""
    if os.path.isdir(LIGHTMAPS):
        shutil.rmtree(LIGHTMAPS)
    manifest = {
        "version": 2,
        "note": "Baked diffuse lighting (irradiance). Apply as material.lightMap on every material of the named node "
                "except those whose names start with a skipMaterials prefix. Interiors and hills are illustrative.",
        "uvChannel": 1, "flipY": False, "colorSpace": "srgb",
        "path": "lightmaps/{tier}/{mood}/{node}.webp",
        "tiers": {"desktop": "full size", "mobile": "half size"},
        "skipMaterials": ["glass", "glass_clear", "photo_slot"],
        "nodes": sorted({n for _, n in results}),
        "moods": {},
    }
    for mood in MOODS:
        maps = {n: a for (m, n), a in results.items() if m == mood}
        sample = np.concatenate([a.max(axis=2)[::4, ::4].ravel() for a in maps.values()])
        scale = float(np.percentile(sample[sample > 0], 99.7))
        s = MOODS[mood]
        manifest["moods"][mood] = {
            # three.js lights a lightmapped surface with albedo * texel * intensity / PI.
            "lightMapIntensity": round(scale * math.pi, 4),
            "background": s["background"], "fog": s["fog"], "fogNear": 400, "fogFar": 7000,
            "sky": {"top": s["sky_top"], "middle": s["sky_mid"], "horizon": s["sky_horizon"]},
            # `students` is not lightmapped: draw it unlit (MeshBasicMaterial, vertexColors) times this tint.
            "figureTint": [round(c, 3) for c in s["figure_tint"]],
            "sunElevationDeg": s["elev"], "sunAzimuthDeg": s["azim"],
        }
        for name, a in maps.items():
            x = np.clip(a / scale, 0, 1)
            x = np.where(x <= 0.0031308, 12.92 * x, 1.055 * np.power(x, 1 / 2.4) - 0.055)
            img = Image.fromarray((np.flipud(x) * 255 + 0.5).astype(np.uint8))
            for tier, factor in (("desktop", 1), ("mobile", 2)):
                d = os.path.join(LIGHTMAPS, tier, mood)
                os.makedirs(d, exist_ok=True)
                out = img if factor == 1 else img.resize((img.width // factor, img.height // factor), Image.LANCZOS)
                out.save(os.path.join(d, f"{name}.webp"), quality=82, method=6)
    with open(os.path.join(LIGHTMAPS, "manifest.json"), "w") as fh:
        json.dump(manifest, fh, indent=2)


# ------------------------------------------------------------------- export
def export(path, draco_level):
    bpy.ops.object.select_all(action="DESELECT")
    for ob in bpy.data.objects:
        if ob.type in {"MESH", "EMPTY"} and not ob.get("render_only"):
            ob.select_set(True)
    bpy.ops.export_scene.gltf(
        filepath=path, export_format="GLB", use_selection=True, export_yup=True, export_apply=True,
        export_extras=True, export_texcoords=True, export_image_format="AUTO",
        export_draco_mesh_compression_enable=True, export_draco_mesh_compression_level=draco_level,
        export_draco_texcoord_quantization=14, export_cameras=False, export_lights=False,
        export_gpu_instances=True, export_vertex_color="MATERIAL",
    )
    print(f"exported {os.path.relpath(path, WEBSITE)} ({os.path.getsize(path) / 1e6:.2f} MB)", flush=True)


# ------------------------------------------------------------------- renders
def render_heroes(sun, interior_lights, setting, cam):
    scene = bpy.context.scene
    os.makedirs(PREVIEWS, exist_ok=True)
    for f in os.listdir(PREVIEWS):
        if SHOTS is None or f[:-4] in SHOTS:
            os.remove(os.path.join(PREVIEWS, f))
    # Render-only ground: opaque and fading to haze, so the hills sit on land.
    setting["ground"].hide_render = True
    bm = bmesh.new()
    bmesh.ops.create_circle(bm, cap_ends=True, segments=128, radius=7000)
    gmat = bpy.data.materials.new("render_ground")
    gmat.use_nodes = True
    nt = gmat.node_tree
    bsdf = nt.nodes["Principled BSDF"]
    bsdf.inputs["Roughness"].default_value = 1.0
    tc, sep, ramp = nt.nodes.new("ShaderNodeTexCoord"), nt.nodes.new("ShaderNodeVectorMath"), nt.nodes.new("ShaderNodeValToRGB")
    sep.operation = "LENGTH"
    mp = nt.nodes.new("ShaderNodeMapRange")
    mp.inputs["From Min"].default_value, mp.inputs["From Max"].default_value = 60, 2500
    nt.links.new(tc.outputs["Object"], sep.inputs[0])
    nt.links.new(sep.outputs["Value"], mp.inputs["Value"])
    nt.links.new(mp.outputs["Result"], ramp.inputs["Fac"])
    nt.links.new(ramp.outputs["Color"], bsdf.inputs["Base Color"])
    ground = bm_object("render_ground", bm, [gmat])
    ground.location = P(MAIN_W / 2, 0, -0.08)
    ground["render_only"] = True

    scene.render.engine = "CYCLES"  # set here too: --renders-only skips the bake, which otherwise sets it
    scene.cycles.device = "CPU"
    scene.cycles.samples = 16 if QUICK else 160
    scene.cycles.use_denoising = True
    scene.render.resolution_x, scene.render.resolution_y = (640, 360) if QUICK else (1920, 1080)
    scene.render.resolution_percentage = 100
    scene.view_settings.view_transform = "AgX"
    scene.view_settings.look = "AgX - Medium High Contrast"
    scene.render.image_settings.file_format = "PNG"
    scene.render.image_settings.color_depth = "8"
    # Aerial perspective: blend distant geometry and sky toward the mood's haze colour.
    scene.view_layers[0].use_pass_mist = True
    scene.world.mist_settings.start, scene.world.mist_settings.depth = 40, 1400
    scene.world.mist_settings.falloff = "LINEAR"
    scene.use_nodes = True
    tree = scene.node_tree
    tree.nodes.clear()
    rl, mix, mul = tree.nodes.new("CompositorNodeRLayers"), tree.nodes.new("CompositorNodeMixRGB"), tree.nodes.new("CompositorNodeMath")
    haze, out = tree.nodes.new("CompositorNodeRGB"), tree.nodes.new("CompositorNodeComposite")
    mul.operation = "MULTIPLY"
    tree.links.new(rl.outputs["Mist"], mul.inputs[0])
    tree.links.new(mul.outputs["Value"], mix.inputs["Fac"])
    tree.links.new(rl.outputs["Image"], mix.inputs[1])
    tree.links.new(haze.outputs["RGBA"], mix.inputs[2])
    tree.links.new(mix.outputs["Image"], out.inputs["Image"])
    r1 = PLINTH + 2 * H + SLAB
    shots = [
        ("hero_morning", "morning", P(-13, -27, 2.6), P(10.5, 0, 8.2), 24),
        ("gate_street", "day", P(GATE_X - 5.5, GATE_Y - 16, 1.5), P(GATE_X + 1.5, 0, 7.4), 26),
        ("balcony", "morning", P(-1.6, -CORR_D - 1.5, r1 + 1.55), P(14, -CORR_D + 0.6, r1 + 1.1), 28),
    ]
    for name, mood, loc, target, lens in shots:
        if SHOTS is not None and name not in SHOTS:
            continue
        set_mood(mood, sun, interior_lights, still=True)
        ramp.color_ramp.elements[0].color = lin(C["grass"])
        ramp.color_ramp.elements[1].color = lin(MOODS[mood]["fog"])
        haze.outputs["RGBA"].default_value = lin(MOODS[mood]["fog"])
        mul.inputs[1].default_value = 0.25 if mood == "morning" else 0.2  # the sky gets this much haze too
        cam.location = loc
        cam.data.lens = lens
        cam.data.clip_end = 12000
        cam.rotation_euler = (target - loc).to_track_quat("-Z", "Y").to_euler()
        scene.render.filepath = os.path.join(PREVIEWS, f"{name}.png")
        bpy.ops.render.render(write_still=True)
        print(f"rendered {name}.png", flush=True)
    if SHOTS is not None and "hero_morning" not in SHOTS:
        return
    og = Image.open(os.path.join(PREVIEWS, "hero_morning.png")).convert("RGB")
    w, h = og.size
    crop_h = int(w * 630 / 1200)
    og = og.crop((0, (h - crop_h) // 2, w, (h - crop_h) // 2 + crop_h)).resize((1200, 630), Image.LANCZOS)
    og.save(os.path.join(WEBSITE, "public", "og-image.jpg"), quality=88)


# --------------------------------------------------------------------- main
def main():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    scene = bpy.context.scene
    scene.world = bpy.data.worlds.new("World")
    scene.world.use_nodes = True
    with tempfile.TemporaryDirectory() as tmp:
        tex_full = make_textures(os.path.join(tmp, "tex1024"), 128 if QUICK else 1024)
        tex_small = make_textures(os.path.join(tmp, "tex512"), 64 if QUICK else 512)
        M, imgs = make_materials(tex_full)

        lightmapped = {}
        for f in range(FLOORS):
            fl, interior = build_floor(f, M)
            lightmapped[fl.name] = fl
            lightmapped[interior.name] = interior
        lightmapped["roof"] = build_roof(M)
        lightmapped["tower"] = build_tower(M)
        lightmapped["gate"] = build_gate(M)
        setting = build_setting(M)
        lightmapped.update(setting)
        build_students()
        group = link(bpy.data.objects.new("setting", None))
        for key in ("yard", "compound_wall", "trees", "ground", "hills"):
            parent_to(setting[key], group)

        for ob in lightmapped.values():
            prepare_uvs(ob)  # the renders need UV0 for the tiling textures too
            if not RENDERS_ONLY:
                own_materials(ob)

        cam = link(bpy.data.objects.new("cam", bpy.data.cameras.new("cam")))  # also needed by the denoise pass
        cam["render_only"] = True
        scene.camera = cam
        sun = link(bpy.data.objects.new("sun", bpy.data.lights.new("sun", "SUN")))
        sun["render_only"] = True
        interior_lights = []
        for f in range(FLOORS):
            k = INTERIOR_BAY[f]
            lamp = bpy.data.lights.new(f"room_light_{f}", "AREA")
            lamp.shape, lamp.size, lamp.size_y = "RECTANGLE", 2.0, 3.5
            lamp.color = (1.0, 0.95, 0.86)
            ob = link(bpy.data.objects.new(f"room_light_{f}", lamp))
            ob.location = P((k - 0.5) * BAY, ROOM_D / 2, ceil_z(f) - 0.05)
            ob["render_only"] = True
            interior_lights.append(ob)

        if not RENDERS_ONLY:
            results = bake_lightmaps(lightmapped, sun, interior_lights, tmp)
            write_lightmaps(results)

            os.makedirs(MODELS, exist_ok=True)
            export(os.path.join(MODELS, "school.glb"), 7)
            for key, img in imgs.items():  # phone version: same geometry and UVs, smaller textures
                img.unpack(method="REMOVE")
                img.filepath = tex_small[key]
                img.reload()
                img.pack()
            export(os.path.join(MODELS, "school-mobile.glb"), 10)
            for key, img in imgs.items():
                img.unpack(method="REMOVE")
                img.filepath = tex_full[key]
                img.reload()

        if RENDER:
            render_heroes(sun, interior_lights, setting, cam)

    def total(paths):
        return sum(os.path.getsize(p) for p in paths) / 1e6

    lm = lambda tier: [os.path.join(dp, f) for dp, _, fs in os.walk(os.path.join(LIGHTMAPS, tier)) for f in fs]
    desk = total([os.path.join(MODELS, "school.glb")] + lm("desktop"))
    mob = total([os.path.join(MODELS, "school-mobile.glb")] + lm("mobile"))
    print(f"desktop total {desk:.2f} MB, mobile total {mob:.2f} MB", flush=True)
    assert desk < 10, "desktop model + lightmaps must stay under 10 MB"


if __name__ == "__main__":
    main()
