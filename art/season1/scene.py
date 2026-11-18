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
 # Warden
 "refill_round": "indoors, zero waste refill shop at eye level, wooden counter across the bottom, on it at the right three big glass dispensers with small brass taps and a row of empty glass bottles, wooden shelves with jars behind, warm light",
 "rain_patrol": "outdoors, narrow cobblestone village street at dusk in gentle rain, puddles reflecting warm light, cosy houses with warmly lit windows, an iron street lamp at the right, rain streaks, deep blue evening sky",
 "four_corners": "outdoors, sunny little village square where four streets meet, a wooden bench, small shops with striped awnings on every corner, a cafe table, potted plants, bunting, blue sky",
 "wrap_it": "indoors, cosy farmhouse kitchen at eye level, wooden table across the bottom, on the table at the right a bread board with a loaf, folded yellow honeycomb-patterned cloths and a bowl of apples, shelves with jars, window light",
 # Guardian
 "hive_workshop": "indoors, a warm cluttered workshop at eye level, a sturdy workbench across the bottom with a vise, wooden cogwheels and a half-repaired wooden chair, tools hanging in rows on the wooden wall, a hanging work lamp, golden light and long shadows",
 "night_watch": "outdoors, night, view from a rooftop over a sleeping small town, tiled roofs and chimneys, a few warmly lit windows, a church tower, starry deep blue sky with a thin crescent moon, soft mist",
 "river_crossing": "outdoors, a clear shallow river with a line of flat stepping stones crossing it from the bottom left, on the far bank at the right a wooden riverside resort house with a veranda and lanterns, reeds, big trees, dappled afternoon light, reflections in the water",
 "kilo_keeper": "indoors, an old wooden storeroom at eye level, on a heavy table at the right a large antique brass balance scale, one pan piled high with crushed empty bottles hanging low, the other pan empty and high, sunbeams through a small window, dust in the light",
 # Vanguard
 "mountain_pass": "outdoors, dramatic view from a high rocky mountain ridge, steep green rice terraces far below, layers of blue mountains into the distance, big windswept clouds, golden evening light, a stone cairn at the right",
 "storm_flight": "sky, flying high among towering dark storm clouds, slanting rain, a brilliant shaft of golden sunlight breaking through at the right, tiny patchwork fields far below, dramatic light",
 "twelve_flags": "outdoors, a grassy hilltop in the foreground overlooking a wide valley with small villages, a river and fields, many small orange pennant flags on poles dotted across the valley, golden late afternoon light, long shadows, distant mountains",
 "clean_shore": "outdoors, a wide clean sandy beach at sunrise, gentle waves, wet sand reflecting a pink and gold sky, driftwood and a few shells, a wooden fishing boat pulled up at the right, seabirds far away",
 # Paragon
 "golden_hour": "outdoors, epic wide view from a clifftop high above a green island and the sea at sunset, the sun low on the horizon with long golden rays, glowing clouds, a tiny village and harbour far below, sparkling water, majestic",
 "great_hive": "indoors, a vast grand hall built entirely of golden honeycomb, soaring arches and pillars, shafts of sunlight streaming down from high openings, glowing amber and gold, tiny lights, majestic, deep perspective",
 "world_walker": "a huge old illustrated parchment map of a land with mountains, rivers, forests and winding paths filling the whole picture, seen from above at an angle, many small glowing paper lanterns standing on it, warm candlelight, a brass compass rose drawn in the corner",
 "old_oak": "outdoors, a huge ancient oak tree with a wide spreading crown on a gentle hill at the right, many young saplings with stakes growing in the meadow around it, wildflowers, golden late afternoon light with sunbeams through the leaves, distant hills",
}
def post(path, payload):
    req = urllib.request.Request(API + path, data=json.dumps(payload).encode(), headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=1800) as r: return json.load(r)
card, seeds = sys.argv[1], [int(s) for s in sys.argv[2:]]
if card in ("rain_patrol", "night_watch", "storm_flight", "kilo_keeper"): NEG = NEG.replace("dark, gloomy, ", "").replace(", plastic bottle", "")
prompt = f"{SCENES[card]}, {STYLE}"
lp = OUT/"seeds.json"; log = json.load(open(lp)) if lp.exists() else {}
for seed in seeds:
    res = post("/sdapi/v1/txt2img", {"prompt": prompt, "negative_prompt": NEG, "seed": seed, "steps": 30, "cfg_scale": 6.5, "sampler_name": "DPM++ 2M", "scheduler": "karras",
        "width": 1024, "height": 1024, "override_settings": {"sd_model_checkpoint": CKPT}, "override_settings_restore_afterwards": False, "save_images": False})
    fn = OUT/f"{card}_scene_{seed}.png"; fn.write_bytes(base64.b64decode(res["images"][0]))
    log[fn.name] = {"card": card, "seed": seed, "checkpoint": CKPT, "prompt": prompt, "negative": NEG, "settings": "txt2img 1024x1024 steps 30 cfg 6.5 DPM++ 2M karras"}
    json.dump(log, open(lp, "w"), indent=1); print(fn.name, flush=True)
