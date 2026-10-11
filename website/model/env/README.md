# The school's real surroundings (Blender)

The website's starting point: the school as seen from Bhairav Road, Hetauda-4, built from real data and the client's photos.

The current locked version is **v1**. Its outputs are:
- `renders/final_v1_street.jpg`
- `renders/final_v1_driveway.jpg`
- `renders/final_v1_compare.jpg`: Google Street View and the client's video frame, each above the matching render.

The website's home page opens on these two views, moved in 2.5D (`website/src/sections/Arrival.tsx`). The images are in `website/public/models/env/`.

## Where the place is

| What | Value | Source |
|---|---|---|
| Origin (0, 0) | 27.41780 N, 85.03971 E, on Bhairav Road | GPS in the client's photos IMG_3014–3017 (±4 m) |
| Driveway | Leaves the road at `M = (4.0, 7.3)` and runs on a bearing of **241°**, about 60 m | OpenStreetMap path 362517635; the photos' compass reads 225–238° |
| School building | About 35 m along the driveway | GPS of IMG_3019/3020 (29 m in, at the building's corner) |
| Frame | Metres; X east, Y north; Z is height above the ground at the origin (456 m) | |

The client's map pin (27.420080, 85.033653) is about 700 m off. Do not use it.

## What is real, and what is placed by hand

**Real:**
- **Terrain and hills:** Copernicus/SRTM elevation from AWS Terrain Tiles.
- **Footprints and roads:** OpenStreetMap, © OpenStreetMap contributors.
- **The signboard:** cut from IMG_3014 and squared up.
- **The light:** the sun as it stood at 12:40 on 11 October 2026, when the client took the photos.

**Placed by hand, from the photos and Street View (`build_street.py`):**
- the two houses at the driveway's mouth;
- the balconied house on the driveway's left;
- the yellow house with red trim on its right;
- the brick wall, the gate, the trees at the mouth;
- the buses, as photographed on 11 October.

**Invented, in Hetauda's style:**
- the heights and colours of every other house;
- the trees between houses.

The textures and trees are Poly Haven CC0.

**The school** (`env_school.py`) is modelled from the client's photos (IMG_3017, 3019, 3020, 3082–3086):
- **Shape:** the short end faces the driveway, its front corridor about 30 m in. Four corridor levels over a semi-basement run across the front and turn down the long side round a rounded corner.
- **Corridors:** slate-blue slab edges with rain streaks, steel railings, and thin steel posts from slab to slab.
- **Roof:** rebar left up for a future floor, a stair head, the AC unit and the flag.
- **Facades:** the painted storeys and the banner come from `make_school_textures.py`. The doors and windows follow the photos (window, door, window, window, door, window across the front). The interior and the back are not modelled.

## Rebuild

Run everything headless (no Blender window needed):

```sh
L="$LOCALAPPDATA/Microsoft/WindowsApps/blender-launcher.exe"
H="C:/Users/legio/Workspace/Satyam_Xaviers_EBS_Frontend/website/model/env"

# 1. Data (once): elevation, OpenStreetMap, then the local conversion
cd fetch
LAT=27.41780 LON=85.03971 node dem.mjs 12 2
LAT=27.41780 LON=85.03971 node dem.mjs 14 2
node osm.mjs
python osm_local.py ../data/street

# 2. Build the street and save sxebs_street_v1.blend
#    The trees come from sxebs_environment_v1.blend's ENV-tree_lib collection.
"$L" -b "$H/sxebs_environment_v1.blend" --python "$H/job_street.py"

# 3. Render: colour PNG plus multilayer EXR with depth
"$L" -b "$H/sxebs_street_v1.blend" --python "$H/job_render.py" -- CAM-streetview:1920x1024:256 CAM-img3017:1080x1612:192

# 4. Depth for the website
"$L" -b --factory-startup --python "$H/job_depth.py" -- street_streetview.exr street_img3017.exr
python make_depth.py renders/street_streetview_z.npy out.raw 5.0
#    then encode it to PNG and the colour to WebP (see the commit that added v1)
```

The launcher returns at once, and Blender runs in the background. Each job writes `renders/job_*.log` and ends it with `DONE`.

**Name the website's images with a version** (`street_color_<stamp>.webp`). nginx caches `/models/` for a day, so a reused file name shows the old picture.

## Files

| File | Builds |
|---|---|
| `env_terrain.py` | Terrain (two elevation grids, with Earth curvature), sky, sun, render settings |
| `env_town.py` | Haze, terrain material, buildings from OpenStreetMap (ledges, parapets, stair heads, tanks), roads |
| `env_trees.py` | Trees and shrubs on open ground, kept off buildings, roads and the `SX_CLEAR` areas |
| `env_street.py` | The driveway by hand: walls, sign, admission board, gate, poles and wires, balconies, trees at the mouth, buses, the two cameras |
| `env_school.py` | The school's main block: core, corridor slabs, railings, posts, roof details, banner |
| `make_school_textures.py` | Paints the school's storeys, slab edge, basement gate; cuts the banner from IMG_3019 (run with local Python) |
| `build_street.py` | Settings for the street (data folder, radii, sun, per-house overrides, the school placeholder), then runs the four scripts above |
| `job_*.py` | Headless jobs: build, render, depth |
| `fetch/` | Data download: elevation, OpenStreetMap, satellite reference, overlay |

`data/polyhaven/`, the `.blend` files, the EXR and NPY passes and the large PNGs stay out of git (see `.gitignore`). The scripts rebuild them.
