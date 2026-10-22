#!/usr/bin/env python3
"""Photoreal counter scene for the "connect" step: the cashier's view of a blank table card (gets the real QR composited) and a POS screen
(gets the real WordPress plugins page). epicrealismXL via the local A1111 API. Usage: gen.py <run> seed..."""
import base64, io, json, sys, pathlib, urllib.request
from PIL import Image
OUT = pathlib.Path(__file__).parent
CKPT = "sd/epicrealismXL_vxviiCrystalclear.safetensors [3267fd6443]"
PROMPTS = {
 "r1": "photo taken from behind a cafe counter, cashier's point of view looking down at the wooden counter top, a small white acrylic table-top sign holder with a plain blank white card standing on the counter in the centre, to the left a point-of-sale monitor turned slightly toward the camera showing a plain white blank screen, a card payment terminal, a ceramic cup, natural window light, shallow depth of field, 35mm lens, soft bokeh of the cafe in the background, warm wood and cream tones, photorealistic, editorial product photography, high detail",
 "r2": "first-person photo, a cashier looking down at a shop counter: in the foreground a plain blank white folded tent card on the wooden counter, next to it a tablet point-of-sale on a stand showing a plain white blank screen, a small potted plant, receipt paper, soft daylight from a window, shallow depth of field, 35mm, photorealistic, clean, warm wood and cream tones, high detail",
}
NEG = "text, letters, writing, logo, qr code, barcode, icons, user interface, screen content, people, hands, face, cartoon, illustration, painting, 3d render, cgi, blurry, low quality, deformed, watermark, green walls, neon"
def post(path, payload):
    req = urllib.request.Request("http://127.0.0.1:7860"+path, data=json.dumps(payload).encode(), headers={"Content-Type": "application/json"})
    return json.load(urllib.request.urlopen(req, timeout=900))
run, seeds = sys.argv[1], [int(s) for s in sys.argv[2:]]
log = json.loads((OUT/"seeds.json").read_text()) if (OUT/"seeds.json").exists() else {}
for seed in seeds:
    res = post("/sdapi/v1/txt2img", {"prompt": PROMPTS[run], "negative_prompt": NEG, "seed": seed, "steps": 30, "cfg_scale": 6, "sampler_name": "DPM++ 2M", "scheduler": "karras",
        "width": 1024, "height": 1024, "override_settings": {"sd_model_checkpoint": CKPT}, "override_settings_restore_afterwards": False, "save_images": False})
    im = Image.open(io.BytesIO(base64.b64decode(res["images"][0]))); f = OUT/f"{run}_{seed}.png"; im.save(f)
    log[f.name] = {"run": run, "seed": seed, "prompt": PROMPTS[run], "negative": NEG, "checkpoint": CKPT, "settings": "1024x1024 steps 30 cfg 6 DPM++ 2M karras"}
    print("saved", f.name)
(OUT/"seeds.json").write_text(json.dumps(log, indent=1))
