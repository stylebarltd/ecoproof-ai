#!/bin/bash
# third pass, 2026-11-19: closer to the Sentinel original (0.70) for the felt look; the Warden gets its map painted in
PY="/home/pola/Apps/Data/Packages/Stable Diffusion WebUI/venv/bin/python"; cd "$(dirname "$0")"
"$PY" persona.py mountain_pass 0.70 84001 84002 84003 84004 84005 84006
"$PY" persona.py mountain_pass 0.74 85001 85002 85003 85004
"$PY" persona.py golden_hour 0.70 84001 84002 84003 84004 84005 84006
for c in rain_patrol great_hive market_day; do "$PY" persona.py $c 0.70 84001 84002 84003 84004; done
"$PY" persona.py river_crossing 0.70 84001 84002 84003 84004 84005 84006
M="two small black bee hands holding a large unfolded cream paper map with dotted route lines and small drawn hills, the open map held in front of the chest"
"$PY" fix.py four_corners_bee_d74_81004.png "450,560 840,560 880,960 420,960" "$M" 86001 86002 86003
"$PY" fix.py four_corners_bee_d74_81003.png "450,540 840,540 880,960 420,960" "$M" 86001 86002 86003
echo ALL DONE
