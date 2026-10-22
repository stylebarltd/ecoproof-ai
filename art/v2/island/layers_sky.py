#!/usr/bin/env python3
"""island_sky.png for a plate folder: a tall 2048x1536 sky. The plate's sky is kept; 512 px are outpainted above it (so the clouds the frame
cut off get finished) and the land is replaced by sky. Run with the WebUI venv python (numpy).
Usage: layers_sky.py <folder> [seed=41002] [denoise=0.8] [--full]
--full: no mask, one img2img pass over the whole tall canvas (no seams; the plate's own sky is re-rendered in the tall format)."""
import base64, io, sys, pathlib
import numpy as np
from PIL import Image, ImageDraw, ImageFilter
sys.path.insert(0, str(pathlib.Path(__file__).parent))
from gen_island import CKPT, post, OUT
from inpaint import b64, NEG
D = OUT/(sys.argv[1] if len(sys.argv) > 1 else "pick")
SEED = int(sys.argv[2]) if len(sys.argv) > 2 else 41002
DEN = float(sys.argv[3]) if len(sys.argv) > 3 else 0.8
FULL = "--full" in sys.argv
EXT = 512
src = Image.open(D/"hero_island.png").convert("RGB"); W,H = src.size; TH = H+EXT
# land on the plate (same outline as layers_cut.py), dilated so no edge of the island survives
land = Image.new("L", (W,H), 0); d = ImageDraw.Draw(land)
d.rectangle([0,290,W,H], fill=255)
d.polygon([(400,300),(470,215),(560,200),(620,125),(700,170),(760,180),(830,220),(930,260),(940,300)], fill=255)
d.polygon([(1250,300),(1290,240),(1330,214),(1700,214),(1760,300)], fill=255)
land = land.filter(ImageFilter.MaxFilter(25))
# mask on the tall canvas: the band above the plate plus the plate's top rows (cut clouds), plus the land
mask = Image.new("L", (W,TH), 0); ImageDraw.Draw(mask).rectangle([0,0,W,EXT+70], fill=255)
mask.paste(land, (0,EXT)); mask = mask.filter(ImageFilter.GaussianBlur(3))
# pre-paint: above the plate a gradient from a deeper blue down to the plate's top-row colour; over the land each column's sky colour continued
a = np.asarray(src, np.float32)
toprow = np.asarray(src.crop((0,0,W,8)).filter(ImageFilter.BoxBlur(60)), np.float32).mean(axis=0)
deep = np.array([150,190,224], np.float32); cream = np.array([255,236,205], np.float32)
canvas = np.zeros((TH,W,3), np.float32); canvas[EXT:] = a
for y in range(EXT):
    t = 1 - y/EXT; canvas[y] = toprow*(1-0.6*t) + deep*(0.6*t)
tall = Image.fromarray(canvas.clip(0,255).astype(np.uint8))   # original plate on the tall canvas
lm = np.asarray(land) > 128
for x in range(W):
    ys = np.where(lm[:,x])[0]
    if not len(ys): continue
    t0 = int(ys[0]); c = a[max(0,t0-6), x]
    tt = (np.arange(t0,H)-t0)/max(1,H-t0)
    canvas[EXT+t0:, x] = c + (cream-c)*0.35*tt[:,None]
pre = Image.fromarray(canvas.clip(0,255).astype(np.uint8))
soft = pre.filter(ImageFilter.GaussianBlur(60)).filter(ImageFilter.BoxBlur(80))
pre = Image.composite(soft, pre, mask.point(lambda v: 255 if v > 40 else 0).filter(ImageFilter.GaussianBlur(8)))
pre.save(D/"prepaint_sky.png"); mask.save(D/"mask_sky.png")
prompt = "wide open sky at golden hour, soft fluffy cumulus clouds, peach and cream and pale blue, cel-shaded illustration, flat warm colours, clean simple cloud shapes, only sky, no ground"
neg = NEG + ", sun, second sun, land, ground, island, mountains, hills, horizon line, silhouette, trees, building, rock, grass, water, dark, night"
w, h = 1536, 1152
payload = {"init_images": [b64(pre)], **({} if FULL else {"mask": b64(mask)}), "prompt": prompt, "negative_prompt": neg, "seed": SEED,
    "steps": 35, "cfg_scale": 6.5, "sampler_name": "DPM++ 2M", "scheduler": "karras", "width": w, "height": h,
    "denoising_strength": DEN, "inpainting_fill": 1, "inpaint_full_res": False, "mask_blur": 24, "resize_mode": 0,
    "override_settings": {"sd_model_checkpoint": CKPT}, "override_settings_restore_afterwards": False, "save_images": False}
res = post("/sdapi/v1/img2img", payload)
gen = Image.open(io.BytesIO(base64.b64decode(res["images"][0]))).convert("RGB").resize((W,TH), Image.LANCZOS)
# the model's sky inside the mask, the untouched plate sky outside it
sky = gen if FULL else Image.composite(gen, tall, mask.filter(ImageFilter.GaussianBlur(12)))
tag = f"_sky_{SEED}_{DEN}{'_full' if FULL else ''}"
sky.save(D/"island_sky.png"); sky.resize((1024,768)).save(D/f"{tag}.png")
print("sky", sky.size, "seed", SEED, "denoise", DEN)
