"""Build the school building model for the website.

Follows website/docs/model-brief.md. Run with Blender's engine as a module:

    python -m venv .venv && .venv/bin/pip install bpy==4.5.4
    .venv/bin/python website/model/build_school.py            # model + previews
    .venv/bin/python website/model/build_school.py --no-render  # model only

Outputs (paths relative to the repo root):
    website/public/models/school.glb
    website/model/previews/front.png, three_quarter.png, balcony.png

Blender is Z-up; the glTF exporter converts to Y-up. The front of the building
faces Blender -Y, which becomes +Z in three.js.
"""
import math
import os
import sys
import tempfile

import bpy  # must come first: bmesh and mathutils are provided by bpy
import bmesh
from mathutils import Matrix, Vector

HERE = os.path.dirname(os.path.abspath(__file__))
WEBSITE = os.path.dirname(HERE)
GLB_PATH = os.path.join(WEBSITE, "public", "models", "school.glb")
PREVIEW_DIR = os.path.join(HERE, "previews")
RENDER = "--no-render" not in sys.argv

# ---------------------------------------------------------------- dimensions
H = 3.2            # floor-to-floor height
FLOORS = 4
SLAB = 0.25        # slab thickness
BAYS = 6
BAY = 3.8          # bay width -> main block 22.8 m
MAIN_W = BAYS * BAY
TOWER_W = 3.2      # stair tower -> total width 26 m
ROOM_D = 6.0       # room depth
CORR_D = 2.4       # open corridor depth
RAIL_H = 1.0
BAR_PITCH = 0.25
PARAPET_H = 1.0

# Centre the whole building on the origin (x across, y depth).
OX = -(MAIN_W + TOWER_W) / 2
OY = -(ROOM_D - CORR_D) / 2

# Photo slots: floor -> bays (1-based, counted from the west).
PHOTO_BAYS = {0: (2, 3), 1: (3, 4), 2: (4, 5), 3: (5, 6)}

COLOURS = {
    "wall": "#F0C84B",
    "tower": "#E2B53B",
    "rail": "#2D5FA6",
    "slab": "#F6F6F2",
    "glass": "#22304D",
    "door": "#3A4A6B",
    "tank": "#1D2026",
    "flag_red": "#DC143C",   # crimson
}


def srgb_to_linear(c):
    return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4


def hex_rgba(h):
    h = h.lstrip("#")
    return tuple(srgb_to_linear(int(h[i:i + 2], 16) / 255) for i in (0, 2, 4)) + (1.0,)


# ----------------------------------------------------------------- materials
def make_material(name, colour, roughness=0.85):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    bsdf = m.node_tree.nodes["Principled BSDF"]
    bsdf.inputs["Base Color"].default_value = hex_rgba(colour)
    bsdf.inputs["Roughness"].default_value = roughness
    bsdf.inputs["Metallic"].default_value = 0.0
    m.diffuse_color = hex_rgba(colour)
    return m


# ------------------------------------------------------------------ geometry
def box(name, x0, x1, y0, y1, z0, z1, mat):
    """Axis-aligned box in building coordinates (x from the west end, y from the
    front wall, z from the ground)."""
    x0, x1, y0, y1 = x0 + OX, x1 + OX, y0 + OY, y1 + OY
    verts = [(x, y, z) for x in (x0, x1) for y in (y0, y1) for z in (z0, z1)]
    faces = [(0, 1, 3, 2), (4, 6, 7, 5), (0, 4, 5, 1), (2, 3, 7, 6), (0, 2, 6, 4), (1, 5, 7, 3)]
    me = bpy.data.meshes.new(name)
    me.from_pydata(verts, [], faces)
    me.update()
    bm = bmesh.new()
    bm.from_mesh(me)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.to_mesh(me)
    bm.free()
    ob = bpy.data.objects.new(name, me)
    bpy.context.collection.objects.link(ob)
    me.materials.append(mat)
    return ob


def cylinder(name, cx, cy, z0, height, radius, mat, verts=32):
    bm = bmesh.new()
    bmesh.ops.create_cone(bm, cap_ends=True, segments=verts, radius1=radius, radius2=radius, depth=height)
    bmesh.ops.translate(bm, verts=bm.verts, vec=(cx + OX, cy + OY, z0 + height / 2))
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    for p in me.polygons:
        p.use_smooth = len(p.vertices) == 4
    ob = bpy.data.objects.new(name, me)
    bpy.context.collection.objects.link(ob)
    me.materials.append(mat)
    return ob


