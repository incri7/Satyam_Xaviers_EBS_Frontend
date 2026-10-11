# Headless job: build the street, render both cameras (colour + depth), save the scene.
import bpy, sys, time, traceback
HERE = r'C:/Users/legio/Workspace/Satyam_Xaviers_EBS_Frontend/website/model/env'
log = open(HERE + '/renders/job_street.log', 'w', buffering=1)
sys.stdout = sys.stderr = log
t = time.time()
try:
    exec(compile(open(HERE + '/build_street.py', encoding='utf-8').read(), 'build_street.py', 'exec'), {'__name__': '__main__'})
    print('built', round(time.time() - t, 1))
    bpy.ops.wm.save_as_mainfile(filepath=HERE + '/sxebs_street_v1.blend', compress=True)
    print('saved', round(time.time() - t, 1))
except Exception:
    traceback.print_exc()
print('DONE')
log.close()
