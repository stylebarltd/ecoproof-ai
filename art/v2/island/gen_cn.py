#!/usr/bin/env python3
"""Island candidates: img2img from layout.png + canny ControlNet. Usage: gen_cn.py RUN denoise cn_weight seed..."""
import base64, json, sys, time, urllib.request, pathlib
sys.path.insert(0, str(pathlib.Path(__file__).parent))
from gen_island import PROMPTS, NEGATIVES, CKPT, post, OUT
RUN, DENOISE, CNW, CNEND = sys.argv[1], float(sys.argv[2]), float(sys.argv[3]), float(sys.argv[4]); seeds=[int(s) for s in sys.argv[5:]]
PROMPT, NEGATIVE = PROMPTS["r3"], NEGATIVES["r3"]
guide = base64.b64encode((OUT/"layout.png").read_bytes()).decode()
log_path = OUT/"seeds.json"; log = json.load(open(log_path))
run = log["runs"].setdefault(RUN, {"method": "img2img from layout.png (layout.py) + controlnet canny", "prompt": PROMPT, "negative": NEGATIVE,
      "denoise": DENOISE, "cn_weight": CNW, "cn_end": CNEND, "cn_model": "controlnet-canny-sdxl-xinsir-v2 [ab7dc06d]", "size": "1536x768", "images": []})
for seed in seeds:
    t=time.time()
    payload = {"init_images": [guide], "prompt": PROMPT, "negative_prompt": NEGATIVE, "seed": seed,
        "steps": 35, "cfg_scale": 6.5, "sampler_name": "DPM++ 2M", "scheduler": "karras",
        "width": 1536, "height": 768, "denoising_strength": DENOISE, "resize_mode": 0,
        "override_settings": {"sd_model_checkpoint": CKPT}, "override_settings_restore_afterwards": False, "save_images": False,
        "alwayson_scripts": {"controlnet": {"args": [{"enabled": True, "image": guide, "module": "canny", "model": "controlnet-canny-sdxl-xinsir-v2 [ab7dc06d]",
            "weight": CNW, "guidance_start": 0.0, "guidance_end": CNEND, "control_mode": "Balanced", "resize_mode": "Just Resize", "pixel_perfect": True}]}}}
    res = post("/sdapi/v1/img2img", payload)
    fn = OUT/f"island_{RUN}_{seed}.png"; fn.write_bytes(base64.b64decode(res["images"][0]))
    run["images"] = [i for i in run["images"] if i["seed"] != seed] + [{"file": fn.name, "seed": seed}]
    json.dump(log, open(log_path,"w"), indent=1); print(f"{fn.name} done in {time.time()-t:.0f}s", flush=True)
