# School model (v2)

`build_school.py` builds the school and its setting from `website/docs/model-brief.md` and the photos in `website/refs/building/`, using Blender's engine as a Python module (no Blender interface needed). It also bakes the lighting and renders the hero stills.

```bash
python3.11 -m venv .venv-bpy && .venv-bpy/bin/pip install bpy==4.5.4 numpy pillow
.venv-bpy/bin/python website/model/build_school.py              # everything: about 1 h 15 min on 4 CPU cores (40 min bake, 30 min stills)
.venv-bpy/bin/python website/model/build_school.py --quick      # low-quality check of the whole pipeline in about 1 min
.venv-bpy/bin/python website/model/build_school.py --no-render  # model and lightmaps, no hero stills
.venv-bpy/bin/python website/model/build_school.py --renders-only                # re-render the stills, keep the bake (~30 min)
.venv-bpy/bin/python website/model/build_school.py --renders-only --shots=balcony  # just one still
```

The stills share the bake's sun and sky light, with two changes made for the camera only: the visible sky is brighter and clearer than the dim sky used for fill light, and distant hills and sky are hazed toward the mood's fog colour. Neither changes the lighting on the building.

## Outputs

| File | What |
|---|---|
| `public/models/school.glb` | Desktop model: Draco, 1024 px tiling textures |
| `public/models/school-mobile.glb` | Phone model: same geometry and UVs, 512 px textures |
| `public/models/lightmaps/{desktop,mobile}/{morning,day}/<node>.webp` | Baked lighting, two moods; mobile maps are half size |
| `public/models/lightmaps/manifest.json` | How to apply them (see below) |
| `model/previews/hero_morning.png`, `gate_street.png`, `balcony.png` | Cycles hero stills, 1920 × 1080 |
| `public/og-image.jpg` | 1200 × 630 share image, cropped from the morning hero |

Desktop model plus both moods' lightmaps stays under 10 MB; the build fails if it doesn't.

## Nodes

Y up, front faces +Z, centred on the building. Scale and rotation are identity everywhere.

| Node | What | Origin |
|---|---|---|
| `floor_0` … `floor_3` | Everything on that floor. `floor_0` includes the raised block base and the steps | Base of the floor (`floor_0`: the ground) |
| `interior_f0` … `interior_f3` | One classroom per floor, child of its floor. **Illustrative**: `extras.illustrative = true` and an `extras.label` | Room centre, at the floor's base height |
| `win_f0_a` … `win_f3_b` | Photo slots, children of their floor (unchanged from v1: 1.2 × 1.6 m portrait quads facing +Z, UVs 0 to 1, material `photo_slot`) | Bottom centre of the pane |
| `roof` | Roof slab, parapet, tanks, flag | Roof base |
| `tower` | Stair tower | Ground |
| `gate` | Gate pillars and beam | Ground |
| `setting` | Group: `yard`, `compound_wall`, `trees`, `ground`, `hills` (hills are **illustrative**) | World origin |

Floor bases: `floor_0` at 0 m, `floor_1` at 4.2 m, `floor_2` at 7.4 m, `floor_3` at 10.6 m, `roof` at 13.8 m. They moved up 1 m from v1 because the photos show the ground floor on a raised base.

The classroom doors stand open and their windows have clear glass, so the camera can fly in: `interior_f0` (nursery) is behind floor 0 bay 1, `interior_f1` (primary) floor 1 bay 2, `interior_f2` (middle) floor 2 bay 3, `interior_f3` (Class 10) floor 3 bay 4, counting bays from the west. Each sits next to that floor's photo slots.

## Applying the lightmaps (three.js)

The lightmaps hold baked diffuse lighting (sun, sky, bounce light, and soft fill inside the classrooms), not colour. Apply them to every material of each node named in `manifest.nodes`, skipping materials whose base name (before the `.`) is in `manifest.skipMaterials` (the glass and the photo slots). Each lightmapped node has its own material copies, so each can take its own map.

```js
const manifest = await (await fetch('/models/lightmaps/manifest.json')).json();
const mood = manifest.moods.morning; // or .day
for (const node of manifest.nodes) {
  const obj = gltf.scene.getObjectByName(node);
  const tex = await new THREE.TextureLoader().loadAsync(
    '/models/' + manifest.path.replace('{tier}', 'desktop').replace('{mood}', 'morning').replace('{node}', node));
  tex.flipY = false;            // manifest.flipY
  tex.channel = 1;              // manifest.uvChannel: the glTF TEXCOORD_1 set
  tex.colorSpace = THREE.SRGBColorSpace;
  // Only the node's own meshes; child nodes (interiors, photo panes) have their own maps.
  const meshes = obj.isMesh ? [obj] : obj.children.filter(c => c.isMesh && c.name.startsWith(node));
  for (const m of meshes) {
    if (manifest.skipMaterials.includes(m.material.name.split('.')[0])) continue;
    m.material.lightMap = tex;
    m.material.lightMapIntensity = mood.lightMapIntensity;
  }
}
scene.background = new THREE.Color(mood.background);
scene.fog = new THREE.Fog(mood.fog, 150, 2500);
renderer.toneMapping = THREE.AgXToneMapping;
```

Because the lighting is baked, the scene needs no real-time lights. Add an environment map only if you want reflections on the glass. To switch mood, swap the textures and `lightMapIntensity`. Cross-fading two maps needs a small shader change.

This is checked: the build was loaded in three.js r170 in headless Chromium using exactly this code, for both tiers and both moods.

## What is illustrative

- **The four classrooms.** Nobody has photographed the real rooms for this, so their furniture, colours and layout are invented and labelled as such in the file (`extras.label`). Replace them once real photos exist.
- **The hills.** A generic two-ridge silhouette standing in for the Mahabharat range behind Hetauda, not the real skyline.
- **The moods.** The building's real orientation isn't recorded, so "morning" means a warm low sun from the front-right and "day" a soft high sun from the front-left. These are art direction, not the real sun path.
- **Trees, gate position and compound-wall layout.** Simple stand-ins placed where they frame the building; the photos show trees and block walls around the yard but not their layout.

## Matched to the photos (changed from v1)

- Rounded slab corners at both ends of the corridors, with deep blue slab fronts.
- Thin white pipe columns, and light steel railings with close-set bars (0.15 m) on all four corridors, including the ground floor (gap at the steps).
- The ground floor on a raised base faced with grey concrete blocks, with steps at the west end.
- Two-tone walls: yellow up to the door heads, a white band above. A subtle plaster texture.
- Windows with dark brown frames, a centre mullion, a transom and glass. Doors with brown frames and leaves.
- The yard is **compacted gravel**, as in the photos. The brief asked for a paved forecourt; set `FORECOURT_SURFACE = "paved"` in the script to switch.

Kept from the brief although the photos don't show them: the white roof parapet, the water tanks, the flag, the blue gate beam.
