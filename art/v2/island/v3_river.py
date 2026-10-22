#!/usr/bin/env python3
"""v3 step 1: base = original seed 41002 with the text removed; then close the river, waterfall and pool so the left and centre are one land."""
import sys, pathlib
from PIL import Image, ImageDraw, ImageFilter
sys.path.insert(0, str(pathlib.Path(__file__).parent))
import inpaint as ip
OUT = pathlib.Path(__file__).parent; V3 = OUT/"v3"
orig = Image.open(OUT/"island_41002.png").convert("RGB")
fixed = Image.open(OUT/"pick"/"step_all.png").convert("RGB")
base = orig.copy(); base.paste(fixed.crop((860,0,1250,170)), (860,0))   # text region from the first clean-up (same seed, fill=0)
base.save(V3/"base.png")
# pre-paint: clone land over the water
pre = base.copy()
def clone(src_box, dst_xy, mirror=False):
    p = base.crop(src_box); p = p.transpose(Image.FLIP_LEFT_RIGHT) if mirror else p; pre.paste(p, dst_xy)
clone((700,560,870,800), (870,560))            # cliff face over the big waterfall
clone((700,560,870,800), (1030,560), True)     # and its mirror for the right part
clone((760,470,980,560), (980,470))            # plateau meadow over the channel
clone((760,440,900,500), (1060,440))           # upper notch
clone((1150,790,1500,900), (640,790), True)    # lower meadow over the pool, mirrored
clone((1150,790,1350,900), (990,790))
clone((900,880,1000,1024), (800,880))          # bottom river
clone((1000,880,1100,1024), (880,880))
pre = pre.filter(ImageFilter.GaussianBlur(0))
mask = Image.new("L", base.size, 0); d = ImageDraw.Draw(mask)
d.polygon([(1040,430),(1180,430),(1180,560),(1080,600),(1060,800),(1160,800),(1160,910),(900,1024),(780,1024),(760,900),(620,880),(620,780),(850,760),(860,560),(960,520),(1040,500)], fill=255)
mask = mask.filter(ImageFilter.GaussianBlur(6)); mask.save(V3/"mask_river.png"); pre.save(V3/"prepaint_river.png")
prompt = "continuous grassy meadow and a brown rocky cliff face, honey-yellow grass with small white flowers, bushes, dry land, no water"+ip.STYLE
neg = ip.NEG + ", river, waterfall, water, lake, pond, stream, blue"
import base64, io
payload = {"init_images": [ip.b64(pre)], "mask": ip.b64(mask), "prompt": prompt, "negative_prompt": neg, "seed": 41002,
    "steps": 35, "cfg_scale": 6.5, "sampler_name": "DPM++ 2M", "scheduler": "karras", "width": 1024, "height": 1024,
    "denoising_strength": float(sys.argv[1]) if len(sys.argv) > 1 else 0.6, "inpainting_fill": 1, "inpaint_full_res": True, "inpaint_full_res_padding": 96,
    "mask_blur": 10, "resize_mode": 0, "override_settings": {"sd_model_checkpoint": ip.CKPT}, "override_settings_restore_afterwards": False, "save_images": False}
res = ip.post("/sdapi/v1/img2img", payload)
out = Image.open(io.BytesIO(base64.b64decode(res["images"][0]))).convert("RGB"); out.save(V3/"land.png"); print("land ok")
