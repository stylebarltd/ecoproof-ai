#!/usr/bin/env python3
"""Season 1 cards, the character (Pola, 2026-11-18: every card its own pose AND its own bee, not the rank bee again). Same recipe as
the five rank personas (../v2/ranks/personas/gen2.py): img2img from the Sentinel card on dusty blue, so the felt-and-ink rendering and
the bee anatomy carry over, while the prompt gives each card its own face, headgear, outfit, pose and what it holds. The plain blue
background is keyed out afterwards and the bee laid over its scene (scene.py, compose.py). Local A1111 API.
Usage: persona.py <card> <denoise> seed... → <card>_bee_d<NN>_<seed>.png, logged in seeds.json."""
import base64, json, sys, pathlib, urllib.request, importlib.util
OUT = pathlib.Path(__file__).parent; API = "http://127.0.0.1:7860"
spec = importlib.util.spec_from_file_location("gen2", OUT/"../v2/ranks/personas/gen2.py"); g = importlib.util.module_from_spec(spec); spec.loader.exec_module(g)
NEG = g.NEG.replace("badge, patch, emblem, crest, pin, medal, ", "badge, patch, emblem, crest, pin, medal, medallion, round badge, speech bubble, ")
NEG += ", logo on cup, face on cup, print on cup, print on bag, lettering on bag, second bee, small bee, baby bee, two characters, plush toy, bowling pin, black fur collar, ice cream, whipped cream"
SENTINEL = "young bee scout with a small friendly closed-mouth smile, wearing a (kraft brown felt hooded cloak with the hood down around the shoulders, fastened with a wooden toggle:1.3) and a leather backpack"
PERSONAS = {  # Sentinel category: kraft felt and linen, simple and friendly
 # lucky cards: a new guest bee each
 "morning_cup": "sleepy cheerful early-bird bee, (happy half-closed eyes, small content smile:1.2), wearing a chunky cream cable-knit sweater and a rust orange knitted scarf, "
                "(holding a plain tall bamboo coffee cup with a brown lid in both hands in front of its chest, a wisp of steam rising from the cup:1.4)",
 "market_day": "cheerful round-cheeked shopper bee, (big open-mouth happy smile:1.2), wearing a cream linen shirt under a plain kraft brown apron, "
               "(a plain cream cotton tote bag with carrot tops and leafy greens sticking out of it hanging from one raised hand:1.4), the other hand waving",
 # challenge cards: the Sentinel itself, in a new pose
 "first_trail": SENTINEL + ", (one hand holding a wooden walking stick upright, the other hand raised flat above its eyes like a visor, looking into the distance:1.4), curious wide eyes",
 "first_proof": SENTINEL + ", (eyes closed in a big proud joyful smile:1.2), (holding up a small open kraft paper booklet in one raised hand, showing it off:1.4), the other hand making a fist of joy",
}
card, dn, seeds = sys.argv[1], float(sys.argv[2]), [int(s) for s in sys.argv[3:]]
prompt = f"cute honeybee {PERSONAS[card]}, (hands with fingers clearly visible:1.2), " + g.BEE + ", " + g.STYLE
init = base64.b64encode(g.INIT.read_bytes()).decode()
lp = OUT/"seeds.json"; log = json.load(open(lp)) if lp.exists() else {}
for seed in seeds:
    res = g.post("/sdapi/v1/img2img", {"init_images": [init], "denoising_strength": dn, "prompt": prompt, "negative_prompt": NEG, "seed": seed, "steps": 30, "cfg_scale": 6.5,
        "sampler_name": "DPM++ 2M", "scheduler": "karras", "width": 1024, "height": 1024, "resize_mode": 0, "override_settings": {"sd_model_checkpoint": g.CKPT}, "override_settings_restore_afterwards": False, "save_images": False})
    fn = OUT/f"{card}_bee_d{int(round(dn*100))}_{seed}.png"; fn.write_bytes(base64.b64decode(res["images"][0]))
    log[fn.name] = {"card": card, "seed": seed, "denoising_strength": dn, "init": "art/v2/ranks/sentinel/sentinel_card_bg.png", "checkpoint": g.CKPT, "prompt": prompt, "negative": NEG, "settings": "img2img 1024x1024 steps 30 cfg 6.5 DPM++ 2M karras"}
    json.dump(log, open(lp, "w"), indent=1); print(fn.name, flush=True)
