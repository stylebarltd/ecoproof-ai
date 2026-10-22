#!/usr/bin/env python3
"""Landing assets from a plate folder: public/landing/island/<ver>/{sky,main,fg,mobile,flat}.webp. Run with the WebUI venv python (numpy).
Usage: export_web.py <folder> <ver>   e.g. export_web.py v4 v4
sky.webp is the tall 2048x1536 sky from layers_sky.py (an old 2048x1024 sky gets 512 px of plain gradient added on top)."""
from PIL import Image, ImageFilter
import numpy as np, pathlib, sys
P = pathlib.Path(__file__).parent/(sys.argv[1] if len(sys.argv) > 1 else "pick")
OUT = pathlib.Path(__file__).parents[3]/"public"/"landing"/"island"/(sys.argv[2] if len(sys.argv) > 2 else sys.argv[1]); OUT.mkdir(parents=True, exist_ok=True)
sky = Image.open(P/"island_sky.png").convert("RGB"); W,H = sky.size
if H == 1024:
    ext = 512; top = np.asarray(sky.crop((0,0,W,8)).filter(ImageFilter.BoxBlur(60))).astype(np.float32).mean(axis=0)
    tall = np.zeros((H+ext,W,3), np.float32); tall[ext:] = np.asarray(sky, np.float32); deep = np.array([158,196,226], np.float32)
    for y in range(ext):
        t = 1 - y/ext; tall[y] = top*(1-0.55*t) + deep*(0.55*t)
    sky = Image.fromarray(tall.clip(0,255).astype(np.uint8))
sky.save(OUT/"sky.webp", quality=82, method=6)
Image.open(P/"island_main.png").convert("RGBA").save(OUT/"main.webp", quality=88, method=6)
Image.open(P/"island_fg.png").convert("RGBA").save(OUT/"fg.webp", quality=88, method=6)
plate = Image.open(P/"hero_island.png").convert("RGB")
# mobile: a 4:5 crop of the cut island (sky transparent, so the page's sky layer shows through), centred on the hut and the waterfall
big = Image.open(P/"island_main.png").convert("RGBA").resize((4096,2048), Image.LANCZOS)
cw = int(2048*4/5); x0 = max(0, min(4096-cw, 660*2-cw//2)); big.crop((x0,0,x0+cw,2048)).resize((1080,1350), Image.LANCZOS).save(OUT/"mobile.webp", quality=86, method=6)
plate.save(OUT/"flat.webp", quality=84, method=6)
plate.save(P/"hero_island.webp", quality=90, method=6)
print({f.name: f.stat().st_size//1024 for f in sorted(OUT.iterdir())})
