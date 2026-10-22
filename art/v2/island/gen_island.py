#!/usr/bin/env python3
"""Hero island candidates via the local A1111 API. Usage: gen_island.py [seed ...]"""
import base64, json, sys, time, urllib.request, pathlib

API = "http://127.0.0.1:7860"
OUT = pathlib.Path(__file__).parent
CKPT = "sd/waiNSFWIllustrious_v150.safetensors [befc694a29]"

PROMPTS = {}
PROMPTS["r1"] = ("a floating island in the sky seen from a slightly elevated three-quarter view, cel-shaded illustration with clean dark outlines and flat warm colours, light painterly shading, golden-hour light, cream and peach sunset sky with soft clouds, the island has terracotta and brown rocky cliffs with roots hanging below, a blue river winding across it ending in a small waterfall off the left edge, honey-coloured meadows full of wildflowers in orange, red and white, a few round green trees and bushes, CENTRE: a small wooden beekeeper's hut with three beehives in the flower meadow, LEFT of centre by the river: a cosy little café with an awning and two outdoor tables, RIGHT of centre: a small village eco shop with a striped canopy and crates of goods, FAR RIGHT on a hill: a small boutique hotel with a terrace, FAR LEFT near the waterfall: a market stall under a cloth roof, a winding dirt path connecting all five places, a few honeybees flying along the path, warm cosy storybook atmosphere, wide panoramic composition, lots of calm sky above the island for a headline, highly detailed, consistent outline weight throughout")
NEGATIVES = {}
NEGATIVES["r1"] = ("nsfw, nude, suggestive, photograph, photorealistic, photo collage, 3D render, neon, dark, gloomy, night, snow, people, humans, text, letters, signs with writing, watermark, logo, blurry, low quality, dominant green, grey sky, modern city, cars")

PROMPTS["r2"] = ("masterpiece, best quality, very aesthetic, no humans, scenery, (floating island in the sky:1.4), one island floating high among the clouds, seen from above at a slightly elevated three-quarter angle, cel-shaded illustration, clean dark outlines, flat warm colours, light painterly shading, golden hour, cream and peach sunset sky, soft clouds, terracotta and brown rocky cliffs underneath the island with roots hanging below, blue river winding across the island into a small waterfall pouring off the left edge, (honey-coloured golden-yellow meadows:1.3) full of orange red and white wildflowers, a few round green trees and bushes, a small wooden beekeeper's hut with three beehives in the middle of the meadow, a tiny cafe with an awning and two outdoor tables by the river left of the hut, a small village shop with a striped canopy and wooden crates right of the hut, a small hotel with a terrace on a hill at the far right, a market stall under a cloth roof near the waterfall at the far left, a winding dirt path connecting the five buildings, tiny honeybees flying along the path, warm cosy storybook atmosphere, wide panoramic composition, lots of empty calm sky above the island, highly detailed, consistent outline weight")
NEGATIVES["r2"] = ("nsfw, nude, suggestive, 1girl, 1boy, people, humans, character, text, english text, letters, speech bubble, signboard with writing, watermark, logo, signature, photograph, photorealistic, photo collage, 3D render, neon, dark, gloomy, night, snow, blurry, low quality, (green grass:1.3), dominant green, grey sky, modern city, cars, ground level view, mountains in the background, horizon line")
PROMPTS["r3"] = ("masterpiece, best quality, very aesthetic, no humans, scenery, (one single wide floating island in the sky:1.4), the island fills the lower two thirds of the frame from edge to edge, seen from a slightly elevated three-quarter view, close enough that the buildings are large and readable, cel-shaded illustration, clean dark outlines, flat warm colours, light painterly shading, golden hour, cream and peach sunset sky with soft clouds above, terracotta and brown rocky cliffs underneath the island with roots hanging below, (a clear blue river with white water:1.2) winding across the island top and pouring off the left edge as a small waterfall, (golden yellow and amber meadows:1.3) full of orange red and white wildflowers, a few round green trees and bushes, five different small buildings spread out along a winding dirt path: a small wooden beekeeper's hut with three beehives in the middle of the meadow, a tiny cafe with a red awning and two outdoor tables by the river left of the hut, a small village shop with a striped canopy and wooden crates right of the hut, a small hotel with a terrace on a hill at the far right, a market stall under a cloth roof near the waterfall at the far left, tiny honeybees flying along the path, warm cosy storybook atmosphere, wide panoramic composition, calm empty sky in the top third, highly detailed, consistent outline weight")
NEGATIVES["r3"] = ("nsfw, nude, suggestive, 1girl, 1boy, people, humans, character, text, english text, letters, speech bubble, signboard with writing, watermark, logo, signature, photograph, photorealistic, photo collage, 3D render, neon, dark, gloomy, night, snow, blurry, low quality, (green grass:1.3), dominant green, grey sky, modern city, cars, ground level view, mountains in the background, horizon line, (multiple islands:1.4), small islets, floating rocks, floating debris, honey waterfall, liquid honey, bird's eye view, top-down view, tiny buildings, far away")
PROMPTS["r8"] = PROMPTS["r3"].replace("tiny honeybees flying along the path,", "tiny honeybees flying along the path, densely detailed meadow with wildflower patches, hedges, low wooden fences, lanterns and flower beds around every building,")
NEGATIVES["r8"] = NEGATIVES["r3"] + ", empty meadow, plain flat ground, bare ground"
RUN = "r8"
CN = {"module": "canny", "model": "controlnet-canny-sdxl-xinsir-v2 [ab7dc06d]", "weight": 0.35, "end": 0.45, "guide": "layout.png"}
PROMPT, NEGATIVE = PROMPTS[RUN], NEGATIVES[RUN]

