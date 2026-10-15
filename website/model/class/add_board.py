# The whiteboard on the front wall, rebuilt: a clean, slightly glossy board where the photo's soft one was, a real
# frame round it, and the Gallery written on it in black marker (board_ink.png, from boardSketch.ts at the layout the
# walk's last frame shows), as ink in the board's own material, lit by the room. Saves classroom.blend.
import bpy, os, sys, traceback
DIR = sys.argv[sys.argv.index('--') + 1]
log = open(os.path.join(DIR, 'add_board.log'), 'w')
try:
    for n in [o.name for o in bpy.data.objects if o.name.startswith('GEO-whiteboard')]: bpy.data.objects.remove(bpy.data.objects[n], do_unlink=True)
    L = 7.4; X0, X1, Z0, Z1 = 2.217, 4.119, 0.889, 1.972; Y = L - 0.012
    m = bpy.data.materials.new('MAT-whiteboard'); m.use_nodes = True; nt = m.node_tree
    b = next(n for n in nt.nodes if n.type == 'BSDF_PRINCIPLED')
    tx = nt.nodes.new('ShaderNodeTexImage'); tx.image = bpy.data.images.load(os.path.join(DIR, 'board_ink.png'), check_existing=False)
    tx.image.colorspace_settings.name = 'Non-Color'; tx.interpolation = 'Cubic'
    sep = nt.nodes.new('ShaderNodeSeparateColor'); nt.links.new(tx.outputs['Color'], sep.inputs['Color'])
    # the board: off-white with faint ghosts of old writing, large and soft
    nz = nt.nodes.new('ShaderNodeTexNoise'); nz.inputs['Scale'].default_value = 3.0; nz.inputs['Detail'].default_value = 6.0
    ramp = nt.nodes.new('ShaderNodeValToRGB')
    ramp.color_ramp.elements[0].position = 0.35; ramp.color_ramp.elements[0].color = (0.80, 0.81, 0.80, 1)
    ramp.color_ramp.elements[1].position = 0.75; ramp.color_ramp.elements[1].color = (0.86, 0.87, 0.86, 1)
    nt.links.new(nz.outputs['Fac'], ramp.inputs['Fac'])
    mix = nt.nodes.new('ShaderNodeMix'); mix.data_type = 'RGBA'
    nt.links.new(sep.outputs['Red'], mix.inputs['Factor']); nt.links.new(ramp.outputs['Color'], mix.inputs['A'])
    mix.inputs['B'].default_value = (0.018, 0.019, 0.022, 1)          # black marker
    nt.links.new(mix.outputs['Result'], b.inputs['Base Color'])
    rough = nt.nodes.new('ShaderNodeMapRange'); rough.inputs['To Min'].default_value = 0.42; rough.inputs['To Max'].default_value = 0.6
    nt.links.new(sep.outputs['Red'], rough.inputs['Value']); nt.links.new(rough.outputs['Result'], b.inputs['Roughness'])
    # satin, as a classroom board is: a soft sheen, no mirror of the red beam and the ceiling's light
    b.inputs['Specular IOR Level'].default_value = 0.3
    me = bpy.data.meshes.new('GEO-whiteboard')
    me.from_pydata([(X0, Y, Z1), (X1, Y, Z1), (X1, Y, Z0), (X0, Y, Z0)], [], [(0, 3, 2, 1)]); me.update()
    uv = me.uv_layers.new()
    for li, vi in enumerate(me.polygons[0].vertices): uv.data[li].uv = [(0, 1), (1, 1), (1, 0), (0, 0)][vi]
    me.materials.append(m); o = bpy.data.objects.new('GEO-whiteboard', me); bpy.context.scene.collection.objects.link(o)
    # the frame: dark wood strips proud of the wall, just over the photo's own frame
    fm = bpy.data.materials.new('MAT-whiteboard-frame'); fm.use_nodes = True
    fb = next(n for n in fm.node_tree.nodes if n.type == 'BSDF_PRINCIPLED'); fb.inputs['Base Color'].default_value = (0.06, 0.04, 0.03, 1); fb.inputs['Roughness'].default_value = 0.5
    F, D = 0.045, 0.022
    def box(name, x0, x1, z0, z1):
        v = [(x0, L - D, z0), (x1, L - D, z0), (x1, L, z0), (x0, L, z0), (x0, L - D, z1), (x1, L - D, z1), (x1, L, z1), (x0, L, z1)]
        mm = bpy.data.meshes.new(name); mm.from_pydata(v, [], [(0, 1, 5, 4), (1, 2, 6, 5), (3, 0, 4, 7), (4, 5, 6, 7), (0, 3, 2, 1)]); mm.update()
        mm.materials.append(fm); ob = bpy.data.objects.new(name, mm); bpy.context.scene.collection.objects.link(ob)
    box('GEO-whiteboard-frame-t', X0 - F, X1 + F, Z1, Z1 + F); box('GEO-whiteboard-frame-b', X0 - F, X1 + F, Z0 - F, Z0)
    box('GEO-whiteboard-frame-l', X0 - F, X0, Z0, Z1); box('GEO-whiteboard-frame-r', X1, X1 + F, Z0, Z1)
    bpy.ops.wm.save_mainfile()
    log.write('ok\n')
except Exception:
    log.write(traceback.format_exc())
log.write('DONE\n'); log.close()
