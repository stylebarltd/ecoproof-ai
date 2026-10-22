#!/usr/bin/env python3
"""Masked inpaint steps on the picked plate (seed 41002). Usage: inpaint.py <in.png> <out.png> <step> [more steps...]  (steps from STEPS)"""
import base64, io, json, sys, pathlib
from PIL import Image, ImageDraw, ImageFilter
sys.path.insert(0, str(pathlib.Path(__file__).parent))
from gen_island import CKPT, post, OUT

STYLE = ", cel-shaded illustration, clean dark outlines, flat warm colours, light painterly shading, golden hour light, same style as the surrounding scene, highly detailed"
NEG = "nsfw, nude, 1girl, 1boy, people, humans, character, mascot, bee character, cartoon bee, egg, face, eyes, chibi, creature, ghost, chick, animal, wheat field, crops, pumpkins, barn, purple, text, english text, letters, signboard with writing, watermark, logo, photograph, 3D render, blurry, low quality, deformed, floating, cut off, modern, concrete"
# box = (x0,y0,x1,y1) in 2048x1024 coords; fill: 0 fill, 1 original, 2 latent noise
STEPS = {
 "text":   dict(box=(880,20,1230,150), denoise=0.75, fill=0, prompt="cream and peach sunset sky with soft fluffy clouds, empty sky"+STYLE),
 "market": dict(box=(70,520,330,690),  denoise=0.8, fill=1, prompt="a small simple wooden market stand with a cloth canopy roof and a few baskets of apples on the counter, cottage style, standing on the meadow"+STYLE),
 "cafe":   dict(box=(590,420,910,620), denoise=0.82, fill=1, prompt="a cosy little cafe, one small timber cottage with a wooden shingle roof and a small red awning over the door, two round outdoor tables with chairs in front, warm cream walls, standing on the meadow by the river"+STYLE),
 "hives":  dict(box=(460,770,710,900), denoise=0.6, fill=1, prompt="three tiny wooden bee hive huts in a row, miniature wooden houses with little pitched roofs standing on short posts on the grass, a few tiny honeybees, apiary"+STYLE),
 "shop":   dict(box=(1560,480,1870,680), denoise=0.55, fill=1, prompt="(a small village shop building:1.3), one small timber house with an orange and white striped canopy over the door and wooden crates of vegetables outside, the building fills most of the view, warm cream walls, standing on the meadow"+STYLE),
 "hotel":  dict(box=(1380,80,1690,280), denoise=0.75, fill=1, prompt="(a small guesthouse building:1.3), one small two-storey timber cottage with a thatched roof, a wooden terrace with two orange parasols in front, the building fills most of the view, warm cream walls, standing on the grassy plateau"+STYLE),
}

