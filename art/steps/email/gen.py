#!/usr/bin/env python3
"""Photoreal scene for "The QR code in the order email": an eco shopper's home with a tablet whose screen is blank, for the order email
(render.php) to be put on by compose.py. epicrealismXL via the local A1111 API, same settings as art/postcard/gen.py.
Usage: gen.py <scene> seed..."""
import base64, io, json, sys, pathlib, urllib.request
from PIL import Image
OUT = pathlib.Path(__file__).parent
CKPT = "sd/epicrealismXL_vxviiCrystalclear.safetensors [3267fd6443]"
COMMON = "natural light, shallow depth of field, 35mm lens, photorealistic, editorial photography, warm wood and cream tones, high detail"
PROMPTS = {
 "home": "photo of a wooden kitchen table in a cosy sustainable home, sharply in focus in the foreground a tablet computer standing upright on a small wooden stand, the tablet faces the camera straight on, its large screen is switched on and shows a completely plain blank white page, thin black bezel, the tablet is large in the frame, beside it an opened kraft cardboard parcel with paper padding, a glass jar and a cup of tea, behind it a bright kitchen with open wooden shelves, glass storage jars, a cotton tote bag and green plants softly out of focus, " + COMMON,
 "sofa": "photo of a cosy sustainable living room, sharply in focus in the foreground a tablet computer standing upright on a small wooden stand on a wooden coffee table, the tablet faces the camera straight on, its large screen is switched on and shows a completely plain blank white page, thin black bezel, the tablet is large in the frame, beside it an opened kraft cardboard parcel with paper padding and a cup of tea, behind it a linen sofa with cushions, a woven basket and green plants softly out of focus, " + COMMON,
 "parcel": "photo of a wooden kitchen table in a cosy sustainable home, in the foreground an opened kraft cardboard shipping box with brown paper padding, a plain blank white postcard standing upright leaning against the front of the box and facing the camera, completely blank, nothing written on it, next to the box a tablet computer standing upright on a small wooden stand facing the camera straight on, its screen switched on and showing a completely plain blank white page, thin black bezel, the box, the card and the tablet are large in the frame and sharply in focus, a glass jar and a cup of tea beside them, behind them a bright kitchen with open wooden shelves, glass storage jars, a cotton tote bag and green plants softly out of focus, " + COMMON,
}
NEG = "text, letters, writing, logo, icons, user interface, apps, screen content, picture on screen, keyboard, laptop, phone, hands, people, cartoon, illustration, painting, 3d render, cgi, blurry, low quality, deformed, watermark, plastic bottles, plastic packaging, neon"
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
