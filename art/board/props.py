#!/usr/bin/env python3
"""Round 5: small painted objects to stand on the painted maps (place.py), each alone on white, in the maps' own look. No ground under them
(the v1 landmarks stood on round bases and read as islands). Usage: props.py <name|all> seed... → prop_<name>_<seed>.png, logged in seeds.json."""
import base64, json, sys, pathlib, urllib.request
OUT = pathlib.Path(__file__).parent; API = "http://127.0.0.1:7860"
CKPT = "sd/waiNSFWIllustrious_v150.safetensors [befc694a29]"
STYLE = ("masterpiece, best quality, no humans, simple background, white background, one single object centred with empty space around it, seen from above at a three-quarter angle, game asset, "
         "soft matte paper texture, clean dark ink outlines, gentle soft shading, flat warm colours, simple shapes, standing on a small round patch of ")   # + grass or sand. The landmarks' wording: without the patch the objects tilt and
# throw long shadows, with "isometric" they stand on tiled blocks. No "honey": it puts a puddle in every picture.
NEG = ("nsfw, human, person, character, animal, bee, face, text, letters, numbers, signature, watermark, logo, frame, border, card, photograph, realistic, 3d render, glossy, neon, dark, gloomy, "
       "honey, liquid, puddle, slime, dripping, melting, syrup, cluttered, blurry, scenery, landscape, sky, clouds, horizon, ground plane, grass field, shadow on the wall, multiple views, cropped")
SAND = {"palm", "palmtall", "palmpair", "palmshort", "parasol", "beachhut"}
WHAT = {
 "palm": "a single palm tree with a curved trunk and green fronds",
 "palmtall": "a single tall coconut palm tree with a slender straight trunk, green fronds and a few coconuts",
 "palmpair": "two palm trees growing side by side from one spot, one tall and one short, curved trunks and green fronds",
 "palmshort": "a single short stout palm tree with a thick trunk and wide drooping green fronds",
 "parasol": "a red and white striped beach parasol with one small wooden sun lounger under it",
 "beachhut": "a tiny wooden beach hut with a thatched palm leaf roof",
 "hive": "a round woven straw beehive hut with a pointed straw roof and a small wooden door",
 "farm": "a tiny farmhouse with a thatched roof and a small wooden door",
 "windmill": "a small wooden windmill with four cloth sails and a red roof",
 "haystack": "a round golden haystack",
 "cabin": "a tiny log cabin with a snow covered roof and a small chimney",
 "bridge": "a small arched wooden footbridge with railings",
}
def call(path, payload):
    req = urllib.request.Request(API + path, data=json.dumps(payload).encode(), headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=1800) as r: return json.load(r)
def post(path, payload):
    try: return call(path, payload)
    except urllib.error.HTTPError as e:
        print("WebUI", e.code, "→ reloading the checkpoint", flush=True); call("/sdapi/v1/unload-checkpoint", {}); call("/sdapi/v1/reload-checkpoint", {}); return call(path, payload)
which, seeds = sys.argv[1], [int(s) for s in sys.argv[2:]]
lp = OUT/"seeds.json"; log = json.load(open(lp)) if lp.exists() else {}
for key in (WHAT if which == "all" else which.split(",")):
    prompt = f"{WHAT[key]}, {STYLE}{'pale sand' if key in SAND else 'green grass'}"
    for seed in seeds:
        res = post("/sdapi/v1/txt2img", {"prompt": prompt, "negative_prompt": NEG, "seed": seed, "steps": 30, "cfg_scale": 6.5, "sampler_name": "DPM++ 2M", "scheduler": "karras",
            "width": 832, "height": 832, "override_settings": {"sd_model_checkpoint": CKPT}, "override_settings_restore_afterwards": False, "save_images": False})
        fn = OUT/f"prop_{key}_{seed}.png"; fn.write_bytes(base64.b64decode(res["images"][0]))
        log[fn.name] = {"prop": key, "seed": seed, "checkpoint": CKPT, "prompt": prompt, "negative": NEG, "settings": "txt2img 832x832 steps 30 cfg 6.5 DPM++ 2M karras"}
        json.dump(log, open(lp, "w"), indent=1); print(fn.name, flush=True)
