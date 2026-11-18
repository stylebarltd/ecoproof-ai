#!/usr/bin/env python3
"""The landing's map picture: an illustrated bird's-eye map of a small valley with eco places (café, restaurant, hotel, resort, eco
shop), in the hero island's style (same Illustrious checkpoint and sampler as ../island/gen_island.py run r8, no ControlNet, no hires pass). The pins
and the online-shop marker are drawn by the page on top of it, not painted. Usage: gen_map.py seed..."""
import base64, json, sys, pathlib, urllib.request
OUT = pathlib.Path(__file__).parent
CKPT = "sd/waiNSFWIllustrious_v150.safetensors [befc694a29]"
# Round 1 (61001-61006) drew one hut in close-up: "tourist map of a valley" is not a tag the model knows. Round 2 asks for a
# miniature village seen from far above, with the count and spread of buildings weighted up.
PROMPT = ("masterpiece, best quality, very aesthetic, no humans, scenery, (isometric:1.3), (aerial view of a whole miniature village:1.4), from above, very wide shot, far away, (many tiny buildings:1.4), "
          "cel-shaded illustration, clean dark outlines, flat warm colours, light painterly shading, golden hour, "
          "(golden yellow and amber meadows:1.3) with orange red and white wildflowers, round green trees, (a clear blue river:1.2) winding across the whole picture into a small blue lagoon with a sandy beach, "
          "winding dirt roads connecting ten small buildings scattered far apart all over the land: a tiny cafe with a red awning, a restaurant with a terrace, a boutique hotel with a tiled roof on a hill, "
          "thatched resort bungalows with a pool beside the lagoon, a village shop with a striped canopy, a market stall, a beekeeper's hut with beehives, wooden bridges, fences, hedges, flower beds, "
          "warm cosy storybook atmosphere, highly detailed, consistent outline weight throughout")
NEGATIVE = ("nsfw, nude, suggestive, 1girl, 1boy, people, humans, character, text, english text, letters, labels, map legend, compass rose, speech bubble, signboard with writing, watermark, logo, signature, "
            "photograph, photorealistic, photo collage, 3D render, neon, dark, gloomy, night, snow, blurry, low quality, (green grass:1.3), dominant green, grey sky, sky, clouds, horizon line, modern city, cars, "
            "ground level view, close-up, single building, one house, large building, floating island, cliffs, map pins, location markers, icons, border, frame, paper edge")
def post(path, payload):
    req = urllib.request.Request("http://127.0.0.1:7860"+path, data=json.dumps(payload).encode(), headers={"Content-Type": "application/json"})
    return json.load(urllib.request.urlopen(req, timeout=1800))
log = json.loads((OUT/"seeds.json").read_text()) if (OUT/"seeds.json").exists() else {}
for seed in [int(s) for s in sys.argv[1:]]:
    res = post("/sdapi/v1/txt2img", {"prompt": PROMPT, "negative_prompt": NEGATIVE, "seed": seed, "steps": 35, "cfg_scale": 6.5, "sampler_name": "DPM++ 2M", "scheduler": "karras",
        "width": 1216, "height": 832,
        "override_settings": {"sd_model_checkpoint": CKPT}, "override_settings_restore_afterwards": False, "save_images": False})
    f = OUT/f"map_{seed}.png"; f.write_bytes(base64.b64decode(res["images"][0]))
    log[f.name] = {"seed": seed, "prompt": PROMPT, "negative": NEGATIVE, "checkpoint": CKPT, "settings": "1216x832 steps 35 cfg 6.5 DPM++ 2M karras (no hires pass: it ran out of GPU memory at this size)"}
    (OUT/"seeds.json").write_text(json.dumps(log, indent=1)); print(f.name, flush=True)