def array(ob, count, offset):
    """Repeat a part with an Array modifier (Blender's instancing for repeated
    geometry) instead of making many separate objects."""
    mod = ob.modifiers.new("array", "ARRAY")
    mod.count = count
    mod.use_relative_offset = False
    mod.use_constant_offset = True
    mod.constant_offset_displace = offset
    return ob


def flat_polygon(name, pts, mat, y):
    """A flat polygon in the XZ plane facing the front (-Y), pts in building x/z."""
    bm = bmesh.new()
    vs = [bm.verts.new((x + OX, y + OY, z)) for x, z in pts]
    f = bm.faces.new(vs)
    if f.normal.y > 0:
        f.normal_flip()
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    ob = bpy.data.objects.new(name, me)
    bpy.context.collection.objects.link(ob)
    me.materials.append(mat)
    return ob


def photo_pane(name, cx, z0, w, h, y, mat):
    """Portrait 3:4 pane facing the front, UVs 0..1 so the site can map a photo
    onto it upright."""
    x0, x1 = cx - w / 2 + OX, cx + w / 2 + OX
    y += OY
    me = bpy.data.meshes.new(name)
    me.from_pydata([(x0, y, z0), (x1, y, z0), (x1, y, z0 + h), (x0, y, z0 + h)], [], [(0, 1, 2, 3)])
    uv = me.uv_layers.new(name="UVMap")
    for loop, co in zip(uv.data, [(0, 0), (1, 0), (1, 1), (0, 1)]):
        loop.uv = co
    me.update()
    assert me.polygons[0].normal.y < 0, "pane must face the front"
    ob = bpy.data.objects.new(name, me)
    bpy.context.collection.objects.link(ob)
    me.materials.append(mat)
    return ob


def set_origin(ob, world_point):
    """Move the object's origin to world_point without moving its geometry."""
    p = Vector(world_point)
    ob.data.transform(Matrix.Translation(ob.location - p))
    ob.location = p


def merge(name, parts, origin, bevel=True):
    """Apply modifiers, join parts into one object and set its origin."""
    vl = bpy.context.view_layer
    bpy.ops.object.select_all(action="DESELECT")
    for p in parts:
        p.select_set(True)
        vl.objects.active = p
        for mod in list(p.modifiers):
            bpy.ops.object.modifier_apply(modifier=mod.name)
    vl.objects.active = parts[0]
    bpy.ops.object.join()
    ob = vl.objects.active
    ob.name = ob.data.name = name
    if bevel:
        # Small bevel on hard edges for the architect's-model look.
        mod = ob.modifiers.new("bevel", "BEVEL")
        mod.width = 0.015
        mod.segments = 2
        mod.limit_method = "ANGLE"
        mod.angle_limit = math.radians(40)
        mod.harden_normals = True
        bpy.ops.object.modifier_apply(modifier="bevel")
    set_origin(ob, origin)
    return ob