SETTINGS = dict(
    checkpoint=CKPT, steps=35, cfg_scale=6.5, sampler_name="DPM++ 2M", scheduler="karras",
    width=1536, height=768,
    enable_hr=True, hr_scale=2048/1536, hr_upscaler="R-ESRGAN 4x+ Anime6B",
    hr_second_pass_steps=20, denoising_strength=0.4,
)

def post(path, payload):
    req = urllib.request.Request(API + path, data=json.dumps(payload).encode(), headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=1800) as r:
        return json.load(r)

def main(seeds):
    log_path = OUT / "seeds.json"
    log = json.load(open(log_path)) if log_path.exists() else {"settings": SETTINGS, "runs": {}}
    if "runs" not in log: log = {"settings": SETTINGS, "runs": {"r1": {"prompt": PROMPTS["r1"], "negative": NEGATIVES["r1"], "images": [{"file": f"island_{i['seed']}.png", "seed": i["seed"]} for i in log["images"]]}}}
    run = log["runs"].setdefault(RUN, {"prompt": PROMPT, "negative": NEGATIVE, "controlnet": CN, "images": []})
    for seed in seeds:
        t = time.time()
        payload = {
            "prompt": PROMPT, "negative_prompt": NEGATIVE, "seed": seed,
            "steps": SETTINGS["steps"], "cfg_scale": SETTINGS["cfg_scale"],
            "sampler_name": SETTINGS["sampler_name"], "scheduler": SETTINGS["scheduler"],
            "width": SETTINGS["width"], "height": SETTINGS["height"],
            "enable_hr": True, "hr_scale": SETTINGS["hr_scale"], "hr_upscaler": SETTINGS["hr_upscaler"],
            "hr_second_pass_steps": SETTINGS["hr_second_pass_steps"], "denoising_strength": SETTINGS["denoising_strength"],
            "override_settings": {"sd_model_checkpoint": CKPT}, "override_settings_restore_afterwards": False,
            "save_images": False,
        }
        if CN:
            guide = base64.b64encode((OUT / CN["guide"]).read_bytes()).decode()
            payload["alwayson_scripts"] = {"controlnet": {"args": [{"enabled": True, "image": guide, "module": CN["module"], "model": CN["model"],
                "weight": CN["weight"], "guidance_start": 0.0, "guidance_end": CN["end"], "control_mode": "Balanced", "resize_mode": "Just Resize", "pixel_perfect": True}]}}
        res = post("/sdapi/v1/txt2img", payload)
        fn = OUT / (f"island_{seed}.png" if RUN == "r1" else f"island_{RUN}_{seed}.png")
        fn.write_bytes(base64.b64decode(res["images"][0]))
        run["images"] = [i for i in run["images"] if i["seed"] != seed] + [{"file": fn.name, "seed": seed}]
        json.dump(log, open(log_path, "w"), indent=1)
        print(f"{fn.name} done in {time.time()-t:.0f}s", flush=True)

if __name__ == "__main__":
    main([int(s) for s in sys.argv[1:]] or [41001, 41002, 41003, 41004])
