#!/usr/bin/env python3
"""Inpaint a missing hand on a finished persona render. Only the masked box is redrawn (inpaint only masked, full-res, original fill).
Usage: inpaint_hand.py <rank> <input.png> <x0,y0,x1,y1> <denoise> "<hand prompt>" seed…   → <stem>_hand<NN>_<seed>.png (+ _mask.png once)"""
import base64, io, json, os, sys, time, pathlib
from PIL import Image, ImageDraw
sys.path.insert(0, str(pathlib.Path(__file__).parent)); import gen2
OUT = pathlib.Path(__file__).parent
def b64(im):
    b = io.BytesIO(); im.save(b, "PNG"); return base64.b64encode(b.getvalue()).decode()
def main():
    rank, src, box, dn, hand, seeds = sys.argv[1], pathlib.Path(sys.argv[2]), [int(v) for v in sys.argv[3].split(",")], float(sys.argv[4]), sys.argv[5], [int(s) for s in sys.argv[6:]]
    im = Image.open(src).convert("RGB"); mask = Image.new("L", im.size, 0); ImageDraw.Draw(mask).rectangle(box, fill=255)
    mask.save(OUT/f"{src.stem}_mask.png")
    # HANDONLY=1: describe only the arm, so the model does not paint a whole bee into the box; FULLRES=0: whole image as context
    prompt = (f"({hand}:1.3), " + gen2.STYLE) if os.environ.get("HANDONLY") == "1" else (f"({hand}:1.3), cute honeybee {gen2.RANKS[rank]}, " + gen2.BEE + ", " + gen2.STYLE)
    neg = "missing fingers, extra fingers, fused fingers, deformed hand, stump, claw, " + gen2.NEG
    lp = OUT/"seeds.json"; log = json.load(open(lp)); entry = log["runs"].setdefault(f"{rank}_hand", {"mode": "inpaint hand", "images": []})
    for seed in seeds:
        t = time.time()
        res = gen2.post("/sdapi/v1/img2img", {"init_images": [b64(im)], "mask": b64(mask), "mask_blur": 8, "inpainting_fill": int(os.environ.get("FILL","1")), "inpaint_full_res": os.environ.get("FULLRES", "1") == "1",
            "inpaint_full_res_padding": 96, "inpainting_mask_invert": 0, "denoising_strength": dn, "prompt": prompt, "negative_prompt": neg, "seed": seed,
            "steps": 30, "cfg_scale": 6.5, "sampler_name": "DPM++ 2M", "scheduler": "karras", "width": 1024, "height": 1024, "resize_mode": 0,
            "override_settings": {"sd_model_checkpoint": gen2.CKPT}, "override_settings_restore_afterwards": False, "save_images": False})
        fn = OUT/f"{src.stem}_hand{int(round(dn*100))}f{os.environ.get("FILL","1")}{'w' if os.environ.get("FULLRES","1") != "1" else ''}_{seed}.png"; fn.write_bytes(base64.b64decode(res["images"][0]))
        entry["images"] = [i for i in entry["images"] if i["file"] != fn.name] + [{"file": fn.name, "init": src.name, "box": box, "seed": seed, "denoising_strength": dn, "hand": hand}]
        json.dump(log, open(lp, "w"), indent=1); print(fn.name, f"{time.time()-t:.0f}s", flush=True)
if __name__ == "__main__": main()
