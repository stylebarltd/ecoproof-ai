#!/usr/bin/env python3
"""The hero's "scan moment" (Pola, 2026-11-18): a hand holding a phone with a blank screen in golden light, an eco café or hotel desk
behind it; compose.py puts the postcard on the desk and the app on the screen. epicrealismXL via the local A1111 API, 1216x832.
Usage: gen.py <scene> seed..."""
import base64, io, json, sys, pathlib, urllib.request
from PIL import Image
OUT = pathlib.Path(__file__).parent
CKPT = "sd/epicrealismXL_vxviiCrystalclear.safetensors [3267fd6443]"
COMMON = "late afternoon golden hour sunlight streaming through sheer linen curtains, warm glow, long soft shadows, calm, cosy, very clean and tidy, natural materials, shallow depth of field, 35mm lens, photorealistic, editorial travel photography, warm wood and cream tones, high detail"
CARD = "sharply in focus in the foreground on the right a single tall portrait format plain blank white postcard standing perfectly upright and vertical in the slot of a small low wooden block card holder on a wooden table, seen straight from the front, the empty white card is completely blank, nothing written on it, the card is large in the frame, "
LIGHT = "late afternoon golden hour sunlight, warm glow, shallow depth of field, 50mm lens, photorealistic, editorial lifestyle photography, warm wood and cream tones, high detail"
PROMPTS = {
 "hand": "phone mockup photo, close-up of a woman's hand holding a modern smartphone upright on the right side of the frame, the phone screen faces the camera straight on and is completely plain blank white, thin black bezel, sharply in focus, natural hand with five fingers, linen sleeve, behind it softly out of focus the wooden counter of a cosy eco cafe with glass jars, a ceramic cup, a green plant and a sunlit window, the left half of the frame is an empty wooden counter top, " + LIGHT,
 "hand2": "phone mockup photo, close-up of a hand holding a modern smartphone upright in the right third of the frame, the phone screen faces the camera straight on and is completely plain blank white, thin black bezel, sharply in focus, natural hand, behind it softly out of focus the wooden reception desk of an eco boutique hotel with a glass water carafe, a green plant, rattan chairs and a sunlit garden window, the left half of the frame is an empty wooden desk top, " + LIGHT,
}
NEG = "text, letters, writing, logo, qr code, barcode, icons, picture frame, photo frame, landscape format card, folded card, tent card, two cards, cartoon, illustration, painting, 3d render, cgi, blurry foreground, low quality, deformed, extra fingers, bad hands, two phones, text on screen, apps, user interface, watermark, plastic bottles, green walls, neon, clutter, nudity"
def post(path, payload):
    req = urllib.request.Request("http://127.0.0.1:7860"+path, data=json.dumps(payload).encode(), headers={"Content-Type": "application/json"})
    return json.load(urllib.request.urlopen(req, timeout=900))
scene, seeds = sys.argv[1], [int(s) for s in sys.argv[2:]]
log = json.loads((OUT/"seeds.json").read_text()) if (OUT/"seeds.json").exists() else {}
for seed in seeds:
    res = post("/sdapi/v1/txt2img", {"prompt": PROMPTS[scene], "negative_prompt": NEG, "seed": seed, "steps": 30, "cfg_scale": 6, "sampler_name": "DPM++ 2M", "scheduler": "karras",
        "width": 1216, "height": 832, "override_settings": {"sd_model_checkpoint": CKPT}, "override_settings_restore_afterwards": False, "save_images": False})
    im = Image.open(io.BytesIO(base64.b64decode(res["images"][0]))); f = OUT/f"{scene}_{seed}.png"; im.save(f)
    log[f.name] = {"scene": scene, "seed": seed, "prompt": PROMPTS[scene], "negative": NEG, "checkpoint": CKPT, "settings": "1216x832 steps 30 cfg 6 DPM++ 2M karras"}
    (OUT/"seeds.json").write_text(json.dumps(log, indent=1)); print(f.name, flush=True)
