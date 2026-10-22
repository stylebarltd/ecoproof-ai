#!/usr/bin/env python3
"""Style pass: low-denoise img2img over a chosen persona render, same rank prompt, to bring back the Sentinel's felt fuzz and ink
crosshatching without changing the character. Usage: stylepass.py <rank> <input.png> <denoise> seed…  → <stem>_sp<NN>_<seed>.png"""
import base64, json, sys, time, urllib.request, pathlib
sys.path.insert(0, str(pathlib.Path(__file__).parent)); import gen2
OUT = pathlib.Path(__file__).parent
TEX = ("soft matte felt texture with visible fine fuzz on head and body, ink outlines, light crosshatching in shadow areas, textured fabric weave on the clothes, "
       "hand-inked collectible illustration, same character, same pose, same colours")
def main():
    rank, src, dn, seeds = sys.argv[1], pathlib.Path(sys.argv[2]), float(sys.argv[3]), [int(s) for s in sys.argv[4:]]
    prompt = f"cute honeybee {gen2.RANKS[rank]}, " + gen2.BEE + ", " + TEX + ", " + gen2.STYLE
    init = base64.b64encode(src.read_bytes()).decode()
    lp = OUT/"seeds.json"; log = json.load(open(lp))
    entry = log["runs"].setdefault(f"{rank}_stylepass", {"mode": "img2img style pass", "prompt": prompt, "negative": gen2.NEG, "images": []})
    for seed in seeds:
        t = time.time()
        res = gen2.post("/sdapi/v1/img2img", {"init_images": [init], "denoising_strength": dn, "prompt": prompt, "negative_prompt": gen2.NEG, "seed": seed,
            "steps": 30, "cfg_scale": 6.5, "sampler_name": "DPM++ 2M", "scheduler": "karras", "width": 1024, "height": 1024, "resize_mode": 0,
            "override_settings": {"sd_model_checkpoint": gen2.CKPT}, "override_settings_restore_afterwards": False, "save_images": False})
        fn = OUT/f"{src.stem}_sp{int(round(dn*100))}_{seed}.png"; fn.write_bytes(base64.b64decode(res["images"][0]))
        entry["images"] = [i for i in entry["images"] if i["file"] != fn.name] + [{"file": fn.name, "init": src.name, "seed": seed, "denoising_strength": dn}]
        json.dump(log, open(lp, "w"), indent=1); print(fn.name, f"{time.time()-t:.0f}s", flush=True)
if __name__ == "__main__": main()
