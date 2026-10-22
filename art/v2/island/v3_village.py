#!/usr/bin/env python3
"""v3 step 2: the village on the left, one inpaint pass over pre-painted blocks. Usage: v3_village.py <denoise> <seed> [in.png]"""
import sys, pathlib, base64, io, json
from PIL import Image, ImageDraw, ImageFilter
sys.path.insert(0, str(pathlib.Path(__file__).parent))
import inpaint as ip
from inpaint import house, OUTLINE, WOOD
V3 = pathlib.Path(__file__).parent/"v3"
den, seed = float(sys.argv[1]), int(sys.argv[2]); src = sys.argv[3] if len(sys.argv) > 3 else str(V3/"land.png")
base = Image.open(src).convert("RGB"); pre = base.copy(); d = ImageDraw.Draw(pre)
BOX = (100, 400, 1140, 930)
# dirt path: lower row, then up to the plateau
for seg in [[(300,900),(520,905),(760,895),(1000,890),(1100,880)], [(760,895),(700,760),(560,640),(420,600)], [(560,640),(700,610),(880,600)]]:
    for i in range(len(seg)-1): d.line([seg[i],seg[i+1]], fill=(205,160,100), width=16)
PLACES = {}
# restaurant: upper plateau far left, terrace with parasols
house(d, 290, 600, 230, 105, 48, wall=(248,232,200), roof=(160,95,55)); d.rectangle([170,600,410,612], fill=WOOD, outline=OUTLINE, width=2)
for px in (200,380): d.ellipse([px-20,575,px+20,590], fill=(235,120,50), outline=OUTLINE, width=2); d.rectangle([px-2,590,px+2,606], fill=OUTLINE)
PLACES["restaurant"] = (290, 560)
# hotel / resort: upper plateau centre-left, two storeys with a balcony
house(d, 740, 590, 300, 150, 60, wall=(250,238,215), roof=(150,95,55)); d.rectangle([590,520,890,530], fill=WOOD, outline=OUTLINE, width=2)
for wx in (640,700,780,840):
    for wy in (470,545): d.rectangle([wx-11,wy,wx+11,wy+22], fill=(120,160,200), outline=OUTLINE, width=2)
PLACES["hotel"] = (740, 530)
# eco store: lower meadow right of the hut, striped canopy and crates
house(d, 640, 850, 220, 115, 52, wall=(245,225,185), roof=(150,95,55))
for i in range(9): d.rectangle([545+i*22,780,567+i*22,796], fill=(235,120,50) if i%2 else (250,250,250), outline=OUTLINE, width=2)
for bx in (735,760): d.rectangle([bx-12,828,bx+12,850], fill=(205,160,100), outline=OUTLINE, width=2)
PLACES["store"] = (640, 800)
# coffee shop: lower centre, red awning and two tables
house(d, 930, 860, 230, 115, 52, wall=(248,232,200), roof=(170,70,50)); d.rectangle([830,790,1030,802], fill=(220,60,60)); d.rectangle([830,802,1030,809], fill=(250,250,250))
for tx in (805,1055): d.ellipse([tx-16,846,tx+16,860], fill=(250,250,250), outline=OUTLINE, width=3); d.rectangle([tx-3,860,tx+3,876], fill=OUTLINE)
PLACES["coffee"] = (930, 810)
PLACES["hut"] = (360, 760)
pre.save(V3/"prepaint_village.png"); json.dump(PLACES, open(V3/"places.json","w"), indent=1)
mask = Image.new("L", base.size, 0); ImageDraw.Draw(mask).rectangle(BOX, fill=255)
# keep the hut as it is: cut it out of the mask
ImageDraw.Draw(mask).rectangle([250,650,495,870], fill=0)
mask = mask.filter(ImageFilter.GaussianBlur(4))
prompt = ("a small cosy village of timber cottages, all in the same style: wooden shingle and thatched roofs, warm cream walls, dark wood beams, "
          "a two-storey guesthouse with a balcony, a restaurant with a wooden terrace and orange parasols, a coffee shop with a red awning and two outdoor tables, "
          "a small eco store with a striped canopy and wooden crates of vegetables outside, a dirt path connecting the buildings, flower beds and lanterns, honey-yellow meadow" + ip.STYLE)
neg = ip.NEG + ", river, water, castle, tower, modern house, concrete, glass building"
payload = {"init_images": [ip.b64(pre)], "mask": ip.b64(mask), "prompt": prompt, "negative_prompt": neg, "seed": seed,
    "steps": 35, "cfg_scale": 6.5, "sampler_name": "DPM++ 2M", "scheduler": "karras", "width": 1216, "height": 704,
    "denoising_strength": den, "inpainting_fill": 1, "inpaint_full_res": True, "inpaint_full_res_padding": 64,
    "mask_blur": 8, "resize_mode": 0, "override_settings": {"sd_model_checkpoint": ip.CKPT}, "override_settings_restore_afterwards": False, "save_images": False}
res = ip.post("/sdapi/v1/img2img", payload)
out = Image.open(io.BytesIO(base64.b64decode(res["images"][0]))).convert("RGB")
fn = V3/f"village_d{int(den*100)}_{seed}.png"; out.save(fn); print(fn.name)
