#!/usr/bin/env python3
"""EcoProof logo ideas (Pola, 2026-11-19: ten creative logo drafts from Stable Diffusion, one becomes the Bee Guardian card back).
Marks only, no lettering (SD cannot spell). Local A1111 API, checkpoint waiNSFWIllustrious_v150.
Usage: gen.py [idea ...] → <idea>_<seed>.png, two seeds each; sheet.py lays the picks out."""
import base64, json, sys, pathlib, urllib.request
OUT = pathlib.Path(__file__).parent; API = "http://127.0.0.1:7860"
# round 1 (r1/) gave sheets of six small icons on acid yellow and lime; round 2 (r2/) single objects, but shaded game items (cakes,
# shields) that ignored the idea. Round 3: the checkpoint knows tags, not sentences, so short tag prompts and hard "flat colour" words.
STYLE = ("(logo:1.4), (minimalist:1.3), (flat color:1.4), (vector art:1.2), no lineart, no shading, simple geometric shapes, (limited palette:1.3), "
         "sage green, honey orange, dark brown, cream, solo, centered, (white background:1.4), simple background, no humans, masterpiece, best quality")
NEG = ("multiple, icon set, sticker sheet, collection, grid, pattern, texture, (3d, shading, gradient, glossy, shiny, highlight, shadow, drop shadow:1.4), "
       "isometric, game item, food, cake, weapon, (yellow background, green background, neon:1.3), text, letters, watermark, signature, photo, realistic, "
       "detailed, intricate, 1girl, human, blurry, lowres, frame, border, mockup")
IDEAS = {
 "check_bee":   "(bee:1.3), from above, (checkmark:1.4), striped abdomen, two round wings",
 "hex_leaf":    "(hexagon:1.4), (leaf:1.3) inside hexagon, checkmark, honeycomb",
 "bee_face":    "(bee:1.3) head, mascot, face only, antennae, big round eyes, smile, rounded square",
 "stamp_leaf":  "(postage stamp:1.4), perforated edge, (leaf:1.3), small bee, rubber stamp",
 "wing_shield": "(shield:1.3), honeycomb, (insect wings:1.3), leaf, emblem, symmetry",
 "leaf_print":  "(leaf:1.4) made of (fingerprint:1.3) lines, concentric lines",
 "honey_drop":  "(honey drop:1.4), (sprout:1.3), two leaves growing from the drop, hexagon outline",
 "wing_check":  "(checkmark:1.5) made of a (leaf:1.2) and a (bee wing:1.2), negative space, abstract",
 "hive_house":  "(beehive:1.4), three stacked hexagons, leaf on top, tiny bee",
 "wax_seal":    "(hexagon:1.3) (wax seal:1.3), bee silhouette, leaf, stamp, single colour honey orange",
}
SEEDS = [93001, 93002]
for k in (sys.argv[1:] or IDEAS):
    for seed in SEEDS:
        body = {"prompt": IDEAS[k] + ", " + STYLE, "negative_prompt": NEG, "seed": seed, "steps": 28, "cfg_scale": 7.5, "width": 1024, "height": 1024, "sampler_name": "Euler a"}
        r = json.load(urllib.request.urlopen(urllib.request.Request(API + "/sdapi/v1/txt2img", json.dumps(body).encode(), {"Content-Type": "application/json"}), timeout=300))
        (OUT / f"{k}_{seed}.png").write_bytes(base64.b64decode(r["images"][0])); print(k, seed, flush=True)
