#!/usr/bin/env python3
"""Photoreal "Pick your door" scenes with blank surfaces for the real assets: the QR card (restaurant, hotel) and a receipt plus a phone
screen (eco store). epicrealismXL via the local A1111 API, same settings as art/steps/connect. Usage: gen.py <scene> seed..."""
import base64, io, json, sys, pathlib, urllib.request
from PIL import Image
OUT = pathlib.Path(__file__).parent
CKPT = "sd/epicrealismXL_vxviiCrystalclear.safetensors [3267fd6443]"
COMMON = "natural light, shallow depth of field, 35mm lens, photorealistic, editorial photography, warm wood and cream tones, high detail"
PROMPTS = {
 "restaurant": "photo taken from behind a restaurant counter, the cashier's point of view looking out across a warm cosy Thai restaurant dining room with wooden tables, rattan lamps and plants, guests softly out of focus in the background, sharply in focus in the foreground on the wooden counter a single plain blank white acrylic table-top sign holder with an empty white card standing upright and facing the camera, nothing written on it, a ceramic cup beside it, " + COMMON,
 "hotel": "photo of a calm boutique resort hotel room in northern Thailand, teak furniture, a bed with crisp white linen, a window with a green garden view softly out of focus, in the sharp foreground on a wooden bedside table a single plain blank white folded tent card standing upright facing the camera, next to it a ceramic carafe, a glass and a small plant, soft morning light, " + COMMON,
 "store": "close-up photo from above at the wooden counter of a small zero-waste eco shop, a long printed white paper shop receipt lying flat and fully visible on the counter, a hand holding a smartphone above the receipt to photograph it, the phone screen plain white and blank, glass refill jars, beeswax food wraps and a cotton tote bag softly out of focus around it, " + COMMON,
}
NEG = "text, letters, writing, logo, qr code, barcode, icons, user interface, screen content, cartoon, illustration, painting, 3d render, cgi, blurry, low quality, deformed, extra fingers, watermark, plastic bottles, green walls, neon"
def post(path, payload):
    req = urllib.request.Request("http://127.0.0.1:7860"+path, data=json.dumps(payload).encode(), headers={"Content-Type": "application/json"})
    return json.load(urllib.request.urlopen(req, timeout=900))
scene, seeds = sys.argv[1], [int(s) for s in sys.argv[2:]]
log = json.loads((OUT/"seeds.json").read_text()) if (OUT/"seeds.json").exists() else {}
for seed in seeds:
    res = post("/sdapi/v1/txt2img", {"prompt": PROMPTS[scene], "negative_prompt": NEG, "seed": seed, "steps": 30, "cfg_scale": 6, "sampler_name": "DPM++ 2M", "scheduler": "karras",
        "width": 1024, "height": 1024, "override_settings": {"sd_model_checkpoint": CKPT}, "override_settings_restore_afterwards": False, "save_images": False})
    im = Image.open(io.BytesIO(base64.b64decode(res["images"][0]))); f = OUT/f"{scene}_{seed}.png"; im.save(f)
    log[f.name] = {"scene": scene, "seed": seed, "prompt": PROMPTS[scene], "negative": NEG, "checkpoint": CKPT, "settings": "1024x1024 steps 30 cfg 6 DPM++ 2M karras"}
    (OUT/"seeds.json").write_text(json.dumps(log, indent=1)); print(f.name, flush=True)
