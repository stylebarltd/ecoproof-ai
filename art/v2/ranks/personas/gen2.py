#!/usr/bin/env python3
"""Rank personas, round 2: img2img from the Sentinel card (opaque, dusty blue) so the felt-and-ink rendering and the bee anatomy
carry over, while the prompt reshapes face, expression and headgear per rank. Local A1111 API.
Usage: gen2.py <run> <rank|all> <denoise> seed…      e.g. gen2.py r2 warden 0.70 51001 51002
Writes <rank>_<run>_d<NN>_<seed>.png next to this file and logs every run in seeds.json."""
import base64, json, sys, time, urllib.request, pathlib

API = "http://127.0.0.1:7860"; OUT = pathlib.Path(__file__).parent
INIT = OUT.parent/"sentinel"/"sentinel_card_bg.png"
CKPT = "sd/waiNSFWIllustrious_v150.safetensors [befc694a29]"
BEE = ("anthropomorphic honeybee mascot, (round golden-yellow bee head with no ink outline, its edge is soft felt fuzz with tiny fuzz spikes sitting directly against the background:1.3), (visible felt fuzz texture on the face and body:1.2), no hair, huge glossy black bead eyes with one simple round white highlight each, "
       "blush cheeks, (two thin natural smooth black bee antennae with small round tips:1.3), chubby fuzzy bee body in warm honey orange and dark brown, abdomen hidden below the frame, "
       "(arms with fuzzy black felt stripe bands drawn as ragged ink-hatched fur with spiky frayed edges, like the Sentinel's bands, never a flat smooth band:1.45), translucent pale wings, no badge, no patch, no emblem")
STYLE = ("stylized collectible NFT character illustration, soft matte felt texture, natural fine soft fuzz on head and body, ink outlines, "
         "light crosshatching only in shadow areas, gentle soft shading, upper-body framing, facing slightly left, centered, filling the square, "
         "plain flat background in dusty sky blue, strong silhouette, readable at small size")
NEG = ("nsfw, nude, suggestive, pointing finger, index finger extended, arm merged into the body, armless, spiked bracelet, spikes on wrist, flat smooth black arm band, solid black stripe on arm, star-shaped eye highlights, sparkle eyes, star pupils, paddle antennae, racket antennae, striped antennae, hatched antennae, dripping antennae, thick club antennae, ink drips from antennae, black outline around the head, ink contour line on the face, thick lineart on the head, dripping, drips, liquid, melting, smooth clean outline, clean silhouette, vector, sticker, bracelet, bangle, wristband, cuff, studded, glossy black ring, leather strap on arm, lantern, lamp, torch, candle, bee abdomen, bee tail, stinger, striped abdomen, badge, patch, emblem, crest, pin, medal, hair, bangs, fringe, human face, human skin, girl, boy, kawaii, smooth flat shading, glossy skin, shiny, plastic, vinyl, "
       "photograph, realistic insect, green background, green body, foliage, scene, extra characters, human, watercolour, sketchy, weapon, text, letters, "
       "watermark, logo, extra limbs, deformed, blurry, teal, muddy stripes, noisy hatching")
# persona per rank: eyes, brows, mouth, headgear, outfit, pose. The Sentinel stays the thumbs-up adventurer.
RANKS = {
  "warden": "calm watchful grove keeper, (kind half-lidded eyes, gentle closed-mouth smile:1.2), wide-brimmed woven straw hat between the antennae, "
            "kraft brown felt vest with a short cloak of stitched leaves over the shoulders, brass-buckle backpack, one hand raised making a peace sign with two fingers",
  "guardian": "sturdy broad-faced protector, (thick determined dark eyebrows:1.3), steady confident eyes, brave closed-mouth smirk, (round brass goggles pushed up on the forehead between the antennae:1.3), "
              "fitted kraft brown leather vest with riveted iron shoulder pieces, iron-clasp backpack, one hand raised open-palmed for a high five",
  "vanguard": "bold energetic pathfinder, wide excited grin showing one small tooth, bright eager eyes, one eyebrow raised, red bandana tied around the head under the antennae, "
              "honeycomb-patterned bronze chest armour over a kraft brown vest, backpack with a rolled map on top, (one arm raised with a clenched fist pumped up in the air in triumph:1.4)",
  "paragon": "wise serene elder bee king, kind calm eyes behind (tiny round gold-rimmed spectacles:1.3), (soft white fuzzy eyebrows and a small white fuzzy beard:1.3), gentle closed-mouth smile, (small gold laurel crown between the antennae:1.2), royal robe of kraft felt with gold-trimmed edges and a honeycomb clasp over gold honeycomb chest armour, (one arm held out clearly to the side, separate from the body, the hand gripping a tall wooden staff topped with a glowing honeycomb:1.4), gold-trimmed backpack",
}
def post(path, payload):
    req = urllib.request.Request(API + path, data=json.dumps(payload).encode(), headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=1800) as r: return json.load(r)
def main():
    run, which, dn, seeds = sys.argv[1], sys.argv[2], float(sys.argv[3]), [int(s) for s in sys.argv[4:]]
    ranks = list(RANKS) if which == "all" else [which]
    init = base64.b64encode(INIT.read_bytes()).decode()
    lp = OUT/"seeds.json"; log = json.load(open(lp)) if lp.exists() else {"runs": {}}
    for rank in ranks:
        # the hand phrase is what stopped fingerless arm stubs (round 6, seed 51002)
        prompt = f"cute honeybee {RANKS[rank]}, (the raised hand with its fingers clearly visible in front of the wing:1.35), " + BEE + ", " + STYLE
        key = f"{rank}_{run}"
        entry = log["runs"].setdefault(key, {"mode": "img2img", "init": str(INIT.relative_to(OUT.parent)), "checkpoint": CKPT, "prompt": prompt, "negative": NEG, "images": []})
        for seed in seeds:
            t = time.time()
            res = post("/sdapi/v1/img2img", {"init_images": [init], "denoising_strength": dn, "prompt": prompt, "negative_prompt": NEG, "seed": seed,
                "steps": 30, "cfg_scale": 6.5, "sampler_name": "DPM++ 2M", "scheduler": "karras", "width": 1024, "height": 1024, "resize_mode": 0,
                "override_settings": {"sd_model_checkpoint": CKPT}, "override_settings_restore_afterwards": False, "save_images": False})
            fn = OUT/f"{rank}_{run}_d{int(round(dn*100))}_{seed}.png"; fn.write_bytes(base64.b64decode(res["images"][0]))
            entry["images"] = [i for i in entry["images"] if i["file"] != fn.name] + [{"file": fn.name, "seed": seed, "denoising_strength": dn}]
            json.dump(log, open(lp, "w"), indent=1); print(fn.name, f"{time.time()-t:.0f}s", flush=True)
if __name__ == "__main__": main()
