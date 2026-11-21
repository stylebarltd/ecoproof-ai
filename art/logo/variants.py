#!/usr/bin/env python3
"""Ten close variants of the drawn passport stamp logo (Pola, 2026-11-19: "take 11 ... 10 additional very similar logos, different
checkpoints, settings"). txt2img could not draw the brief (stamp_sd/), so each variant is img2img FROM the drawing: the checkpoint and
the denoise decide how far it drifts. Checkpoints are switched in order and the first one is loaded again at the end.
→ v<NN>_<checkpoint>_d<denoise>.png"""
import base64, json, pathlib, urllib.request
OUT = pathlib.Path(__file__).parent; API = "http://127.0.0.1:7860"
def post(path, body, t=600): return json.load(urllib.request.urlopen(urllib.request.Request(API + path, json.dumps(body).encode(), {"Content-Type": "application/json"}), timeout=t))
PROMPT = ("minimal logo mark, flat vector, (round passport stamp:1.3), two thin concentric rings with an imperfect inked edge, (bold checkmark:1.4) in the centre "
          "whose long stroke turns into a (single green leaf:1.3), dark ink-brown stamp on a cream background, simple geometric shapes, thick lines, "
          "flat color, minimalist, logo, centered, negative space")
NEG = ("text, letters, words, numbers, watermark, signature, gradient, shadow, 3d, shading, glossy, mockup, photo, realistic, multiple, pattern, "
       "detailed, intricate, human, face, blurry, lowres, frame, border")
W = "sd/waiNSFWIllustrious_v150.safetensors"
# (checkpoint, short name, size, denoise, cfg, sampler, seed)
# round 1 (variants1/, sheet stamp_variants.png): ten runs over six checkpoints. Pola liked 02 (wai 0.58), 06 (epicXL 0.50) and 07 (epicXL 0.64):
# round 2 is three more of each, the same settings with new seeds. File names say which one a picture follows.
E = "sd/epicrealismXL_pureFix.safetensors"
RUNS = [(W, "like02_wai", 1024, 0.58, 7, "Euler a", s) for s in (96021, 96022, 96023)] \
     + [(E, "like06_epicXL", 1024, 0.5, 6, "DPM++ 2M", s) for s in (96061, 96062, 96063)] \
     + [(E, "like07_epicXL", 1024, 0.64, 5, "Euler a", s) for s in (96071, 96072, 96073)]
init = base64.b64encode((OUT / "passport_stamp_drawn.png").read_bytes()).decode()
try:
    for i, (ck, name, size, dn, cfg, sampler, seed) in enumerate(RUNS, 1):
        body = {"init_images": [init], "prompt": PROMPT, "negative_prompt": NEG, "seed": seed, "steps": 30, "cfg_scale": cfg, "width": size, "height": size,
                "sampler_name": sampler, "denoising_strength": dn, "override_settings": {"sd_model_checkpoint": ck}, "override_settings_restore_afterwards": False}
        r = post("/sdapi/v1/img2img", body)
        (OUT / f"v{i:02d}_{name}_d{int(dn * 100)}.png").write_bytes(base64.b64decode(r["images"][0])); print(i, name, dn, flush=True)
finally:
    post("/sdapi/v1/options", {"sd_model_checkpoint": W})
