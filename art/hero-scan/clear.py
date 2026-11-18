#!/usr/bin/env python3
"""Take the phone off the desk in hand2_1513.png (A1111 inpainting, epicrealismXL), so the postcard stand can go there.
Usage: clear.py seed... → desk_<seed>.png."""
import base64, io, json, sys, pathlib, urllib.request
import numpy as np, cv2
from PIL import Image
D = pathlib.Path(__file__).parent
CKPT = "sd/epicrealismXL_vxviiCrystalclear.safetensors [3267fd6443]"
mask = np.zeros((832, 1216), np.uint8); cv2.fillPoly(mask, [np.int32([(350, 560), (640, 520), (940, 660), (930, 720), (660, 765), (360, 610)])], 255)
mask = cv2.dilate(mask, np.ones((25, 25), np.uint8))
b64 = lambda im: base64.b64encode((lambda b: (im.save(b, "PNG"), b.getvalue())[1])(io.BytesIO())).decode()
for seed in sys.argv[1:]:
    req = urllib.request.Request("http://127.0.0.1:7860/sdapi/v1/img2img", headers={"Content-Type": "application/json"}, data=json.dumps({
        "init_images": [b64(Image.open(D/"hand2_1513.png"))], "mask": b64(Image.fromarray(mask)), "mask_blur": 10, "inpainting_fill": 0, "inpaint_full_res": False,
        "denoising_strength": 0.9, "prompt": "an empty smooth solid wooden desk top, wood grain, warm golden sunlight, photorealistic", "negative_prompt": "phone, object, item, paper, cup, text, hole, crack",
        "seed": int(seed), "steps": 30, "cfg_scale": 6, "sampler_name": "DPM++ 2M", "scheduler": "karras", "width": 1216, "height": 832,
        "override_settings": {"sd_model_checkpoint": CKPT}, "save_images": False}).encode())
    im = Image.open(io.BytesIO(base64.b64decode(json.load(urllib.request.urlopen(req, timeout=900))["images"][0])))
    im.save(D/f"desk_{seed}.png"); print(seed, flush=True)
