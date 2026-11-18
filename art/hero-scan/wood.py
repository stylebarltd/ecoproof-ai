#!/usr/bin/env python3
"""Rough natural wood for the hero's card holder (Pola: natural, rougher, nature looking): a face texture and an end-grain texture.
epicrealismXL via the local A1111 API → wood_face.png, wood_end.png (1024x512 / 512x512)."""
import base64, io, json, pathlib, urllib.request
from PIL import Image
D = pathlib.Path(__file__).parent
CKPT = "sd/epicrealismXL_vxviiCrystalclear.safetensors [3267fd6443]"
JOBS = {"wood_face": ("flat lay macro photo, full frame texture of a rough sawn raw untreated pale wood plank, natural light brown, coarse open grain running horizontally, saw marks, small knots and cracks, weathered, matte, even soft light, high detail", 1024, 512, 2101),
        "wood_end": ("flat lay macro photo, full frame texture of the rough cut end grain of a raw untreated pale wooden beam, growth rings, small cracks, saw marks, natural light brown, matte, even soft light, high detail", 512, 512, 2102)}
for name, (prompt, w, h, seed) in JOBS.items():
    req = urllib.request.Request("http://127.0.0.1:7860/sdapi/v1/txt2img", headers={"Content-Type": "application/json"}, data=json.dumps({
        "prompt": prompt, "negative_prompt": "glossy, varnish, polished, paint, text, logo, object, border, frame, table, background, blurry", "seed": seed, "steps": 30, "cfg_scale": 6,
        "sampler_name": "DPM++ 2M", "scheduler": "karras", "width": w, "height": h, "override_settings": {"sd_model_checkpoint": CKPT}, "save_images": False}).encode())
    Image.open(io.BytesIO(base64.b64decode(json.load(urllib.request.urlopen(req, timeout=900))["images"][0]))).save(D/f"{name}.png"); print(name, flush=True)
