# Headless job: the early-years classroom's double door (WELCOME, To Our Class; model/class/door_tex.py, from the
# client's photos) set for good into the school's first-floor doorway beside the stairs' grill gate, the one the
# way into Gallery goes through (model/class). The long side's painted wall is cut round it, the door gets its
# frame, and its two leaves stand closed; they open only in that shot. Saves the scene in place.
# Usage: blender -b sxebs_street_v1.blend --python job_door.py
import bpy, os, traceback
from mathutils import Vector, Matrix
HERE = os.path.dirname(bpy.data.filepath)
log = open(os.path.join(HERE, 'renders', 'job_door.log'), 'w', buffering=1)
try:
    sc = bpy.context.scene
    if 'GEO-classdoor_welcome' in bpy.data.objects: raise SystemExit('already there')
    side = bpy.data.objects['GEO-school_side_1']
    v = [side.matrix_world @ p.co for p in side.data.vertices]
    S0, S1 = 32.1, 60.5                               # the long side's wall, s from SF + CORR to SB (env_school.py)
    U = (v[1] - v[0]) / (S1 - S0); U.z = 0
    Zw = Vector((0, 0, 1)); Lw = Zw.cross(U)          # +t: into the building
    ZF = v[0].z
    def P(s, t, z): return Vector((v[0].x, v[0].y, ZF)) + U * (s - S0) + Lw * t + Zw * z
    DS, DW, DH = 41.08, 1.4, 2.2                      # the doorway: centre along the wall, width, height
    WALL = 0.2
    mat = side.data.materials[0]; bpy.data.objects.remove(side, do_unlink=True)
    def wall_piece(name, s0, s1, z0, z1):
        me = bpy.data.meshes.new(name)
        me.from_pydata([P(s0, 0, z0), P(s1, 0, z0), P(s1, 0, z1), P(s0, 0, z1)], [], [(0, 1, 2, 3)]); me.update()
        uvl = me.uv_layers.new(name='UVMap')
        for li, (s, z) in zip(range(4), ((s0, z0), (s1, z0), (s1, z1), (s0, z1))): uvl.data[li].uv = ((s - S0) / 30.0, z / 3.2)
        me.materials.append(mat); o = bpy.data.objects.new(name, me); sc.collection.objects.link(o); return o
    wall_piece('GEO-school_side_1_a', S0, DS - DW / 2, 0, 3.2)
    wall_piece('GEO-school_side_1_b', DS + DW / 2, S1, 0, 3.2)
    wall_piece('GEO-school_side_1_c', DS - DW / 2, DS + DW / 2, DH, 3.2)
    def flat(name, rgb, rough=0.6):
        m = bpy.data.materials.new(name); m.use_nodes = True
        b = next(n for n in m.node_tree.nodes if n.type == 'BSDF_PRINCIPLED')
        b.inputs['Base Color'].default_value = tuple(((c / 255 + 0.055) / 1.055) ** 2.4 for c in rgb) + (1,)
        b.inputs['Roughness'].default_value = rough; return m
    def box_w(name, s0, s1, t0, t1, z0, z1, m):
        c = [P(s, t, z) for z in (z0, z1) for (s, t) in ((s0, t0), (s1, t0), (s1, t1), (s0, t1))]
        me = bpy.data.meshes.new(name)
        me.from_pydata(c, [], [(0, 3, 2, 1), (4, 5, 6, 7), (0, 1, 5, 4), (1, 2, 6, 5), (2, 3, 7, 6), (3, 0, 4, 7)]); me.update()
        me.materials.append(m); o = bpy.data.objects.new(name, me); sc.collection.objects.link(o); return o
    FRAME = flat('MAT-classdoor_frame', (104, 50, 42), 0.45)
    box_w('GEO-classdoor_jamb_l', DS - DW / 2 - 0.05, DS - DW / 2, -0.03, WALL + 0.02, 0, DH, FRAME)
    box_w('GEO-classdoor_jamb_r', DS + DW / 2, DS + DW / 2 + 0.05, -0.03, WALL + 0.02, 0, DH, FRAME)
    box_w('GEO-classdoor_head', DS - DW / 2 - 0.05, DS + DW / 2 + 0.05, -0.03, WALL + 0.02, DH, DH + 0.05, FRAME)
    # behind the closed door, the doorway's depth closed off (the classroom itself is added only for the shot)
    box_w('GEO-classdoor_back', DS - DW / 2, DS + DW / 2, WALL, WALL + 0.02, 0, DH, flat('MAT-classdoor_back', (40, 38, 36), 0.9))
    def img_mat(name, file):
        m = bpy.data.materials.new(name); m.use_nodes = True; nt = m.node_tree
        b = next(n for n in nt.nodes if n.type == 'BSDF_PRINCIPLED')
        tx = nt.nodes.new('ShaderNodeTexImage'); tx.image = bpy.data.images.load(os.path.join(HERE, 'data', 'street', file))
        nt.links.new(tx.outputs['Color'], b.inputs['Base Color']); b.inputs['Roughness'].default_value = 0.5
        return m
    EDGE = flat('MAT-classdoor_edge', (60, 62, 70), 0.4)
    INNER = img_mat('MAT-classdoor_inner', 'classdoor_inner.jpg')
    lw, lt, lh = DW / 2 - 0.005, 0.04, DH - 0.03
    base_rot = Matrix((U, Lw, Zw)).transposed().to_4x4()
    def leaf(name, tex, sign):
        """sign +1: the leaf runs +s from its hinge (the corridor's left leaf); -1: runs -s (the right leaf)"""
        xa, xb = (0, lw) if sign > 0 else (-lw, 0)
        c = [(xa, 0, 0), (xb, 0, 0), (xb, lt, 0), (xa, lt, 0), (xa, 0, lh), (xb, 0, lh), (xb, lt, lh), (xa, lt, lh)]
        me = bpy.data.meshes.new(name)
        me.from_pydata(c, [], [(0, 1, 5, 4), (2, 3, 7, 6), (0, 3, 2, 1), (4, 5, 6, 7), (1, 2, 6, 5), (3, 0, 4, 7)]); me.update()
        uvl = me.uv_layers.new(name='UVMap')
        uvs = [[(0, 0), (1, 0), (1, 1), (0, 1)], [(0, 0), (1, 0), (1, 1), (0, 1)]] + [[(0, 0)] * 4] * 4
        for poly, uv in zip(me.polygons, uvs):
            for li, q in zip(poly.loop_indices, uv): uvl.data[li].uv = q
        me.materials.append(img_mat(name + '-out', tex)); me.materials.append(INNER); me.materials.append(EDGE)
        for poly, k in zip(me.polygons, (0, 1, 2, 2, 2, 2)): poly.material_index = k
        o = bpy.data.objects.new(name, me); sc.collection.objects.link(o)
        o.matrix_world = Matrix.Translation(P(DS - sign * DW / 2, 0.05, 0.01)) @ base_rot
        return o
    leaf('GEO-classdoor_welcome', 'classdoor_welcome.jpg', +1)
    leaf('GEO-classdoor_class', 'classdoor_class.jpg', -1)
    bpy.ops.wm.save_mainfile()
    log.write('door added\n')
except SystemExit as e:
    log.write(f'{e}\n')
except Exception:
    log.write(traceback.format_exc())
log.write('DONE\n'); log.close()
