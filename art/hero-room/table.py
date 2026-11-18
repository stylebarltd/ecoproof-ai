#!/usr/bin/env python3
"""A bigger table with eco products for the hero's room (Pola, 2026-11-18: the wicker table was too small for the postcard stand, and
the room should feel like an eco hotel). A whole new scene with such a table loses the guest, so only the lower left of tea_1004.png
is repainted (A1111 inpainting, epicrealismXL); the guest, her cup and the light stay. Usage: table.py seed... → table_<seed>.png."""
import base64, io, json, sys, pathlib, urllib.request
import numpy as np, cv2
from PIL import Image
D = pathlib.Path(__file__).parent
CKPT = "sd/epicrealismXL_vxviiCrystalclear.safetensors [3267fd6443]"
AREA = [(0, 400), (415, 400), (415, 600), (600, 640), (640, 832), (0, 832)]   # the plant, the wicker table and the floor around it; not her hand and cup
mask = np.zeros((832, 1216), np.uint8); cv2.fillPoly(mask, [np.int32(AREA)], 255)
b64 = lambda im: base64.b64encode((lambda b: (im.save(b, "PNG"), b.getvalue())[1])(io.BytesIO())).decode()
PROMPT = ("a large solid wooden table in the foreground seen slightly from above, the table is full of neatly arranged zero waste eco products: a glass water carafe with a drinking glass, "
  "three refillable amber glass pump bottles, a glass jar of loose leaf tea, bars of natural soap wrapped in brown paper tied with string, a bamboo toothbrush in a ceramic cup, "
  "a woven basket with rolled white linen towels, a wooden tray, a small potted green plant, a folded cotton tote bag, eco boutique hotel room, "
  "late afternoon golden hour sunlight, warm glow, photorealistic, editorial travel photography, high detail")
for seed in sys.argv[1:]:
    req = urllib.request.Request("http://127.0.0.1:7860/sdapi/v1/img2img", headers={"Content-Type": "application/json"}, data=json.dumps({
        "init_images": [b64(Image.open(D/"tea_1004.png"))], "mask": b64(Image.fromarray(mask)), "mask_blur": 12, "inpainting_fill": 1, "inpaint_full_res": False,
        "denoising_strength": 0.92, "prompt": PROMPT, "negative_prompt": "text, letters, logo, card, paper sign, plastic bottles, people, hands, clutter, cartoon, blurry, deformed, watermark",
        "seed": int(seed), "steps": 30, "cfg_scale": 6, "sampler_name": "DPM++ 2M", "scheduler": "karras", "width": 1216, "height": 832,
        "override_settings": {"sd_model_checkpoint": CKPT}, "save_images": False}).encode())
    im = Image.open(io.BytesIO(base64.b64decode(json.load(urllib.request.urlopen(req, timeout=900))["images"][0])))
    im.save(D/f"table_{seed}.png"); print(seed, flush=True)
