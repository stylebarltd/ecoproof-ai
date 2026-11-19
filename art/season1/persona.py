#!/usr/bin/env python3
"""Season 1 cards, the character (Pola, 2026-11-18: every card its own pose AND its own bee, not the rank bee again). Same recipe as
the five rank personas (../v2/ranks/personas/gen2.py): img2img from the Sentinel card on dusty blue, so the felt-and-ink rendering and
the bee anatomy carry over, while the prompt gives each card its own face, headgear, outfit, pose and what it holds. The plain blue
background is keyed out afterwards and the bee laid over its scene (scene.py, compose.py). Local A1111 API.
Usage: persona.py <card> <denoise or - for the card's own> seed... → <card>_bee_d<NN>_<seed>.png, logged in seeds.json.
With INIT=S in the environment a challenge card starts from the Sentinel card too (file <card>_bee_s<NN>_<seed>.png): the rank bee's own
picture holds its pose too firmly for a pose that differs much (map in both hands, arms out wide)."""
import base64, json, os, sys, pathlib, urllib.request, importlib.util
OUT = pathlib.Path(__file__).parent; API = "http://127.0.0.1:7860"
spec = importlib.util.spec_from_file_location("gen2", OUT/"../v2/ranks/personas/gen2.py"); g = importlib.util.module_from_spec(spec); spec.loader.exec_module(g)
NEG = g.NEG.replace("badge, patch, emblem, crest, pin, medal, ", "badge, patch, emblem, crest, pin, medal, medallion, round badge, speech bubble, ")
NEG += ", logo on cup, face on cup, print on cup, print on bag, lettering on bag, second bee, small bee, baby bee, two characters, plush toy, bowling pin, black fur collar, ice cream, whipped cream, studded wristband, bead bracelet"
# second pass (Pola, 2026-11-19: some guest bees came out as flat smooth cartoon bees or pale cream ones): hold the felt look and the golden colour
NEG += ", flat cartoon, cel shading, smooth yellow skin, smooth round head, pale face, white face, cream face, beige face, washed out"
FELT = "(golden-yellow wool felt bee with fuzzy frayed fur edges all around the head and cheeks:1.35), "
SENTINEL = "young bee scout with a small friendly closed-mouth smile, wearing a (kraft brown felt hooded cloak with the hood down around the shoulders, fastened with a wooden toggle:1.3) and a leather backpack"
WARDEN = "cheerful friendly bee with (green leaf-shaped antenna tips:1.2) and a big open happy smile, a knitted kraft brown scarf collar, a kraft brown felt jacket with many small pockets, leather backpack"
GUARDIAN = "sturdy calm protector bee with a confident closed-mouth smile, (round brass goggles hanging on its chest:1.2), quilted brown leather vest, leather backpack"
VANGUARD = "bold energetic pathfinder bee with a wide grin showing teeth, (red bandana tied around its neck:1.3), quilted honeycomb-pattern bronze brown vest, brown backpack"
PARAGON = "wise serene elder bee with (tiny round gold-rimmed spectacles:1.3), a small tuft of white fuzz and a gold laurel on its head, a dark brown feathered cloak, (holding a tall gnarled wooden staff:1.3)"
# card: (the bee and its pose, the picture it starts from, denoise, words to take out of the negative prompt)
# Lucky cards are a new guest bee (from the Sentinel card, 0.78); challenge cards are the rank's own bee in a new pose (from its own card, 0.64).
S, NEW, OWN = "../v2/ranks/sentinel/sentinel_card_bg.png", 0.78, 0.64
PERSONAS = {
 "morning_cup": ("sleepy cheerful early-bird bee, (happy half-closed eyes, small content smile:1.2), wearing a chunky cream cable-knit sweater and a rust orange knitted scarf, (holding a plain tall bamboo coffee cup with a brown lid in both hands in front of its chest, a wisp of steam rising from the cup:1.4)", S, NEW, []),
 "market_day": ("cheerful round-cheeked shopper bee, (big open-mouth happy smile:1.2), wearing a cream linen shirt under a plain kraft brown apron, (a plain cream cotton tote bag with carrot tops and leafy greens sticking out of it hanging from one raised hand:1.4), the other hand waving", S, NEW, []),
 "first_trail": (SENTINEL + ", (one hand holding a wooden walking stick upright, the other hand raised flat above its eyes like a visor, looking into the distance:1.4), curious wide eyes", S, 0.68, []),
 "first_proof": (SENTINEL + ", (big proud happy open-mouth smile:1.2), (one arm raised high holding up a small closed brown kraft passport booklet, a little rectangular book with a plain cover, clearly visible above its shoulder:1.5), the other hand on its hip", S, 0.70, []),
 # Warden: keeper of the neighbourhood
 "refill_round": ("careful tidy shopkeeper bee with a gentle focused smile, a cream linen headband, a kraft brown apron over a cream shirt, (holding a clear glass bottle with a cork in one hand and a small metal funnel in the other:1.4)", S, NEW, []),
 "rain_patrol": ("cheerful little night-walker bee with bright curious eyes, wearing a (mustard yellow raincoat with the hood up:1.3), (holding a big green leaf above its head like an umbrella with one hand:1.4), (a small glowing brass lantern in the other hand:1.3)", S, NEW, ["lantern, lamp, torch, candle, "]),
 "four_corners": (WARDEN + ", (holding a large unfolded paper map open with both hands in front of its chest, looking down at it happily:1.4)", "_init_warden.png", OWN, []),
 "wrap_it": (WARDEN + ", (holding a round loaf of bread half wrapped in a yellow honeycomb-patterned cloth in both hands:1.4)", "_init_warden.png", OWN, []),
 # Guardian: on duty
 "hive_workshop": ("skilled tinkerer bee with a concentrated happy grin, (leather goggles pushed up on its forehead:1.3), a thick brown leather apron with tool loops, (holding a wooden mallet in one raised hand and a small wooden cogwheel in the other:1.4)", S, NEW, []),
 "night_watch": ("calm watchful sentry bee with half-lidded alert eyes and a small smile, wearing a (deep navy blue wool cloak with a brass clasp:1.3), (holding up a glowing brass lantern in one raised hand:1.4)", S, NEW, ["lantern, lamp, torch, candle, "]),
 "river_crossing": (GUARDIAN + ", (one raised hand gripping a long wooden walking pole planted upright beside it, the other arm stretched out to the side for balance:1.45), focused happy look", "_init_guardian.png", OWN, []),
 "kilo_keeper": (GUARDIAN + ", (one arm raised flexing its muscle proudly, the other hand holding a full burlap sack over its shoulder:1.4), proud grin", "_init_guardian.png", OWN, []),
 # Vanguard: leading the way
 "mountain_pass": ("bold mountaineer bee with a determined grin, a red knitted hat, (a long red scarf blowing sideways in the wind:1.3), a bronze-brown padded jacket, (one raised hand gripping a wooden flagpole with a big orange flag waving above its head:1.5), the other hand on its hip", S, 0.80, []),
 "storm_flight": ("daring aviator bee with a fearless laughing grin, (a brown leather aviator cap with goggles on its forehead:1.3), a bronze-brown flight jacket with a cream scarf streaming behind, (both arms stretched forward as it flies:1.4), wings spread wide, raindrops", S, 0.80, []),
 "twelve_flags": (VANGUARD + ", (holding a wooden flagpole with a small orange pennant flag upright in one hand, the other fist raised in triumph:1.4)", "_init_vanguard.png", OWN, []),
 "clean_shore": (VANGUARD + ", (carrying a rope net sack full of collected bottles over one shoulder with one hand, the other hand giving a thumbs up:1.4)", "_init_vanguard.png", OWN, []),
 # Paragon: legend
 "golden_hour": ("majestic serene bee sage with closed peaceful eyes and a gentle smile, a thin gold band on its head, (a flowing cream and gold robe with gold honeycomb embroidery:1.3), (raising a golden staff high with one hand:1.4), warm golden rim light", S, 0.82, []),
 "great_hive": ("kind radiant queen bee with a warm motherly smile, (a small golden crown between the antennae:1.3), (royal gold honeycomb armour under a honey-coloured cape with a white fur collar:1.3), (holding a golden honey dipper like a sceptre in one hand:1.4), the other hand open in welcome", S, 0.82, []),
 "world_walker": (PARAGON + ", (the free arm stretched far out to the side, pointing the way with its hand:1.45), calm knowing smile", "_init_paragon.png", OWN, []),
 "old_oak": (PARAGON + ", (the free hand gently holding up a tiny green seedling with two leaves:1.4), tender smile", "_init_paragon.png", OWN, []),
}
card = sys.argv[1]; who, initfile, dn0, allow = PERSONAS[card]
dn = float(sys.argv[2]) if sys.argv[2] != "-" else dn0; seeds = [int(x) for x in sys.argv[3:]]
tag = "d"
if os.environ.get("INIT") == "S": initfile, tag = S, "s"
if card == "world_walker": allow = allow + ["pointing finger, index finger extended, "]
for w in allow: NEG = NEG.replace(w, "")
prompt = f"cute honeybee {who}, (hands with fingers clearly visible:1.2), " + FELT + g.BEE + ", " + g.STYLE
init = base64.b64encode((OUT/initfile).read_bytes()).decode()
lp = OUT/"seeds.json"; log = json.load(open(lp)) if lp.exists() else {}
for seed in seeds:
    res = g.post("/sdapi/v1/img2img", {"init_images": [init], "denoising_strength": dn, "prompt": prompt, "negative_prompt": NEG, "seed": seed, "steps": 30, "cfg_scale": 6.5,
        "sampler_name": "DPM++ 2M", "scheduler": "karras", "width": 1024, "height": 1024, "resize_mode": 0, "override_settings": {"sd_model_checkpoint": g.CKPT}, "override_settings_restore_afterwards": False, "save_images": False})
    fn = OUT/f"{card}_bee_{tag}{int(round(dn*100))}_{seed}.png"; fn.write_bytes(base64.b64decode(res["images"][0]))
    log[fn.name] = {"card": card, "seed": seed, "denoising_strength": dn, "init": initfile, "checkpoint": g.CKPT, "prompt": prompt, "negative": NEG, "settings": "img2img 1024x1024 steps 30 cfg 6.5 DPM++ 2M karras"}
    json.dump(log, open(lp, "w"), indent=1); print(fn.name, flush=True)
