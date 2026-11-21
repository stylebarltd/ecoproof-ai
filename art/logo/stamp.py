#!/usr/bin/env python3
"""Pola's own logo brief (2026-11-19): a round passport stamp with a checkmark that turns into a leaf. "v" = his words as written,
"t" = the same idea in the tags this checkpoint follows better. → passport_stamp_<v|t>_<seed>.png"""
import base64, json, pathlib, urllib.request
OUT = pathlib.Path(__file__).parent; API = "http://127.0.0.1:7860"
V = ("Minimal logo mark, flat vector. A round passport stamp: two thin concentric rings with a slightly imperfect inked edge. In the centre, a bold checkmark "
     "whose long stroke turns into a single leaf. Dark ink-brown stamp on a cream background, the leaf in one green accent. Simple geometric shapes, thick "
     "lines, readable at very small size. Centred, lots of empty space around it.")
T = ("(logo:1.4), (minimalist:1.3), (flat color:1.4), vector art, (round rubber stamp:1.4), (two concentric circles:1.3), ink stamp, rough inked edge, "
     "(big checkmark:1.5) in the centre, (single green leaf:1.3) growing from the checkmark, dark brown ink, (cream background:1.3), simple background, "
     "thick lines, solo, centered, negative space, no humans, masterpiece, best quality")
NEG = ("text, letters, words, numbers, watermark, signature, gradient, shadow, drop shadow, 3d, shading, glossy, mockup, photo, realistic, multiple, icon set, "
       "pattern, detailed, intricate, 1girl, human, blurry, lowres, frame, border")
for tag, p in (("v", V), ("t", T)):
    for seed in (94001, 94002, 94003):
        body = {"prompt": p, "negative_prompt": NEG, "seed": seed, "steps": 28, "cfg_scale": 7.5, "width": 1024, "height": 1024, "sampler_name": "Euler a"}
        r = json.load(urllib.request.urlopen(urllib.request.Request(API + "/sdapi/v1/txt2img", json.dumps(body).encode(), {"Content-Type": "application/json"}), timeout=300))
        (OUT / f"passport_stamp_{tag}_{seed}.png").write_bytes(base64.b64decode(r["images"][0])); print(tag, seed, flush=True)