# ------------------------------------------------------------------ building
def build():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    M = {k: make_material(k, v) for k, v in COLOURS.items()}
    M["glass"].node_tree.nodes["Principled BSDF"].inputs["Roughness"].default_value = 0.35
    photo_mat = make_material("photo_slot", COLOURS["glass"], 0.35)

    objects = {}
    cx, cy = OX + (MAIN_W + TOWER_W) / 2, OY + (ROOM_D - CORR_D) / 2  # == 0, 0
    main_cx = OX + MAIN_W / 2

    for f in range(FLOORS):
        z = f * H
        top = z + SLAB          # walking surface of this floor
        ceil = (f + 1) * H      # underside of the next slab
        parts = []
        # Slab under rooms and corridor, white with a blue front edge.
        parts.append(box(f"slab{f}", 0, MAIN_W, -CORR_D, ROOM_D, z, top, M["slab"]))
        parts.append(box(f"edge{f}", 0, MAIN_W, -CORR_D - 0.03, -CORR_D, z, top, M["rail"]))
        parts.append(box(f"edgew{f}", -0.03, 0, -CORR_D - 0.03, 0, z, top, M["rail"]))
        # Rooms: one yellow block behind the open corridor.
        parts.append(box(f"rooms{f}", 0, MAIN_W, 0, ROOM_D, top, ceil, M["wall"]))
        # White columns at the bay edges, along the corridor's front edge.
        for k in range(BAYS + 1):
            x = min(max(k * BAY, 0.125), MAIN_W - 0.125)
            parts.append(box(f"col{f}_{k}", x - 0.125, x + 0.125, -CORR_D, -CORR_D + 0.25, top, ceil, M["slab"]))
        # Each bay: a door and a window on the yellow wall.
        for k in range(1, BAYS + 1):
            x0 = (k - 1) * BAY
            parts.append(box(f"door{f}_{k}", x0 + 0.6, x0 + 1.6, -0.03, 0.05, top, top + 2.2, M["door"]))
            if k not in PHOTO_BAYS[f]:
                parts.append(box(f"win{f}_{k}", x0 + 2.1, x0 + 3.3, -0.03, 0.05, top + 0.9, top + 2.5, M["glass"]))
        # Railings on the upper three corridors.
        if f >= 1:
            ry0, ry1 = -CORR_D + 0.02, -CORR_D + 0.08
            parts.append(box(f"toprail{f}", 0, MAIN_W, ry0 - 0.01, ry1 + 0.01, top + RAIL_H - 0.08, top + RAIL_H, M["rail"]))
            parts.append(box(f"midrail{f}", 0, MAIN_W, ry0, ry1, top + 0.47, top + 0.53, M["rail"]))
            n = int(MAIN_W / BAR_PITCH) + 1
            bar = box(f"bars{f}", 0, 0.02, ry0 + 0.02, ry1 - 0.02, top, top + RAIL_H - 0.08, M["rail"])
            parts.append(array(bar, n, ((MAIN_W - 0.02) / (n - 1), 0, 0)))
            # Open west end of the corridor.
            parts.append(box(f"toprailw{f}", 0.02, 0.10, -CORR_D, 0, top + RAIL_H - 0.08, top + RAIL_H, M["rail"]))
            parts.append(box(f"midrailw{f}", 0.03, 0.09, -CORR_D, 0, top + 0.47, top + 0.53, M["rail"]))
            nw = int(CORR_D / BAR_PITCH)
            barw = box(f"barsw{f}", 0.05, 0.07, -CORR_D + BAR_PITCH, -CORR_D + BAR_PITCH + 0.02, top, top + RAIL_H - 0.08, M["rail"])
            parts.append(array(barw, nw, (0, BAR_PITCH, 0)))
        floor_ob = merge(f"floor_{f}", parts, (main_cx, cy, z))
        objects[floor_ob.name] = floor_ob

        # Photo slots: separate panes, children of the floor so they grow with it.
        for slot, k in zip("ab", PHOTO_BAYS[f]):
            x0 = (k - 1) * BAY
            pane = photo_pane(f"win_f{f}_{slot}", x0 + 2.7, top + 0.9, 1.2, 1.6, -0.035, photo_mat)
            world = Vector((x0 + 2.7 + OX, -0.035 + OY, top + 0.9))
            set_origin(pane, world)
            # Parent with an identity inverse: the pane's location is relative to the floor.
            pane.parent = floor_ob
            pane.location = world - floor_ob.location

    # Roof: slab, white parapet, two black water tanks, Nepal flag on a pole.
    rz = FLOORS * H
    rtop = rz + SLAB
    parts = [
        box("roofslab", 0, MAIN_W, -CORR_D, ROOM_D, rz, rtop, M["slab"]),
        box("roofedge", 0, MAIN_W, -CORR_D - 0.03, -CORR_D, rz, rtop, M["rail"]),
        box("par_front", 0, MAIN_W, -CORR_D, -CORR_D + 0.15, rtop, rtop + PARAPET_H, M["slab"]),
        box("par_back", 0, MAIN_W, ROOM_D - 0.15, ROOM_D, rtop, rtop + PARAPET_H, M["slab"]),
        box("par_west", 0, 0.15, -CORR_D + 0.15, ROOM_D - 0.15, rtop, rtop + PARAPET_H, M["slab"]),
        cylinder("tank1", MAIN_W - 4.6, ROOM_D - 1.4, rtop, 1.3, 0.55, M["tank"]),
        cylinder("tank2", MAIN_W - 3.0, ROOM_D - 1.4, rtop, 1.3, 0.55, M["tank"]),
        cylinder("flagpole", 1.0, -CORR_D + 0.6, rtop, 4.5, 0.03, M["slab"], verts=12),
    ]
    # Nepal flag: double pennant, crimson with a blue border, hoisted at the pole top.
    fw, fh = 1.0, 1.22  # width, height
    outline = [(0, 0), (fw, 0), (0.33 * fw, 0.42 * fh), (0.92 * fw, 0.42 * fh), (0, fh)]
    inner = [(0.06, 0.05), (0.85, 0.05), (0.23, 0.45 * fh), (0.80, 0.45 * fh), (0.06, fh - 0.12)]
    fx, fz = 1.03, rtop + 4.5 - fh
    parts.append(flat_polygon("flag_border", [(fx + x, fz + z) for x, z in outline], M["rail"], -CORR_D + 0.6))
    parts.append(flat_polygon("flag_field", [(fx + x, fz + z) for x, z in inner], M["flag_red"], -CORR_D + 0.6 - 0.005))
    back = flat_polygon("flag_field_back", [(fx + x, fz + z) for x, z in inner], M["flag_red"], -CORR_D + 0.6 + 0.005)
    back.data.flip_normals()
    parts.append(back)
    objects["roof"] = merge("roof", parts, (main_cx, cy, rz), bevel=False)

    # Stair tower at the east end: slightly darker yellow, narrow windows.
    tx0, tx1 = MAIN_W, MAIN_W + TOWER_W
    t_top = rtop + PARAPET_H
    parts = [box("towerbody", tx0, tx1, -CORR_D, ROOM_D, 0, t_top, M["tower"])]
    for f in range(FLOORS):
        wz = f * H + SLAB + 0.9
        parts.append(box(f"twin_front{f}", tx0 + TOWER_W / 2 - 0.25, tx0 + TOWER_W / 2 + 0.25, -CORR_D - 0.03, -CORR_D + 0.05, wz, wz + 1.6, M["glass"]))
        parts.append(box(f"twin_east{f}", tx1 - 0.05, tx1 + 0.03, 1.55, 2.05, wz, wz + 1.6, M["glass"]))
    objects["tower"] = merge("tower", parts, (OX + (tx0 + tx1) / 2, cy, 0))

    # Gate in front of the building: two pillars and a blue beam.
    gx, gy = MAIN_W / 2, -CORR_D - 7.5
    parts = [
        box("pillar_w", gx - 3.3, gx - 2.7, gy - 0.3, gy + 0.3, 0, 2.8, M["slab"]),
        box("pillar_e", gx + 2.7, gx + 3.3, gy - 0.3, gy + 0.3, 0, 2.8, M["slab"]),
        box("beam", gx - 3.5, gx + 3.5, gy - 0.2, gy + 0.2, 2.8, 3.2, M["rail"]),
    ]
    objects["gate"] = merge("gate", parts, (OX + gx, OY + gy, 0))
    return objects


