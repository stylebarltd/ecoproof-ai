#!/usr/bin/env python3
"""Season 1 cards, repairs on a picked bee render before it is cut out: paint over a wrong part (A1111 inpainting, same checkpoint).
Usage: fix.py <render.png> "<x,y x,y ...>" "<what should be there>" seed... → <render>_fix_<seed>.png  (polygon in 1024 px)."""
import base64, io, json, sys, pathlib, urllib.request
import numpy as np, cv2
from PIL import Image
D = pathlib.Path(__file__).parent
CKPT = "sd/waiNSFWIllustrious_v150.safetensors [befc694a29]"
src, poly, what, seeds = sys.argv[1], [tuple(int(v) for v in p.split(",")) for p in sys.argv[2].split()], sys.argv[3], sys.argv[4:]
mask = np.zeros((1024, 1024), np.uint8); cv2.fillPoly(mask, [np.int32(poly)], 255)
b64 = lambda im: base64.b64encode((lambda b: (im.save(b, "PNG"), b.getvalue())[1])(io.BytesIO())).decode()
for seed in seeds:
    req = urllib.request.Request("http://127.0.0.1:7860/sdapi/v1/img2img", headers={"Content-Type": "application/json"}, data=json.dumps({
        "init_images": [b64(Image.open(D/src).convert("RGB"))], "mask": b64(Image.fromarray(mask)), "mask_blur": 6, "inpainting_fill": 1, "inpaint_full_res": False, "denoising_strength": 0.82,
        "prompt": what + ", stylized character illustration, soft matte felt texture, ink outlines, flat colours, plain flat dusty sky blue background",
        "negative_prompt": "spikes, shell, armour, horn, claw, extra limb, extra arm, text, logo, second character, stinger, abdomen", "seed": int(seed), "steps": 30, "cfg_scale": 6.5,
        "sampler_name": "DPM++ 2M", "scheduler": "karras", "width": 1024, "height": 1024, "override_settings": {"sd_model_checkpoint": CKPT}, "save_images": False}).encode())
    im = Image.open(io.BytesIO(base64.b64decode(json.load(urllib.request.urlopen(req, timeout=900))["images"][0])))
    fn = src.replace(".png", f"_fix_{seed}.png"); im.save(D/fn); print(fn, flush=True)