OUTLINE=(60,35,20); WALL=(248,232,200); ROOF=(190,85,55); WOOD=(170,120,70)
def house(d,x,y,w,h,roof_h,wall=WALL,roof=ROOF):
    d.rectangle([x-w//2,y-h,x+w//2,y],fill=wall,outline=OUTLINE,width=4)
    d.polygon([(x-w//2-10,y-h),(x,y-h-roof_h),(x+w//2+10,y-h)],fill=roof,outline=OUTLINE,width=4)
    d.rectangle([x-12,y-h*0.55,x+12,y],fill=WOOD,outline=OUTLINE,width=3)
PREPAINT = {
 "cafe":  lambda d: (house(d,750,590,210,115,60), d.rectangle([650,520,830,534],fill=(220,60,60)), d.rectangle([650,534,830,541],fill=(250,250,250)),
                     [ (d.ellipse([tx-16,578,tx+16,592],fill=(250,250,250),outline=OUTLINE,width=3), d.rectangle([tx-3,592,tx+3,606],fill=OUTLINE)) for tx in (630,860) ]),
 "hives": lambda d: [ (d.rectangle([hx-3,850,hx+3,880],fill=OUTLINE), house(d,hx,852,44,34,20,wall=(250,245,230),roof=(150,95,55))) for hx in (505,575,645) ],
 "shop":  lambda d: (house(d,1700,650,190,105,50,wall=(245,225,185)), [d.rectangle([1615+i*22,585,1637+i*22,602],fill=(235,120,50) if i%2 else (250,250,250),outline=OUTLINE,width=2) for i in range(8)],
                     [d.rectangle([bx-14,626,bx+14,650],fill=(205,160,100),outline=OUTLINE,width=2) for bx in (1800,1830)]),
 "hotel": lambda d: (house(d,1530,255,190,105,45,wall=(250,238,215),roof=(150,95,55)), [d.rectangle([wx-8,185,wx+8,200],fill=(120,160,200),outline=OUTLINE,width=2) for wx in (1490,1530,1570)],
                     [d.rectangle([wx-8,218,wx+8,238],fill=(120,160,200),outline=OUTLINE,width=2) for wx in (1490,1570)], d.rectangle([1440,255,1620,264],fill=WOOD,outline=OUTLINE,width=2),
                     [ (d.ellipse([px-18,236,px+18,250],fill=(235,120,50),outline=OUTLINE,width=2)) for px in (1612,1448) ]),
}

def b64(im):
    buf = io.BytesIO(); im.save(buf, format="PNG"); return base64.b64encode(buf.getvalue()).decode()

def inpaint(im, step, seed=41002):
    s = STEPS[step]; x0,y0,x1,y1 = s["box"]
    if step in PREPAINT:
        im = im.copy()
        if step != "text":  # restore the untouched plate under the mask first
            orig = Image.open(OUT/"island_41002.png").convert("RGB"); im.paste(orig.crop((x0,y0,x1,y1)), (x0,y0))
        PREPAINT[step](ImageDraw.Draw(im)); im.save(OUT/"pick"/f"prepaint_{step}.png")
    mask = Image.new("L", im.size, 0); ImageDraw.Draw(mask).rectangle([x0,y0,x1,y1], fill=255)
    pad = 96; cw, ch = (x1-x0)+2*pad, (y1-y0)+2*pad
    scale = min(1024/cw, 1024/ch, 2.0); w, h = int(cw*scale)//64*64, int(ch*scale)//64*64
    if not s.get("full_res", True): w, h = im.size
    payload = {"init_images": [b64(im)], "mask": b64(mask), "prompt": s["prompt"], "negative_prompt": NEG, "seed": seed,
        "steps": 35, "cfg_scale": 6.5, "sampler_name": "DPM++ 2M", "scheduler": "karras", "width": w, "height": h,
        "denoising_strength": s["denoise"], "inpainting_fill": s["fill"], "inpaint_full_res": s.get("full_res", True), "inpaint_full_res_padding": pad,
        "mask_blur": 8, "inpainting_mask_invert": 0, "resize_mode": 0,
        "override_settings": {"sd_model_checkpoint": CKPT}, "override_settings_restore_afterwards": False, "save_images": False}
    res = post("/sdapi/v1/img2img", payload)
    return Image.open(io.BytesIO(base64.b64decode(res["images"][0]))).convert("RGB")

if __name__ == "__main__":
    import os; seed = int(os.environ.get("SEED", 41002))
    src, dst, steps = sys.argv[1], sys.argv[2], sys.argv[3:]
    im = Image.open(src).convert("RGB")
    for st in steps:
        im = inpaint(im, st, seed); im.save(dst); print(st, seed, "done", flush=True)
    log = json.load(open(OUT/"seeds.json")); log.setdefault("cleanup", {"source": "island_41002.png", "seed": 41002, "steps": STEPS, "negative": NEG, "note": "only-masked inpaint, padding 96, mask blur 8"})
    json.dump(log, open(OUT/"seeds.json","w"), indent=1)
