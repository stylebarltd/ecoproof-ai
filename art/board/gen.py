#!/usr/bin/env python3
"""The journey board as an illustrated game board (Pola, 2026-11-20: a green eco world, one landscape plate for desktop and a separate
portrait plate for phones). Rough plates only: the land without tiles (the app draws the trail, tiles, stations and bee on top).
Same checkpoint and drawing style as the Season 1 scenes (../season1/scene.py). The trail climbs from the hive village to the summit:
left to right on the landscape plate, bottom to top on the portrait one.
Usage: gen.py <land|port> <path|nopath> seed... → <format>_<variant>_<seed>.png, logged in seeds.json."""
import base64, json, sys, pathlib, urllib.request
OUT = pathlib.Path(__file__).parent; API = "http://127.0.0.1:7860"
CKPT = "sd/waiNSFWIllustrious_v150.safetensors [befc694a29]"
STYLE = ("no humans, scenery, illustrated board game map, isometric bird's eye view from high above, whole land visible, full picture edge to edge, soft matte paper texture, "
         "clean ink outlines, gentle soft shading, flat warm colours, sage green, kraft brown, honey, cream and dusty blue palette, simple shapes, tiny details, uncluttered open ground")
NEG = ("nsfw, human, person, character, animal, bee, face, text, letters, numbers, signature, watermark, logo, frame, border, card, icon, photograph, realistic, 3d render, glossy, plastic, neon, "
       "dark, gloomy, cluttered, noisy hatching, blurry, horizon, sky, clouds, close-up, modern city, skyscraper, cars, road markings")
WORLD = {
 "land": "a wide green land seen from above, at the far left a sunny flower meadow with a small village of round straw beehive houses, then a leafy forest with a clear winding river and a wooden bridge, "
         "in the middle a sandy shore with a small harbour, a wooden beach resort and a cafe with a striped awning, then high green hills with rice terraces and a market, "
         "at the far right a tall mountain with a golden glowing summit, sea along the lower edge",
 "port": "a tall green land seen from above, at the bottom a sunny flower meadow with a small village of round straw beehive houses, above it a leafy forest with a clear winding river and a wooden bridge, "
         "in the middle a sandy bay with a small harbour, a wooden beach resort and a cafe with a striped awning, above it high green hills with rice terraces and a market, "
         "at the top a tall mountain with a golden glowing summit",
}
PATH = {"path": ", (one long winding pale dirt footpath crossing the whole land from the village to the summit:1.3)", "nopath": ""}
SIZE = {"land": (1536, 768), "port": (768, 1344)}
def post(path, payload):
    req = urllib.request.Request(API + path, data=json.dumps(payload).encode(), headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=1800) as r: return json.load(r)
fmt, var, seeds = sys.argv[1], sys.argv[2], [int(s) for s in sys.argv[3:]]
prompt = f"{WORLD[fmt]}{PATH[var]}, {STYLE}"; neg = NEG + ("" if var == "path" else ", road, path, footpath")
w, h = SIZE[fmt]; lp = OUT/"seeds.json"; log = json.load(open(lp)) if lp.exists() else {}
for seed in seeds:
    res = post("/sdapi/v1/txt2img", {"prompt": prompt, "negative_prompt": neg, "seed": seed, "steps": 30, "cfg_scale": 6.5, "sampler_name": "DPM++ 2M", "scheduler": "karras",
        "width": w, "height": h, "override_settings": {"sd_model_checkpoint": CKPT}, "override_settings_restore_afterwards": False, "save_images": False})
    fn = OUT/f"{fmt}_{var}_{seed}.png"; fn.write_bytes(base64.b64decode(res["images"][0]))
    log[fn.name] = {"format": fmt, "variant": var, "seed": seed, "checkpoint": CKPT, "prompt": prompt, "negative": neg, "settings": f"txt2img {w}x{h} steps 30 cfg 6.5 DPM++ 2M karras"}
    json.dump(log, open(lp, "w"), indent=1); print(fn.name, flush=True)
