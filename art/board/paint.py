#!/usr/bin/env python3
"""Round 4: paint the whole map from the colour guide (guide.py), img2img.
Usage: paint.py <land|port> <style> <denoise> seed... → map_<fmt>_<style>_<denoise>_<seed>.png, logged in seeds.json.
A second pass over a first result adds detail without moving the trail: INIT=map_land_ill_0.58_75001.png TAG=b paint.py land ill 0.55 seed."""
import base64, json, os, sys, pathlib, urllib.request
OUT = pathlib.Path(__file__).parent; API = "http://127.0.0.1:7860"
SCENE = ("top-down view of an illustrated board game map of a green island world, bird's-eye view from directly above, a flower meadow with small straw beehive huts, "
         "a dense forest of round leafy trees, a sandy beach with palm trees and a turquoise lagoon, rolling green hills with rice terraces and small farm fields, "
         "a range of tall grey rocky mountains with snow caps, a winding blue river, a sandy dirt footpath winding across the whole land, blue sea around the coast, "
         "rich detail, every part of the land filled with trees, fields, rocks and little houses")
STYLES = {
 "ill": ("sd/waiNSFWIllustrious_v150.safetensors [befc694a29]", "masterpiece, best quality, no humans, scenery, map, from above, " + SCENE + ", storybook illustration, clean ink outlines, cel shading, soft warm light, vivid natural colours",
         "nsfw, human, person, character, animal, face, text, letters, numbers, signature, watermark, logo, frame, border, card, dice, game pieces, compass, photograph, dark, gloomy, blurry, horizon, sky, clouds, isometric, side view, city, cars, road markings"),
 "3d": ("sd/epicrealismXL_vxviiCrystalclear.safetensors [3267fd6443]", SCENE + ", stylized 3d render, miniature tabletop diorama landscape, soft clay and felt textures, tiny low poly trees, soft daylight, gentle shadows, highly detailed, octane render",
         "people, animals, text, letters, numbers, labels, signature, watermark, logo, frame, border, cards, dice, game pieces, table, horizon, sky, clouds, side view, perspective tilt, blurry, dark, city, cars, tokens, circles"),
}
SIZE = {"land": (1536, 864), "port": (704, 1632)}
def call(path, payload):
    req = urllib.request.Request(API + path, data=json.dumps(payload).encode(), headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=1800) as r: return json.load(r)
def post(path, payload):
    """The GPU is shared and WebUI's memory fragments over a few big renders: on an error free the checkpoint, load it again and try once more."""
    try: return call(path, payload)
    except urllib.error.HTTPError as e:
        print("WebUI", e.code, e.read()[:160], "→ reloading the checkpoint", flush=True)
        call("/sdapi/v1/unload-checkpoint", {}); call("/sdapi/v1/reload-checkpoint", {}); return call(path, payload)
fmt, style, den, seeds = sys.argv[1], sys.argv[2], float(sys.argv[3]), [int(s) for s in sys.argv[4:]]
ckpt, prompt, neg = STYLES[style]; w, h = SIZE[fmt]; src = os.environ.get("INIT", f"guide_{fmt}.png"); tag = os.environ.get("TAG", "")
init = base64.b64encode((OUT/src).read_bytes()).decode()
lp = OUT/"seeds.json"; log = json.load(open(lp)) if lp.exists() else {}
for seed in seeds:
    res = post("/sdapi/v1/img2img", {"init_images": [init], "denoising_strength": den, "prompt": prompt, "negative_prompt": neg, "seed": seed, "steps": 32, "cfg_scale": 6,
        "sampler_name": "DPM++ 2M", "scheduler": "karras", "width": w, "height": h, "override_settings": {"sd_model_checkpoint": ckpt}, "override_settings_restore_afterwards": False, "save_images": False})
    fn = OUT/f"map{tag}_{fmt}_{style}_{den}_{seed}.png"; fn.write_bytes(base64.b64decode(res["images"][0]))
    log[fn.name] = {"format": fmt, "seed": seed, "checkpoint": ckpt, "prompt": prompt, "negative": neg, "settings": f"img2img from {src} denoise {den}, {w}x{h} steps 32 cfg 6 DPM++ 2M karras"}
    json.dump(log, open(lp, "w"), indent=1); print(fn.name, flush=True)
