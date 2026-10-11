#!/usr/bin/env bash
# Rebuild the street, render both views at final quality, make the depth maps, and publish them to the
# website under a new version stamp (nginx caches /models/ for a day: a new name is never stale).
# Usage: bash publish.sh            (from website/model/env, Git Bash)
set -e
cd "$(dirname "$0")"
L="$LOCALAPPDATA/Microsoft/WindowsApps/blender-launcher.exe"; H="$(pwd -W)"
wait_for() { for i in $(seq 1 300); do grep -qs DONE "$1" && return 0; sleep 2; done; echo "timeout: $1"; exit 1; }
rm -f renders/job_street.log renders/job_render.log renders/job_depth.log
"$L" -b "$H/sxebs_environment_v1.blend" --python "$H/job_street.py" </dev/null; wait_for renders/job_street.log
if grep -q Traceback renders/job_street.log; then cat renders/job_street.log; exit 1; fi
"$L" -b "$H/sxebs_street_v1.blend" --python "$H/job_render.py" -- CAM-streetview:1920x1024:256 CAM-img3017:1080x1612:192 </dev/null; wait_for renders/job_render.log
"$L" -b --factory-startup --python "$H/job_depth.py" -- street_streetview.exr street_img3017.exr </dev/null; wait_for renders/job_depth.log
python make_depth.py renders/street_streetview_z.npy renders/sv_depth.raw 5.0
python make_depth.py renders/street_img3017_z.npy renders/dw_depth.raw 4.0
P=../../public/models/env
OLD=$(ls $P | grep -o '_[0-9]\{8\}\.' | head -1 | tr -d '_.')
V=$(date +%m%d%H%M)
node -e "
const fs=require('fs'), sharp=require('module').createRequire('$H/../../package.json')('sharp');
const P='$P/', V='$V';
(async()=>{
await sharp(fs.readFileSync('renders/sv_depth.raw'),{raw:{width:1920,height:1024,channels:1}}).png({compressionLevel:9}).toFile(P+'street_depth_'+V+'.png');
await sharp('renders/street_streetview.png').webp({quality:84}).toFile(P+'street_color_'+V+'.webp');
await sharp(fs.readFileSync('renders/dw_depth.raw'),{raw:{width:1080,height:1612,channels:1}}).png({compressionLevel:9}).toFile(P+'driveway_depth_'+V+'.png');
await sharp('renders/street_img3017.png').webp({quality:84}).toFile(P+'driveway_color_'+V+'.webp');
await sharp('renders/street_streetview.png').jpeg({quality:90}).toFile('renders/final_v1_street.jpg');
await sharp('renders/street_img3017.png').jpeg({quality:90}).toFile('renders/final_v1_driveway.jpg');
})()"
rm -f renders/*.raw
[ -n "$OLD" ] && [ "$OLD" != "$V" ] && rm -f $P/*_$OLD.*
sed -i "s/_${OLD}\./_${V}./g" ../../src/sections/Arrival.tsx
echo "published $V (was $OLD)"
