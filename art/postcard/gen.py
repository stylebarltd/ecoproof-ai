#!/usr/bin/env python3
"""Photoreal scenes with one blank portrait A6 card on a stand, for the real EcoProof postcard (components/Postcard.tsx) to be printed onto
by compose.py: café counter (the "connect" step), restaurant table and hotel room (the owner doors). epicrealismXL via the local A1111
API, same settings as art/doors/v2. Usage: gen.py <scene> seed..."""
import base64, io, json, sys, pathlib, urllib.request
from PIL import Image
OUT = pathlib.Path(__file__).parent
CKPT = "sd/epicrealismXL_vxviiCrystalclear.safetensors [3267fd6443]"
COMMON = "natural light, shallow depth of field, 35mm lens, photorealistic, editorial photography, warm wood and cream tones, high detail"
CARD = "sharply in focus in the foreground a single tall portrait format plain blank white postcard standing upright in a small low wooden block card holder, the empty white card faces the camera straight on, completely blank, nothing written on it, the card is large in the frame"
PROMPTS = {
 "cafe": "photo of the wooden counter of a cosy independent café, " + CARD + ", beside it a ceramic cup of coffee, behind it an espresso machine, shelves with cups and jars and a window softly out of focus, " + COMMON,
 "restaurant": "photo of a wooden table in a warm cosy Thai restaurant, " + CARD + ", beside it a small vase with a green sprig and a water glass, behind it the dining room with rattan lamps, plants and guests softly out of focus, " + COMMON,
 "hotel": "photo of a calm boutique resort hotel room in northern Thailand, " + CARD + " on a teak bedside table, next to it a glass carafe of water and a glass, behind it a bed with crisp white linen and a window with a green garden view softly out of focus, soft morning light, " + COMMON,
 "hotel2": "close-up photo of a teak bedside table in a calm boutique resort hotel room in northern Thailand, on the table " + CARD + ", next to the card a glass carafe of water, behind it softly out of focus a bed with crisp white linen and a window with a green garden view, soft morning light, " + COMMON,
 "reception": "photo of the wooden reception desk of a boutique resort hotel in northern Thailand, " + CARD + ", beside it a brass service bell and a room key with a wooden tag, behind it the open lobby with rattan armchairs, tropical plants and a terrace with a green garden view softly out of focus, " + COMMON,
 "reception2": "photo of the wooden reception desk of a boutique resort hotel in northern Thailand, sharply in focus in the foreground a single tall portrait format plain blank white postcard standing perfectly upright and vertical in the slot of a small low wooden block card holder, seen straight from the front at eye level, the empty white card is completely blank, nothing written on it, the card is large in the frame, beside it a brass service bell, behind it the open lobby with rattan armchairs, tropical plants and a terrace with a green garden view softly out of focus, " + COMMON,
 "store": "photo of the wooden counter of a small zero-waste eco shop, " + CARD + ", beside it glass refill jars and a folded cotton tote bag, behind it wooden shelves with jars, soap bars and brushes softly out of focus, " + COMMON,
}
NEG = "text, letters, writing, logo, qr code, barcode, icons, picture frame, photo frame, landscape format card, folded card, tent card, two cards, cartoon, illustration, painting, 3d render, cgi, blurry, low quality, deformed, hands, watermark, plastic bottles, green walls, neon"
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
