# Model brief: the school building

Build a 3D model of the real school building for the website's hero and scroll story. The photos in `website/refs/building/` are the source. Model only what they show; where a photo doesn't show something, keep it simple and plain.

## How to build it

Python with Blender's engine as a module (`pip install bpy`, no interface needed). Keep the script in `website/model/build_school.py` so it can be re-run and changed.

## The building

- **Size:** about 26 m wide, 4 floors, about 3.2 m per floor. Rooms about 6 m deep, with an open corridor about 2.4 m deep along the front.
- **Front:** 6 bays. Each bay has a door and a window on the yellow wall, white columns at the bay edges, and white floor slabs with a blue edge.
- **Railings:** on the upper three corridors. Blue top rail, a mid rail, and thin vertical bars about every 0.25 m. Use instancing; don't model hundreds of separate objects.
- **East end:** a stair tower, slightly darker yellow, with narrow windows.
- **Roof:** a white parapet, 2 black cylindrical water tanks, and a Nepal flag on a pole (the double pennant: crimson with a blue border).
- **Gate:** two pillars and a blue beam, in front of the building.
- **Colours:** wall `#F0C84B`, tower `#E2B53B`, rail `#2D5FA6`, slabs and columns `#F6F6F2`, glass `#22304D`, doors `#3A4A6B`, tanks `#1D2026`.
- **Look:** an architect's model. Matte, soft, clean edges with a small bevel. Bake ambient occlusion into the textures if you can, so it looks good without heavy real-time lighting.

## Named parts (the website animates these)

| Node | What |
|---|---|
| `floor_0` to `floor_3` | Everything on that floor: rooms, slab, columns, doors, windows, rails. Origin at the floor's base, so it can grow upward from scale 0. |
| `roof` | Roof slab, parapet, tanks, flag. Origin at the roof's base. |
| `tower` | The stair tower. Origin at the ground. |
| `gate` | The gate. Origin at the ground. |
| `win_f0_a`, `win_f0_b` … `win_f3_a`, `win_f3_b` | One flat window pane per photo slot, 2 per floor, portrait 3:4, facing the front. The site maps the class photos onto these. Suggested bays: floor 0 bays 2 and 3, floor 1 bays 3 and 4, floor 2 bays 4 and 5, floor 3 bays 5 and 6 (counting from the west). |

## Output

- `website/public/models/school.glb`: glTF binary, Y up, transforms applied, Draco compression, under 8 MB.
- `website/model/previews/`: 3 PNG renders (front, three-quarter view from the front-left, and a close-up of one balcony).
- Commit to the branch `website/model`.

## Rules

- Invent nothing that isn't in the photos or this brief.
- Children's photos never go into the model file; the site adds them at runtime.
