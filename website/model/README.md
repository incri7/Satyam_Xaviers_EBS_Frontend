# School model

`build_school.py` builds `website/public/models/school.glb` from `website/docs/model-brief.md`, using Blender's engine as a Python module (no Blender interface needed).

```bash
python3.11 -m venv .venv-bpy && .venv-bpy/bin/pip install bpy==4.5.4
.venv-bpy/bin/python website/model/build_school.py              # model + 3 previews (~8 min on 4 CPU cores)
.venv-bpy/bin/python website/model/build_school.py --no-render  # model only (~5 min; most of it is the AO bake)
```

`bpy` 4.5 needs Python 3.11.

## What's in `school.glb`

- **Y up, front faces +Z**, centred on the origin. 26 m wide (22.8 m main block in 6 bays of 3.8 m, plus a 3.2 m stair tower), 4 floors of 3.2 m, 6 m rooms and a 2.4 m corridor.
- **Root nodes:** `floor_0` to `floor_3` (origin at each floor's base), `roof` (origin at the roof's base), `tower` and `gate` (origin at the ground). Scale and rotation are identity everywhere.
- **Photo slots:** `win_f0_a` to `win_f3_b` are children of their floor, so they grow with it. Each is a 1.2 × 1.6 m (3:4 portrait) quad facing +Z, with UVs 0 to 1 the right way up, using the `photo_slot` material. In three.js, set `material.map` to the class photo with `colorSpace = SRGBColorSpace` and `flipY = false`, like any glTF texture.
- **Ambient occlusion is baked** into each part's `occlusionTexture`, which three.js loads as `aoMap`. It only darkens ambient and environment light, so light the scene mostly with an environment map or hemisphere light to make it show.
- **Draco compressed**, so the loader needs `DRACOLoader` (drei's `useGLTF` sets it up by default). Size: 1.4 MB.

## Where it differs from the photos, and why

The brief says to follow it exactly, so these follow the brief rather than the photos. Change them if you want closer accuracy:

- The photos show a railing on the ground-floor corridor too. The brief says the upper three only.
- The photos show thin white pipe columns, with railing bars that look pale. The model uses square white columns at the bay edges and makes the whole railing blue (`#2D5FA6`), as the brief specifies.
- The real slab ends are rounded at the corners. The model keeps them square ("keep it simple and plain").
- The real slab fronts are mostly blue. The model has white slabs with a blue edge, as briefed.
- Not shown in the photos, so kept plain: the back and sides of the block, the stair tower's interior, the gate's position (7.5 m in front of the corridor) and its pillar colour (white, like the columns), and the flag's emblems (the brief asks only for crimson with a blue border).
