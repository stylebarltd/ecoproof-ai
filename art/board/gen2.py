#!/usr/bin/env python3
"""Round 2 of the board plates: img2img from the colour sketch (sketch.py), so the regions stand in trail order.
Usage: gen2.py <land|port> <denoise> seed... → <format>2_<denoise>_<seed>.png, logged in seeds.json."""
import base64, json, sys, pathlib, urllib.request
OUT = pathlib.Path(__file__).parent; API = "http://127.0.0.1:7860"
CKPT = "sd/waiNSFWIllustrious_v150.safetensors [befc694a29]"
PROMPT = ("masterpiece, best quality, no humans, scenery, from above, aerial view of one whole green island in a calm pale blue sea, hand-drawn illustrated adventure map of a land, "
          "a flower meadow with a small village of round straw beehive huts, a leafy forest with a winding blue river and a wooden bridge, a sandy bay with a small harbour, a wooden resort and a cafe with a striped awning, "
          "green hills with rice terraces and a market, a tall rocky mountain with a glowing golden summit, large readable landmarks, wide open grassy ground between them, "
          "soft matte paper texture, clean ink outlines, gentle soft shading, flat warm colours, sage green, kraft brown, honey, cream and dusty blue palette, simple shapes, uncluttered")
NEG = ("nsfw, human, person, character, animal, face, text, letters, numbers, signature, watermark, logo, frame, border, card, compass, photograph, realistic, 3d render, glossy, neon, dark, gloomy, "
       "cluttered, noisy hatching, blurry, horizon, sky, clouds, sun, isometric cube, floating island, diorama, cliff edge, modern city, cars, grid, checkered fields")
SIZE = {"land": (1280, 640), "port": (640, 1120)}  # 1536x768 ran out of memory while Ollama held 6 GB of the card; go back up for the final plate
def post(path, payload):
    req = urllib.request.Request(API + path, data=json.dumps(payload).encode(), headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=1800) as r: return json.load(r)
fmt, den, seeds = sys.argv[1], float(sys.argv[2]), [int(s) for s in sys.argv[3:]]
w, h = SIZE[fmt]; init = base64.b64encode((OUT/f"sketch_{fmt}.png").read_bytes()).decode()
lp = OUT/"seeds.json"; log = json.load(open(lp)) if lp.exists() else {}
for seed in seeds:
    res = post("/sdapi/v1/img2img", {"init_images": [init], "denoising_strength": den, "prompt": PROMPT, "negative_prompt": NEG, "seed": seed, "steps": 32, "cfg_scale": 6.5,
        "sampler_name": "DPM++ 2M", "scheduler": "karras", "width": w, "height": h, "override_settings": {"sd_model_checkpoint": CKPT}, "override_settings_restore_afterwards": False, "save_images": False})
    fn = OUT/f"{fmt}2_{den}_{seed}.png"; fn.write_bytes(base64.b64decode(res["images"][0]))
    log[fn.name] = {"format": fmt, "seed": seed, "checkpoint": CKPT, "prompt": PROMPT, "negative": NEG, "settings": f"img2img from sketch_{fmt}.png denoise {den}, {w}x{h} steps 32 cfg 6.5 DPM++ 2M karras"}
    json.dump(log, open(lp, "w"), indent=1); print(fn.name, flush=True)
