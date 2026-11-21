#!/usr/bin/env python3
"""The journey board's landmarks: one painted picture per area, standing on the drawn ground (components/PassportMap.tsx). Each is
painted alone on a plain white background (txt2img, the cards' checkpoint and drawing style), which this model does well; whole
painted boards did not work (gen.py, gen2.py, regions.py: rounds 1 to 3). cut.py removes the background.
Usage: landmarks.py <terrain|all> seed... → lm_<terrain>_<seed>.png, logged in seeds.json."""
import base64, json, sys, pathlib, urllib.request
OUT = pathlib.Path(__file__).parent; API = "http://127.0.0.1:7860"
CKPT = "sd/waiNSFWIllustrious_v150.safetensors [befc694a29]"
STYLE = ("masterpiece, best quality, no humans, simple background, white background, one single object centred with empty space around it, seen from above at a three-quarter angle, game asset, "
         "soft matte paper texture, clean dark ink outlines, gentle soft shading, flat warm colours, kraft brown, warm yellow, cream and sage green palette, simple shapes, standing on a small round patch of ground")  # no "honey" here: it puts a puddle of honey in every picture
NEG = ("nsfw, human, person, character, animal, bee, face, text, letters, numbers, signature, watermark, logo, frame, border, card, photograph, realistic, 3d render, glossy, neon, dark, gloomy, "
       "honey, liquid, puddle, slime, dripping, melting, syrup, cluttered, blurry, scenery, landscape, sky, clouds, horizon, ground plane, grass field, shadow on the wall, multiple views, cropped")
WHAT = {
 "meadow": "a tiny village of three round woven straw beehive huts with small wooden doors, a little flower bed and a wooden fence between them",
 "forest": "a small wooden cabin under one big round leafy tree, a little wooden footbridge over a short piece of blue stream beside it",
 "shore": "a small wooden beach cafe hut with a red and cream striped awning, two tables with parasols, a palm tree and a little wooden jetty",
 "hills": "a wooden market stall with a striped awning and crates of vegetables beside a small wooden windmill on a grassy mound",
 "summit": "a rocky mountain peak with patches of snow and a small golden shrine with a pointed roof on its top, a few small pine trees at its foot",
}
def post(path, payload):
    req = urllib.request.Request(API + path, data=json.dumps(payload).encode(), headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=1800) as r: return json.load(r)
which, seeds = sys.argv[1], [int(s) for s in sys.argv[2:]]
lp = OUT/"seeds.json"; log = json.load(open(lp)) if lp.exists() else {}
for key in (WHAT if which == "all" else [which]):
    prompt = f"{WHAT[key]}, {STYLE}"
    for seed in seeds:
        res = post("/sdapi/v1/txt2img", {"prompt": prompt, "negative_prompt": NEG, "seed": seed, "steps": 30, "cfg_scale": 6.5, "sampler_name": "DPM++ 2M", "scheduler": "karras",
            "width": 832, "height": 832, "override_settings": {"sd_model_checkpoint": CKPT}, "override_settings_restore_afterwards": False, "save_images": False})
        fn = OUT/f"lm_{key}_{seed}.png"; fn.write_bytes(base64.b64decode(res["images"][0]))
        log[fn.name] = {"landmark": key, "seed": seed, "checkpoint": CKPT, "prompt": prompt, "negative": NEG, "settings": "txt2img 832x832 steps 30 cfg 6.5 DPM++ 2M karras"}
        json.dump(log, open(lp, "w"), indent=1); print(fn.name, flush=True)
