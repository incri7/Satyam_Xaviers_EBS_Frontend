#!/usr/bin/env bash
# Rebuild the street, render the walk's views at final quality, make their depth maps, and publish them to the
# website under a new version stamp (nginx caches /models/ for a day: a new name is never stale).
# Usage: bash publish.sh            (from website/model/env, Git Bash)
set -e
cd "$(dirname "$0")"
L="$LOCALAPPDATA/Microsoft/WindowsApps/blender-launcher.exe"; H="$(pwd -W)"
# view name : camera : size : samples : exposure : depth reference (metres, the nearest thing that matters)
VIEWS="street:CAM-streetview:1920x1024:256:0:5.0
front:CAM-front:1920x1080:256:0:20.0"
wait_for() { for i in $(seq 1 400); do grep -qs DONE "$1" && return 0; sleep 2; done; echo "timeout: $1"; exit 1; }
rm -f renders/job_street.log renders/job_render.log renders/job_depth.log
"$L" -b "$H/sxebs_environment_v1.blend" --python "$H/job_street.py" </dev/null; wait_for renders/job_street.log
if grep -q Traceback renders/job_street.log; then cat renders/job_street.log; exit 1; fi
ARGS=$(echo "$VIEWS" | awk -F: '{printf "%s:%s:%s:%s ", $2, $3, $4, $5}')
"$L" -b "$H/sxebs_street_v1.blend" --python "$H/job_render.py" -- $ARGS </dev/null; wait_for renders/job_render.log
EXRS=$(echo "$VIEWS" | awk -F: '{c=$2; sub(/^CAM-/, "", c); printf "street_%s.exr ", c}')
"$L" -b --factory-startup --python "$H/job_depth.py" -- $EXRS </dev/null; wait_for renders/job_depth.log
P=../../public/models/env
OLD=$(ls $P | grep -o '_[0-9]\{8\}\.' | head -1 | tr -d '_.')
V=$(date +%m%d%H%M)
echo "$VIEWS" | while IFS=: read name cam size samples exposure zref; do
  c=${cam#CAM-}
  python make_depth.py renders/street_${c}_z.npy $P/${name}_depth_$V.png $zref
  node -e "
  const sharp=require('module').createRequire('$H/../../package.json')('sharp');
  sharp('renders/street_${c}.png').webp({quality:84}).toFile('$P/${name}_color_$V.webp')
    .then(()=>sharp('renders/street_${c}.png').jpeg({quality:90}).toFile('renders/final_v1_${name}.jpg'));"
done
[ -n "$OLD" ] && [ "$OLD" != "$V" ] && rm -f $P/*_$OLD.*
# the signboard the first scroll lifts its lettering from: where its corners fall, then the board and its letters
rm -f renders/job_sign_quad.log
"$L" -b "$H/sxebs_street_v1.blend" --python "$H/job_sign_quad.py" </dev/null; wait_for renders/job_sign_quad.log
cp renders/sign_quad.json ../../src/sections/signQuad.json
rm -f renders/job_plate.log
"$L" -b "$H/sxebs_street_v1.blend" --python "$H/job_plate.py" </dev/null; wait_for renders/job_plate.log
python make_sign_from_render.py $V
# the camera's flight from the street to the front, frame by frame, scrubbed by the scroll
rm -rf renders/travel
"$L" -b "$H/sxebs_street_v1.blend" --python "$H/job_travel.py" -- "$H/renders/travel" 90 1280x720 48 </dev/null; wait_for renders/travel/job_travel.log
python make_travel.py $V
sed -i "s/_${OLD}\./_${V}./g" ../../src/sections/Arrival.tsx ../../src/sections/Travel.tsx
echo "published $V (was $OLD)"
