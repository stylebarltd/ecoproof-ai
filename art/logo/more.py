#!/usr/bin/env python3
"""Round 3 (Pola, 2026-11-19: "more logos from 1, 2, 3" of stamp_variants2.png, i.e. the waiIllustrious family: old 02 and its
siblings 96021 and 96022). Each of the three is the starting picture this time (not the drawing), three seeds each at denoise 0.45,
so a picture stays near its parent. → m<parent>_<seed>.png"""
import base64, json, pathlib, urllib.request, importlib.util, sys
OUT = pathlib.Path(__file__).parent; API = "http://127.0.0.1:7860"
src = (OUT / "variants.py").read_text(); ns = {}
exec(src[src.index("PROMPT ="):src.index("W = ")], ns)  # the same prompt and negative prompt as the rounds before
PARENTS = {"A": "variants1/v02_wai_d57.png", "B": "variants2/v01_like02_wai_d57.png", "C": "variants2/v02_like02_wai_d57.png"}
for k, f in PARENTS.items():
    init = base64.b64encode((OUT / f).read_bytes()).decode()
    for seed in (97001, 97002, 97003):
        body = {"init_images": [init], "prompt": ns["PROMPT"], "negative_prompt": ns["NEG"], "seed": seed, "steps": 30, "cfg_scale": 7, "width": 1024, "height": 1024,
                "sampler_name": "Euler a", "denoising_strength": 0.45}
        r = json.load(urllib.request.urlopen(urllib.request.Request(API + "/sdapi/v1/img2img", json.dumps(body).encode(), {"Content-Type": "application/json"}), timeout=600))
        (OUT / f"m{k}_{seed}.png").write_bytes(base64.b64decode(r["images"][0])); print(k, seed, flush=True)
