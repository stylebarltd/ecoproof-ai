#!/bin/bash
# Wait until ComfyUI has no job, let it release its models, then render the rough plates with the WebUI.
cd "$(dirname "$0")"
q() { curl -s --max-time 5 http://127.0.0.1:8188/queue | python3 -c "import json,sys; q=json.load(sys.stdin); print(len(q['queue_running'])+len(q['queue_pending']))" 2>/dev/null || echo 0; }
n=0; while [ "$n" -lt 3 ]; do if [ "$(q)" = "0" ]; then n=$((n+1)); else n=0; fi; sleep 20; done
curl -s -X POST http://127.0.0.1:8188/free -H 'Content-Type: application/json' -d '{"unload_models":true,"free_memory":true}' >/dev/null; sleep 5
curl -s -X POST http://127.0.0.1:7860/sdapi/v1/unload-checkpoint >/dev/null; curl -s -X POST http://127.0.0.1:7860/sdapi/v1/reload-checkpoint >/dev/null
for a in "land path" "land nopath" "port path" "port nopath"; do python3 gen.py $a 71001 71002 71003 || exit 1; done
