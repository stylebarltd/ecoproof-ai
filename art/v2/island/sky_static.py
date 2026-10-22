#!/usr/bin/env python3
"""island_sky.png (2048x1536) from the plate's own sky, no model pass: 512 px of gradient above it (the plate's blurred top colour drifting to a
deeper blue), the plate's top rows faded into that haze so clouds the frame cut off dissolve instead of ending in a line, and each column's sky
colour continued down over the land (only a thin edge of it ever shows behind the island cutout). Run with the WebUI venv python (numpy).
Usage: sky_static.py <folder>"""
import sys, pathlib
import numpy as np
from PIL import Image, ImageDraw, ImageFilter
D = pathlib.Path(__file__).parent/sys.argv[1]
EXT, FADE = 512, 120
src = Image.open(D/"hero_island.png").convert("RGB"); W,H = src.size
a = np.asarray(src, np.float32)
land = Image.new("L", (W,H), 0); d = ImageDraw.Draw(land)
d.rectangle([0,290,W,H], fill=255)
d.polygon([(400,300),(470,215),(560,200),(620,125),(700,170),(760,180),(830,220),(930,260),(940,300)], fill=255)
d.polygon([(1250,300),(1290,240),(1330,214),(1700,214),(1760,300)], fill=255)
lm = np.asarray(land.filter(ImageFilter.MaxFilter(25))) > 128
# haze colour per column: the plate's top rows, blurred wide so clouds smear into the sky colour
haze = np.asarray(src.crop((0,0,W,12)).filter(ImageFilter.BoxBlur(220)), np.float32).mean(axis=0)
deep = np.array([150,190,226], np.float32); cream = np.array([255,236,205], np.float32)
out = np.zeros((H+EXT,W,3), np.float32); out[EXT:] = a
for y in range(EXT):
    t = (1 - y/EXT)**1.2; out[y] = haze*(1-0.6*t) + deep*(0.6*t)
for y in range(FADE):
    k = (1 - y/FADE)**1.6; out[EXT+y] = a[y]*(1-k) + haze*k
for x in range(W):
    ys = np.where(lm[:,x])[0]
    if not len(ys): continue
    t0 = int(ys[0]); c = a[max(0,t0-6), x]; tt = (np.arange(t0,H)-t0)/max(1,H-t0)
    out[EXT+t0:, x] = c + (cream-c)*0.35*tt[:,None]
sky = Image.fromarray(out.clip(0,255).astype(np.uint8))
# the continued columns are stripes: blur them into a soft gradient under the island, keeping the real sky outside the land mask
landtall = Image.new("L", (W,H+EXT), 0); landtall.paste(Image.fromarray((lm*255).astype(np.uint8)), (0,EXT))
sky = Image.composite(sky.filter(ImageFilter.GaussianBlur(50)).filter(ImageFilter.BoxBlur(60)), sky, landtall.filter(ImageFilter.GaussianBlur(6)))
sky.save(D/"island_sky.png"); sky.resize((1024,768)).save(D/"_sky_static.png")
print("sky", sky.size)
