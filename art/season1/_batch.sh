#!/bin/bash
# all sixteen remaining cards: five bee tries and four scene tries each
PY="/home/pola/Apps/Data/Packages/Stable Diffusion WebUI/venv/bin/python"; cd "$(dirname "$0")"
for c in refill_round rain_patrol four_corners wrap_it hive_workshop night_watch river_crossing kilo_keeper mountain_pass storm_flight twelve_flags clean_shore golden_hour great_hive world_walker old_oak; do
  "$PY" persona.py $c - 71001 71002 71003 71004 71005 || echo "FAILED bee $c"
  "$PY" scene.py $c 72001 72002 72003 72004 || echo "FAILED scene $c"
done
echo ALL DONE