# ------------------------------------------------------------ AO baking
def bake_ao(objects, tmpdir):
    """Bake ambient occlusion per object into a texture on its own UV map and
    wire it as the glTF occlusion map (three.js aoMap)."""
    scene = bpy.context.scene
    scene.render.engine = "CYCLES"
    scene.cycles.device = "CPU"
    scene.cycles.samples = 96
    if scene.world is None:
        scene.world = bpy.data.worlds.new("World")
    scene.world.light_settings.distance = 1.6
    scene.render.bake.margin = 8

    group = bpy.data.node_groups.new("glTF Material Output", "ShaderNodeTree")
    group.interface.new_socket("Occlusion", in_out="INPUT", socket_type="NodeSocketFloat")

    vl = bpy.context.view_layer
    for name, ob in objects.items():
        size = 2048 if name.startswith("floor_") else 1024
        bpy.ops.object.select_all(action="DESELECT")
        ob.select_set(True)
        vl.objects.active = ob
        bpy.ops.object.mode_set(mode="EDIT")
        bpy.ops.mesh.select_all(action="SELECT")
        bpy.ops.uv.smart_project(angle_limit=math.radians(66), island_margin=0.004)
        bpy.ops.object.mode_set(mode="OBJECT")

        img = bpy.data.images.new(f"{name}_ao", size, size, alpha=False)
        img.generated_color = (1, 1, 1, 1)
        img.colorspace_settings.name = "Non-Color"
        # Give each object its own copies of the materials so each can point at its own AO image.
        for i, slot in enumerate(ob.material_slots):
            mat = slot.material.copy()
            mat.name = f"{slot.material.name}.{name}"
            ob.material_slots[i].material = mat
            nt = mat.node_tree
            tex = nt.nodes.new("ShaderNodeTexImage")
            tex.image = img
            nt.nodes.active = tex
        bpy.ops.object.bake(type="AO")
        img.filepath_raw = os.path.join(tmpdir, f"{name}_ao.png")
        img.file_format = "PNG"
        img.save()
        for slot in ob.material_slots:
            nt = slot.material.node_tree
            tex = next(n for n in nt.nodes if n.type == "TEX_IMAGE")
            sep = nt.nodes.new("ShaderNodeSeparateColor")
            out = nt.nodes.new("ShaderNodeGroup")
            out.node_tree = group
            nt.links.new(tex.outputs["Color"], sep.inputs["Color"])
            nt.links.new(sep.outputs["Red"], out.inputs["Occlusion"])
        print(f"baked AO for {name} ({size}px)")


