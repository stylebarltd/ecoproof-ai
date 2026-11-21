#!/usr/bin/env python3
"""Round 4, step 3: repaint single zones of a painted map with their own description (inpaint inside the zone's mask from guide.py, off the trail),
because one prompt for the whole map leaves the hills and the shore as empty grass.
Usage: zones.py <land|port> <in.png> <out.png> zone:seed:denoise[:pre|sand]... (in the order given; "pre" lays the guide's colours into the zone first, "sand" plain beach sand,
which keeps scale and places: without it a zone at 0.8 is a lottery and a river never appears)"""
import base64, json, sys, pathlib, urllib.request
OUT = pathlib.Path(__file__).parent; API = "http://127.0.0.1:7860"
CKPT = "sd/waiNSFWIllustrious_v150.safetensors [befc694a29]"
HEAD = "masterpiece, best quality, no humans, scenery, map, from above, top-down view of an illustrated board game map, "
TAIL = ", storybook illustration, clean ink outlines, cel shading, soft warm light, vivid natural colours, rich detail"
ZONE = {
 "meadow": "a wide meadow seen from far above, dotted with many tiny wildflowers, small bushes, a few tiny round straw beehives, small round trees",
 "river": "a winding blue river flowing through green fields, grassy river banks, reeds, small stepping stones, a few small round trees",
 "forest": "a dense forest of round leafy trees, tree canopy from above, a small pond, mushrooms, fallen logs",
 "shore": "a wide sandy beach seen from far above, groves of many small palm trees, patches of beach grass, small rowing boats pulled onto the sand, tiny striped parasols, small rocks",
 "hills": "rolling green hills with terraced rice fields, a patchwork of small farm fields and vegetable gardens, tiny farmhouses with thatched roofs, a windmill, hedges, haystacks",
 "summit": "a range of tall grey rocky mountains with snow caps, pine trees at their feet, boulders, a small mountain hut",
}
NEG = ("nsfw, human, person, character, animal, face, text, letters, numbers, signature, watermark, logo, frame, border, card, dice, game pieces, compass, photograph, dark, gloomy, blurry, "
       "horizon, sky, clouds, isometric, side view, city, cars, road, path, honey, giant flowers, close-up, wooden platform, deck, tent, building, paper map, grid")
def call(path, payload):
    req = urllib.request.Request(API + path, data=json.dumps(payload).encode(), headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=1800) as r: return json.load(r)
def post(path, payload):
    """The GPU is shared and WebUI's memory fragments over a few big renders: on an error free the checkpoint, load it again and try once more."""
    try: return call(path, payload)
    except urllib.error.HTTPError as e:
        print("WebUI", e.code, e.read()[:160], "→ reloading the checkpoint", flush=True)
        call("/sdapi/v1/unload-checkpoint", {}); call("/sdapi/v1/reload-checkpoint", {}); return call(path, payload)
fmt, src, dst, jobs = sys.argv[1], sys.argv[2], sys.argv[3], [a.split(":") for a in sys.argv[4:]]
w, h = {"land": (1536, 864), "port": (704, 1632)}[fmt]; img = base64.b64encode((OUT/src).read_bytes()).decode()
for zone, seed, den, *pre in jobs:
    mask = base64.b64encode((OUT/f"mask_{fmt}_{zone}.png").read_bytes()).decode()
    if pre:   # lay the guide's colours into the zone first: the painter then keeps their scale and places (a river stays a river)
        import numpy as np, cv2
        dec = lambda b: cv2.imdecode(np.frombuffer(base64.b64decode(b), np.uint8), cv2.IMREAD_COLOR)
        pic, g, m = dec(img), cv2.imread(str(OUT/f"guide_{fmt}.png")), cv2.imread(str(OUT/f"mask_{fmt}_{zone}.png"), 0)
        if pre[0] == "sand":   # plain beach sand with a little grain, not the guide: the painter then gives a whole beach, not patches of sand in grass
            sand = np.full(pic.shape, (196, 236, 250), np.uint8); grain = cv2.GaussianBlur(np.random.RandomState(int(seed)).randint(-14, 14, pic.shape[:2]).astype(np.float32), (0, 0), 6)[..., None] * 3
            pic[m > 0] = np.clip(sand + grain, 0, 255).astype(np.uint8)[m > 0]
        else: pic[m > 0] = g[m > 0]
        img = base64.b64encode(cv2.imencode(".png", pic)[1].tobytes()).decode()
    res = post("/sdapi/v1/img2img", {"init_images": [img], "mask": mask, "mask_blur": 10, "inpainting_fill": 1, "inpaint_full_res": False, "denoising_strength": float(den),
        "prompt": HEAD + ZONE[zone] + TAIL, "negative_prompt": NEG, "seed": int(seed), "steps": 32, "cfg_scale": 6.5, "sampler_name": "DPM++ 2M", "scheduler": "karras",
        "width": w, "height": h, "override_settings": {"sd_model_checkpoint": CKPT}, "override_settings_restore_afterwards": False, "save_images": False})
    img = res["images"][0]; print(zone, seed, flush=True)
(OUT/dst).write_bytes(base64.b64decode(img))
lp = OUT/"seeds.json"; log = json.load(open(lp)) if lp.exists() else {}
log[dst] = {"format": fmt, "from": src, "zones": jobs, "checkpoint": CKPT, "prompts": {j[0]: HEAD + ZONE[j[0]] + TAIL for j in jobs}, "negative": NEG, "settings": f"inpaint per zone mask (zone:seed:denoise[:pre = guide colours laid in first]), {w}x{h} steps 32 cfg 6.5 DPM++ 2M karras, mask blur 10, fill original"}
json.dump(log, open(lp, "w"), indent=1); print(dst)
