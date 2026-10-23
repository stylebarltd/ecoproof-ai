#!/usr/bin/env python3
"""Repaint the phone and the fingers over its screen on store_203 so the whole screen shows (A1111 img2img inpaint, epicrealismXL).
Usage: inpaint_hand.py seed... → store_203_hand_<seed>.png; the EcoProof screen is composited afterwards by compose.py."""
import base64, io, json, sys, pathlib, urllib.request, urllib.error
from PIL import Image, ImageDraw
OUT = pathlib.Path(__file__).parent
CKPT = "sd/epicrealismXL_vxviiCrystalclear.safetensors [3267fd6443]"
PROMPT = ("close-up photo, a hand holding a black smartphone by its side edges with the thumb on the bezel, the phone screen fully visible and plain white, "
          "nothing covering the screen, over a wooden shop counter, natural light, photorealistic, editorial photography, high detail")
NEG = "fingers on the screen, thumb on the screen, text, letters, logo, user interface, screen content, extra fingers, deformed hand, cartoon, illustration, blurry, low quality"
def b64(im):
    b = io.BytesIO(); im.save(b, "PNG"); return base64.b64encode(b.getvalue()).decode()
base = Image.open(OUT/"store_203.png").convert("RGB")
mask = Image.new("L", base.size, 0)
ImageDraw.Draw(mask).polygon([(240,770),(415,705),(555,775),(555,830),(470,875),(330,885),(240,850)], fill=255)
mask.save(OUT/"store_203_mask.png")
log = json.loads((OUT/"seeds.json").read_text())
for seed in [int(s) for s in sys.argv[1:]]:
    req = urllib.request.Request("http://127.0.0.1:7860/sdapi/v1/img2img", headers={"Content-Type": "application/json"}, data=json.dumps({
        "init_images": [b64(base)], "mask": b64(mask), "mask_blur": 8, "inpainting_fill": 1, "inpaint_full_res": True, "inpaint_full_res_padding": 96,
        "denoising_strength": 0.85, "prompt": PROMPT, "negative_prompt": NEG, "seed": seed, "steps": 30, "cfg_scale": 6, "sampler_name": "DPM++ 2M",
        "scheduler": "karras", "width": 1024, "height": 1024, "save_images": False}).encode())
    try: res = json.load(urllib.request.urlopen(req, timeout=900))
    except urllib.error.HTTPError as e: sys.exit(e.read()[:2000].decode())
    im = Image.open(io.BytesIO(base64.b64decode(res["images"][0])))
    f = OUT/f"store_203_hand_{seed}.png"; im.save(f)
    log[f.name] = {"scene": "store inpaint", "from": "store_203.png", "seed": seed, "prompt": PROMPT, "negative": NEG, "checkpoint": CKPT,
                   "settings": "img2img inpaint, mask store_203_mask.png, blur 8, fill original, only masked pad 96, denoise 0.85, steps 30 cfg 6 DPM++ 2M karras"}
    (OUT/"seeds.json").write_text(json.dumps(log, indent=1)); print(f.name, flush=True)
