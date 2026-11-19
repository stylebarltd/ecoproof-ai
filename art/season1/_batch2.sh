#!/bin/bash
# second pass, 2026-11-19: the guest bees that lost the felt look or the colour, and the challenge bees that kept their rank pose
PY="/home/pola/Apps/Data/Packages/Stable Diffusion WebUI/venv/bin/python"; cd "$(dirname "$0")"
for c in market_day mountain_pass great_hive rain_patrol golden_hour; do
  "$PY" persona.py $c 0.72 81001 81002 81003 81004 || echo "FAILED $c"
  "$PY" persona.py $c 0.77 82001 82002 82003 82004 || echo "FAILED $c"
done
for c in four_corners river_crossing world_walker; do
  "$PY" persona.py $c 0.74 81001 81002 81003 81004 || echo "FAILED $c"
  INIT=S "$PY" persona.py $c 0.78 82001 82002 82003 82004 || echo "FAILED $c"
done
"$PY" scene.py world_walker_wall 83001 83002 83003 83004
"$PY" scene.py world_walker_land 83001 83002 83003 83004
"$PY" scene.py river_crossing 83001 83002 83003 83004
echo ALL DONE
