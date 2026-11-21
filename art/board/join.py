#!/usr/bin/env python3
"""Join the five region strips of regions.py into one board, each fading into the next over OV pixels.
Usage: join.py <land|port> <seed> → board_<format>_<seed>.png (land 2368x1024, port 1024x2368)."""
import sys, pathlib
import numpy as np
from PIL import Image
D = pathlib.Path(__file__).parent; OV = 128
fmt, seed = sys.argv[1], sys.argv[2]; keys = ["meadow", "forest", "shore", "hills", "summit"]
ims = [np.asarray(Image.open(D/f"r_{fmt}_{k}_{seed}.png").convert("RGB"), np.float32) for k in keys]
if fmt == "port": ims = [np.rot90(a, -1) for a in ims[::1]]          # work left to right, turn back at the end (the trail runs bottom to top)
h, w = ims[0].shape[:2]; step = w - OV; out = np.zeros((h, step*4 + w, 3), np.float32); wsum = np.zeros((h, step*4 + w, 1), np.float32)
ramp = np.ones(w, np.float32); ramp[:OV] = np.linspace(0, 1, OV); ramp[-OV:] = np.linspace(1, 0, OV)
for i, a in enumerate(ims):
    r = ramp.copy()
    if i == 0: r[:OV] = 1
    if i == 4: r[-OV:] = 1
    out[:, i*step:i*step + w] += a*r[None, :, None]; wsum[:, i*step:i*step + w] += r[None, :, None]
out = (out/wsum).clip(0, 255).astype(np.uint8)
if fmt == "port": out = np.rot90(out, 1)
Image.fromarray(out).save(D/f"board_{fmt}_{seed}.png"); print("wrote", f"board_{fmt}_{seed}.png", out.shape[1], "x", out.shape[0])
