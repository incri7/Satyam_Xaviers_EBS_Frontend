# Builds the street scene: run in Blender (exec this file). Everything is rebuilt from data/street.
import math, os
HERE = r'C:/Users/legio/Workspace/Satyam_Xaviers_EBS_Frontend/website/model/env'
G = {'__name__': '__main__',
     'SX_DATA': HERE + '/data/street',
     'SX_SKIP_ROADS': (362517635,),     # the driveway: env_street draws it
     'SX_TOWN_R': 190, 'SX_ROAD_R': 450, 'SX_TREE_R': 190,
     # houses seen in the client's photos and Street View (OpenStreetMap ids)
     'SX_OVERRIDE': {
         388610110: {'floors': 2},
         388610114: {'floors': 3, 'wall': '#eec347', 'ledge': '#c8262b', 'tin': False, 'shops': False},   # right, past the brick wall: yellow, red trim
     },
     # 12:40 on 11 October 2026, when the client took the photos: the light they show
     'SX_SUN': (53.6, 200.5)}
# keep trees off the driveway and the school's plot
M = (4.0, 7.3); b = math.radians(241.0); U = (math.sin(b), math.cos(b)); L = (-U[1], U[0])
def W(s, t): return (M[0] + U[0] * s + L[0] * t, M[1] + U[1] * s + L[1] * t)
G['SX_CLEAR'] = [[W(-2, -3.3), W(32, -3.3), W(32, 5.6), W(-2, 5.6)],
                 [W(19, -10), W(62, -10), W(62, 12), W(19, 12)],
                 [W(-16, -9), W(-1, -9), W(-1, 9), W(-16, 9)]]       # the road where Google's camera stood
# footprints corrected from Street View: the shop house faces the road beside the driveway's mouth,
# the cream house stands behind the sign and the gate
G['SX_OVERRIDE'][388610111] = {'floors': 3, 'wall': '#bdb8ad', 'tin': False, 'shops': True,
                               'p': [W(0.6, 5.8), W(12.0, 5.8), W(12.0, 15.5), W(0.6, 15.5)]}
G['SX_OVERRIDE'][388610115] = {'floors': 3, 'wall': '#f1dac6', 'tin': True, 'roof': '#b4474c', 'shops': False,
                               'p': [W(4.5, -15.0), W(4.5, -6.2), W(11.5, -6.2), W(11.5, -15.0)]}
# the yellow house with red trim, just behind the brick wall further in (the client's video)
G['SX_OVERRIDE'][388610114]['p'] = [W(12.0, -10.5), W(12.0, -4.4), W(21.0, -4.4), W(21.0, -10.5)]
# the house with stacked balconies on the driveway's left, past the shop house (IMG_3017, the video)
G['SX_OVERRIDE'][388610110] = {'floors': 2, 'wall': '#d6d3cb', 'ledge': '#8f949a', 'tin': False,
                               'p': [W(12.6, 6.4), W(26.0, 6.4), W(26.0, 15.0), W(12.6, 15.0)]}
import bpy
for n in ('Cube', 'Light', 'Camera'):          # the new-file defaults
    o = bpy.data.objects.get(n)
    if o: bpy.data.objects.remove(o, do_unlink=True)
for f in ('env_terrain.py', 'env_town.py', 'env_trees.py', 'env_street.py', 'env_school.py'):
    p = f'{HERE}/{f}'
    exec(compile(open(p, encoding='utf-8').read(), p, 'exec'), G)
