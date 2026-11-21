#!/usr/bin/env python3
"""Round 3 of the board plates: each of the five regions is painted on its own (txt2img, where this checkpoint is strong: rounds 1
and 2 in gen.py / gen2.py could not hold five regions in one wide picture), as a strip: upright for the landscape board, lying for
the portrait one. join.py puts the strips together.
Usage: regions.py <land|port> seed... → r_<format>_<region>_<seed>.png, logged in seeds.json."""
import base64, json, sys, pathlib, urllib.request
OUT = pathlib.Path(__file__).parent; API = "http://127.0.0.1:7860"
CKPT = "sd/waiNSFWIllustrious_v150.safetensors [befc694a29]"
STYLE = ("masterpiece, best quality, no humans, scenery, from above, high angle bird's eye view of the ground, the ground fills the whole picture edge to edge, illustrated board game map, "
         "soft matte paper texture, clean ink outlines, gentle soft shading, flat warm colours, sage green, kraft brown, honey, cream and dusty blue palette, simple shapes, small buildings, open ground between things")
NEG = ("nsfw, human, person, character, animal, face, text, letters, numbers, signature, watermark, logo, frame, border, card, compass, photograph, realistic, 3d render, glossy, neon, dark, gloomy, "
       "cluttered, noisy hatching, blurry, horizon, sky, clouds, sun, isometric cube, floating island, diorama, cliff edge, modern city, cars, close-up, huge building")
REGIONS = {  # in trail order
 "meadow": "a sunny flower meadow, a small village of round straw beehive huts with little wooden doors, wildflowers, low wooden fences, haystacks, light green grass",
 "forest": "a leafy forest with a grassy clearing, many round green trees, a winding blue river with a small wooden bridge, mushrooms, ferns, darker green",
 "shore": "a sandy beach and a shallow turquoise bay, a small wooden jetty with a rowing boat, a wooden beach resort house with a veranda, a small cafe with a red and cream striped awning, palm trees, pale sand",
 "hills": "green hills with curved rice terraces, a wooden market stall with a striped awning and crates of vegetables, stone steps, a windmill, yellow green fields",
 "summit": "a rocky mountain top, grey brown rocks, a few pine trees, patches of snow, a glowing golden honeycomb shrine in the middle, golden light rays, stone stairs",
}
SIZE = {"land": (576, 1024), "port": (1024, 576)}
def post(path, payload):
    req = urllib.request.Request(API + path, data=json.dumps(payload).encode(), headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=1800) as r: return json.load(r)
fmt, seeds = sys.argv[1], [int(s) for s in sys.argv[2:]]; w, h = SIZE[fmt]
lp = OUT/"seeds.json"; log = json.load(open(lp)) if lp.exists() else {}
for seed in seeds:
    for key, what in REGIONS.items():
        prompt = f"{what}, {STYLE}"
        res = post("/sdapi/v1/txt2img", {"prompt": prompt, "negative_prompt": NEG, "seed": seed, "steps": 30, "cfg_scale": 6.5, "sampler_name": "DPM++ 2M", "scheduler": "karras",
            "width": w, "height": h, "override_settings": {"sd_model_checkpoint": CKPT}, "override_settings_restore_afterwards": False, "save_images": False})
        fn = OUT/f"r_{fmt}_{key}_{seed}.png"; fn.write_bytes(base64.b64decode(res["images"][0]))
        log[fn.name] = {"format": fmt, "region": key, "seed": seed, "checkpoint": CKPT, "prompt": prompt, "negative": NEG, "settings": f"txt2img {w}x{h} steps 30 cfg 6.5 DPM++ 2M karras"}
        json.dump(log, open(lp, "w"), indent=1); print(fn.name, flush=True)
