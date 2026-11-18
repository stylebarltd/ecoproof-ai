#!/usr/bin/env python3
"""The hero's background (Pola, 2026-11-18): a guest in an eco hotel room in late-afternoon golden light, warm, comfy and clean, with a
blank A6 card on a wooden holder for compose.py to print the hotel postcard on. epicrealismXL via the local A1111 API, 1216x832.
Usage: gen.py <scene> seed..."""
import base64, io, json, sys, pathlib, urllib.request
from PIL import Image
OUT = pathlib.Path(__file__).parent
CKPT = "sd/epicrealismXL_vxviiCrystalclear.safetensors [3267fd6443]"
COMMON = "late afternoon golden hour sunlight streaming through sheer linen curtains, warm glow, long soft shadows, calm, cosy, very clean and tidy, natural materials, shallow depth of field, 35mm lens, photorealistic, editorial travel photography, warm wood and cream tones, high detail"
CARD = "sharply in focus in the foreground on the right a single tall portrait format plain blank white postcard standing perfectly upright and vertical in the slot of a small low wooden block card holder on a wooden table, seen straight from the front, the empty white card is completely blank, nothing written on it, the card is large in the frame, "
PROMPTS = {
 "tea": "photo of a bright eco boutique hotel room, " + CARD + "behind it softly out of focus a relaxed happy woman in a linen shirt sits in a rattan armchair by the big window holding a cup of tea and looking out at a green garden, a neatly made bed with white linen, wooden floor, green plants, " + COMMON,
 "bed": "photo of a bright eco boutique hotel room, " + CARD + "behind it softly out of focus a relaxed smiling woman in a white bathrobe sits on the neatly made bed with white linen reading a book, a big window with a green garden view, wooden floor, rattan lamp, green plants, " + COMMON,
 "window": "photo of a bright eco boutique hotel room, " + CARD + "behind it softly out of focus a relaxed man in a linen shirt stands at the open balcony door with a cup of coffee looking out over green hills, a neatly made bed with white linen, wooden floor, rattan chair, green plants, " + COMMON,
 "desk": "photo of a bright eco boutique hotel room, in the foreground a long wide solid wooden table seen slightly from above, sharply in focus, on the table a glass water carafe with two glasses, a stainless steel reusable water bottle, refillable amber glass pump bottles, a glass jar of loose leaf tea, a bar of soap wrapped in brown paper, a folded cotton tote bag, a small potted plant and a woven basket, an empty clear area in the middle of the table, behind the table softly out of focus a relaxed happy woman in a linen shirt sits in a rattan armchair by the big wooden window holding a cup of tea and looking out at a green garden, a neatly made bed with white linen, " + COMMON,
 "desk2": "photo of a bright eco boutique hotel room, in the foreground the left half of the frame is a large solid wooden desk seen slightly from above, sharply in focus, on the desk a glass water carafe with a glass, refillable amber glass pump bottles, a glass jar of loose leaf tea, a bar of soap wrapped in brown paper, a rolled linen towel and a small potted plant arranged at the back of the desk, the front of the desk is empty, on the right softly out of focus a relaxed happy woman in a linen shirt sits in a rattan armchair by the big wooden window holding a cup of tea, side view, a neatly made bed with white linen, " + COMMON,
}
NEG = "text, letters, writing, logo, qr code, barcode, icons, picture frame, photo frame, landscape format card, folded card, tent card, two cards, phone, laptop, cartoon, illustration, painting, 3d render, cgi, blurry foreground, low quality, deformed, extra fingers, bad hands, watermark, plastic bottles, green walls, neon, clutter, nudity"
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