def export(objects):
    os.makedirs(os.path.dirname(GLB_PATH), exist_ok=True)
    bpy.ops.object.select_all(action="DESELECT")
    for ob in bpy.data.objects:
        ob.select_set(True)
    bpy.ops.export_scene.gltf(
        filepath=GLB_PATH,
        export_format="GLB",
        use_selection=True,
        export_yup=True,
        export_apply=True,
        export_image_format="JPEG",
        export_jpeg_quality=85,
        export_draco_mesh_compression_enable=True,
        export_draco_mesh_compression_level=7,
        export_cameras=False,
        export_lights=False,
    )
    size = os.path.getsize(GLB_PATH) / 1e6
    print(f"exported {GLB_PATH} ({size:.2f} MB)")
    assert size < 8, "school.glb must stay under 8 MB"


# ------------------------------------------------------------------ previews
def look_at(cam, target):
    d = Vector(target) - cam.location
    cam.rotation_euler = d.to_track_quat("-Z", "Y").to_euler()


def render_previews():
    scene = bpy.context.scene
    os.makedirs(PREVIEW_DIR, exist_ok=True)
    # Preview-only staging: ground, sun and sky. Not part of school.glb.
    bpy.ops.mesh.primitive_plane_add(size=200, location=(0, 0, 0))
    ground = bpy.context.object
    ground.data.materials.append(make_material("ground", "#D9D6CF", 0.95))
    sun_data = bpy.data.lights.new("sun", "SUN")
    sun_data.energy = 3.2
    sun_data.angle = math.radians(8)
    sun = bpy.data.objects.new("sun", sun_data)
    sun.rotation_euler = (math.radians(50), math.radians(-10), math.radians(-35))
    scene.collection.objects.link(sun)
    world = scene.world
    world.use_nodes = True
    world.node_tree.nodes["Background"].inputs["Color"].default_value = (0.62, 0.72, 0.86, 1)
    world.node_tree.nodes["Background"].inputs["Strength"].default_value = 0.9

    scene.cycles.samples = 128
    scene.cycles.use_denoising = True
    scene.render.resolution_x, scene.render.resolution_y = 1600, 1000
    scene.view_settings.view_transform = "Standard"  # keep the brief's hex colours true
    scene.render.image_settings.file_format = "PNG"

    cam = bpy.data.objects.new("cam", bpy.data.cameras.new("cam"))
    scene.collection.objects.link(cam)
    scene.camera = cam
    shots = {
        "front": ((0, -46, 7.5), (0, 0, 7.0), 35),
        "three_quarter": ((-30, -32, 15), (0, 0, 6.0), 35),
        "balcony": ((-6.5, -9.0, 2 * H + 2.4), (-6.5 + 2.5, OY - CORR_D, 2 * H + 1.0), 35),
    }
    for name, (loc, target, lens) in shots.items():
        cam.location = loc
        cam.data.lens = lens
        look_at(cam, target)
        scene.render.filepath = os.path.join(PREVIEW_DIR, f"{name}.png")
        bpy.ops.render.render(write_still=True)
        print(f"rendered {name}.png")


def main():
    objects = build()
    with tempfile.TemporaryDirectory() as tmp:
        bake_ao(objects, tmp)
        for img in bpy.data.images:
            if img.filepath_raw:
                img.pack()
        export(objects)
    if RENDER:
        render_previews()


if __name__ == "__main__":
    main()
