#!/usr/bin/env python3
"""Season 1 cards, step 1: the scene without the bee (txt2img, same checkpoint and drawing style as the rank bees). The real rank bee
(art/v2/ranks/<rank>/<rank>_card.png, transparent) is laid over it by compose.py, so the character never drifts: a first try with
img2img from the rank picture at denoise 0.84 turned the Sentinel into generic cartoon bees.
Usage: scene.py <card> seed... → <card>_scene_<seed>.png, logged in seeds.json."""
import base64, json, sys, pathlib, urllib.request
OUT = pathlib.Path(__file__).parent; API = "http://127.0.0.1:7860"
CKPT = "sd/waiNSFWIllustrious_v150.safetensors [befc694a29]"
STYLE = ("no humans, scenery, full picture edge to edge, soft matte paper texture, clean ink outlines, light crosshatching only in shadow areas, gentle soft shading, "
         "flat warm colours, kraft brown, honey, cream and dusty blue palette, simple shapes, uncluttered")
NEG = ("nsfw, human, person, character, animal, bee, face, text, letters, numbers, signature, watermark, logo, frame, border, ornament, card, trading card, icon, circle, round badge, medallion, photograph, realistic, 3d render, glossy, plastic, neon, dark, gloomy, cluttered, noisy hatching, blurry, plastic bottle, plastic bag, honey drips, liquid splash, food, cake, dessert, cream, butter, cheese, tofu, sauce")
# The bee stands at the lower left (compose.py), so what the card is about sits at the right and above.
SCENES = {
 "morning_cup": "indoors, cosy small cafe, wooden counter across the bottom, on the counter at the right a tall reusable bamboo coffee cup with a lid, steam, big window with warm morning sunlight, shelf with ceramic cups on the wall",
 "market_day": "outdoors, farmers market, wooden market stall with a red and cream striped awning at the top, wooden crates full of carrots, tomatoes, apples and leafy greens at the right, a cream cotton tote bag full of vegetables standing on the table, sunny day, blue sky",
 "first_trail": "outdoors, countryside, at the right a tall wooden signpost with two blank wooden arrow boards pointing left and right, winding dirt path, soft rolling hills, a few round trees, big pale morning sky with small clouds",
 "first_proof": "indoors, cosy small zero waste shop seen at eye level, wooden shop counter across the bottom, behind it wooden shelves with rows of glass jars, refill dispensers and woven baskets, a hanging plant, warm afternoon sunlight from a window at the left, on the counter at the right a small wooden stand holding a blank cream card and a wooden rubber stamp",
}
def post(path, payload):
    req = urllib.request.Request(API + path, data=json.dumps(payload).encode(), headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=1800) as r: return json.load(r)
card, seeds = sys.argv[1], [int(s) for s in sys.argv[2:]]
prompt = f"{SCENES[card]}, {STYLE}"
lp = OUT/"seeds.json"; log = json.load(open(lp)) if lp.exists() else {}
for seed in seeds:
    res = post("/sdapi/v1/txt2img", {"prompt": prompt, "negative_prompt": NEG, "seed": seed, "steps": 30, "cfg_scale": 6.5, "sampler_name": "DPM++ 2M", "scheduler": "karras",
        "width": 1024, "height": 1024, "override_settings": {"sd_model_checkpoint": CKPT}, "override_settings_restore_afterwards": False, "save_images": False})
    fn = OUT/f"{card}_scene_{seed}.png"; fn.write_bytes(base64.b64decode(res["images"][0]))
    log[fn.name] = {"card": card, "seed": seed, "checkpoint": CKPT, "prompt": prompt, "negative": NEG, "settings": "txt2img 1024x1024 steps 30 cfg 6.5 DPM++ 2M karras"}
    json.dump(log, open(lp, "w"), indent=1); print(fn.name, flush=True)
