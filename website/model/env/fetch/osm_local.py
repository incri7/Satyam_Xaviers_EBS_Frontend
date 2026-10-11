# OpenStreetMap (fetch/osm.mjs output) -> local metres around the origin, as the Blender scripts read it.
# Usage: python osm_local.py ../data/street   (origin: where the client stood on Bhairav Road, photo GPS)
import json, math, random, sys
out = sys.argv[1] if len(sys.argv) > 1 else '../data/street'
lat0, lon0 = 27.41780, 85.03971
kx = math.cos(math.radians(lat0)) * 111320.0; ky = 110574.0
j = json.load(open(f'{out}/osm_geom.json', encoding='utf-8'))
B, R, A = [], [], []
widths = {'primary': 12, 'secondary': 8, 'tertiary': 7, 'residential': 5.5, 'unclassified': 5, 'service': 3.5,
          'track': 3.5, 'footway': 2, 'path': 1.5, 'living_street': 4.5, 'trunk': 14}
for e in j['elements']:
    g = e.get('geometry'); t = e.get('tags', {})
    if not g: continue
    pts = [(round((p['lon'] - lon0) * kx, 2), round((p['lat'] - lat0) * ky, 2)) for p in g]
    if 'building' in t:
        if pts[0] == pts[-1]: pts = pts[:-1]
        lv = t.get('building:levels'); rnd = random.Random(e['id'])
        floors = int(float(lv)) if lv and float(lv) > 0 else rnd.choice([2, 2, 3, 3, 3, 4])
        B.append({'id': e['id'], 'p': pts, 'floors': floors, 'tags': {k: v for k, v in t.items() if k in ('name', 'amenity', 'building')}})
    elif 'highway' in t:
        R.append({'id': e['id'], 'p': pts, 'kind': t['highway'], 'w': widths.get(t['highway'], 5), 'surface': t.get('surface', ''),
                  'name': t.get('name:en') or t.get('name', '')})
    else:
        A.append({'id': e['id'], 'p': pts, 'tags': t})
json.dump({'origin': [lat0, lon0], 'buildings': B, 'roads': R, 'areas': A}, open(f'{out}/osm_local.json', 'w', encoding='utf-8'))
print(len(B), 'buildings', len(R), 'roads')
