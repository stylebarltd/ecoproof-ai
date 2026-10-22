#!/usr/bin/env python3
"""v3 step 2b: one building per pass on land.png, same prompt stem and seed, reference_only ControlNet on the approved cafe cottage.
Usage: v3_buildings.py <seed> [step ...]   -> v3/b_<step>_<seed>.png"""
import sys, pathlib, base64, io, json
from PIL import Image, ImageDraw, ImageFilter
sys.path.insert(0, str(pathlib.Path(__file__).parent))
import inpaint as ip
from inpaint import house, OUTLINE, WOOD
V3 = pathlib.Path(__file__).parent/"v3"
STEM = "a cosy little village building, one small timber cottage with a wooden shingle roof, warm cream walls, "
STEPS = {
 "restaurant": dict(box=(140,460,460,640), prompt=STEM+"a restaurant with a wooden terrace in front with two orange parasols and small tables, standing on the meadow"),
 "hotel":      dict(box=(560,370,930,590), prompt=STEM+"a two-storey guesthouse with a wooden balcony along the upper floor and several windows, standing on the meadow"),
 "store":      dict(box=(500,710,810,900), prompt=STEM+"a small eco store with an orange and white striped canopy over the door and wooden crates of vegetables outside, standing on the meadow"),
 "coffee":     dict(box=(790,720,1100,910), prompt=STEM+"a coffee shop with a small red awning over the door and two round outdoor tables with chairs in front, standing on the meadow"),
}
def prepaint(d, step):
    if step == "restaurant":
        house(d,300,605,250,115,50,wall=(248,232,200),roof=(160,95,55)); d.rectangle([165,605,435,616],fill=WOOD,outline=OUTLINE,width=2)
        for px in (200,400): d.ellipse([px-20,578,px+20,592],fill=(235,120,50),outline=OUTLINE,width=2); d.rectangle([px-2,590,px+2,606],fill=OUTLINE)
    if step == "hotel":
        house(d,745,565,270,140,55,wall=(250,238,215),roof=(150,95,55)); d.rectangle([610,500,880,509],fill=WOOD,outline=OUTLINE,width=2)
        for wx in (650,700,790,840):
            for wy in (450,522): d.rectangle([wx-11,wy,wx+11,wy+22],fill=(120,160,200),outline=OUTLINE,width=2)
    if step == "store":
        house(d,650,850,190,100,48,wall=(245,225,185),roof=(150,95,55))
        for i in range(8): d.rectangle([565+i*22,790,587+i*22,805],fill=(235,120,50) if i%2 else (250,250,250),outline=OUTLINE,width=2)
        for bx in (760,785): d.rectangle([bx-12,830,bx+12,850],fill=(205,160,100),outline=OUTLINE,width=2)
    if step == "coffee":
        house(d,940,860,200,100,48,wall=(248,232,200),roof=(170,70,50)); d.rectangle([850,800,1030,811],fill=(220,60,60)); d.rectangle([850,811,1030,817],fill=(250,250,250))
        for tx in (825,1060): d.ellipse([tx-15,848,tx+15,861],fill=(250,250,250),outline=OUTLINE,width=3); d.rectangle([tx-3,861,tx+3,876],fill=OUTLINE)
seed = int(sys.argv[1]); steps = sys.argv[2:] or list(STEPS)
land = Image.open(V3/"land.png").convert("RGB")
for step in steps:
    s = STEPS[step]; x0,y0,x1,y1 = s["box"]
    pre = land.copy(); prepaint(ImageDraw.Draw(pre), step)
    mask = Image.new("L", land.size, 0); ImageDraw.Draw(mask).rectangle([x0,y0,x1,y1], fill=255)
    pad=96; cw,ch=(x1-x0)+2*pad,(y1-y0)+2*pad; sc=min(1024/cw,1024/ch,2.0); w,h=int(cw*sc)//64*64,int(ch*sc)//64*64
    payload = {"init_images":[ip.b64(pre)],"mask":ip.b64(mask),"prompt":s["prompt"]+ip.STYLE,"negative_prompt":ip.NEG+", river, water, castle, tower, huge building, mansion, people, person, sitting, umbrella held by a person, far away, tiny",
        "seed":seed,"steps":35,"cfg_scale":6.5,"sampler_name":"DPM++ 2M","scheduler":"karras","width":w,"height":h,
        "denoising_strength":0.82,"inpainting_fill":1,"inpaint_full_res":True,"inpaint_full_res_padding":pad,"mask_blur":8,"resize_mode":0,
        "override_settings":{"sd_model_checkpoint":ip.CKPT},"override_settings_restore_afterwards":False,"save_images":False}
    res = ip.post("/sdapi/v1/img2img", payload)
    out = Image.open(io.BytesIO(base64.b64decode(res["images"][0]))).convert("RGB"); out.save(V3/f"b_{step}_{seed}.png"); print(step, seed, flush=True)
