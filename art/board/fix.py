#!/usr/bin/env python3
"""Round 6 (land board): repairs to the chosen painting before compose.py, after Pola's review:
1. the painter's dirt path has dark cross strokes that stick out beside the app's road: taken out (the path stays plain sand);
2. a stray piece of path on the left that joins the middle and the bottom pass (no trail runs there) becomes grass;
3. the bays at the left and the bottom edge were overlapping pools and beaches, each with its own sand rim: one bay with one beach each.
The shapes are laid in by code, then one light inpaint pass (0.55) over them gives them the painting's brush.
Usage: fix.py <seed>... → mapg_land_<seed>.png, and mapg_land_pre.png (the code step alone). WebUI venv python."""
import base64, json, re, sys, pathlib, urllib.request
import numpy as np, cv2
OUT = pathlib.Path(__file__).parent; API = "http://127.0.0.1:7860"; SRC = "mapd_land_2.png"
CKPT = "sd/waiNSFWIllustrious_v150.safetensors [befc694a29]"
PROMPT = ("masterpiece, best quality, no humans, scenery, map, from above, top-down view of an illustrated board game map, soft green grass meadow, a small sandy bay with calm turquoise sea water, "
          "storybook illustration, clean ink outlines, cel shading, soft warm light, vivid natural colours")
NEG = ("nsfw, human, person, character, animal, face, text, letters, numbers, signature, watermark, logo, frame, border, photograph, dark, gloomy, blurry, horizon, sky, clouds, isometric, side view, "
       "road, path, fence, honey, giant flowers, close-up, building, boat, rocks, island")
k = 1.536; gap = 186 * k; j = json.load(open(OUT/"layout.json"))["land"]
img = cv2.imread(str(OUT/SRC)); h, w = img.shape[:2]
road = np.array([[float(a) * k, float(b) * k] for a, b in re.findall(r"([-\d.]+) ([-\d.]+)", j["road"])], np.float32)
tm = np.full((h, w), 255, np.uint8); cv2.polylines(tm, [road.astype(np.int32)], False, 0, 2); near = cv2.distanceTransform(tm, cv2.DIST_L2, 5)
H, S, V = cv2.split(cv2.cvtColor(img, cv2.COLOR_BGR2HSV))
# 1. cross strokes: dark brown, on or beside the path
ticks = ((H < 28) & (V < 185) & (S > 60) & (near < gap * 0.11)).astype(np.uint8) * 255
ticks = cv2.dilate(ticks, np.ones((5, 5), np.uint8)); img = cv2.inpaint(img, ticks, 4, cv2.INPAINT_TELEA)
# 2. the stray path: sand-coloured or stroke pixels in its box, away from the trail
H, S, V = cv2.split(cv2.cvtColor(img, cv2.COLOR_BGR2HSV)); box = np.zeros((h, w), bool); box[440:715, 95:215] = True
stray = (box & (near > gap * 0.085) & (H < 30)).astype(np.uint8) * 255
stray = cv2.dilate(cv2.morphologyEx(stray, cv2.MORPH_OPEN, np.ones((3, 3), np.uint8)), np.ones((13, 13), np.uint8)); stray[near < gap * 0.07] = 0
img = cv2.inpaint(img, stray, 9, cv2.INPAINT_TELEA)
# 3. one bay each
grass, sand, sea = (88, 190, 150), (170, 222, 240), (205, 196, 52)
bay = np.zeros((h, w), np.uint8)
for c, r in (((-14, 492), 1.0), ((345, 884), 0.82)):   # the left edge, and the bottom edge (a sand arc above a second beach there)
    e = lambda a, b: (int(a * r), int(b * r))
    cv2.ellipse(img, c, e(150, 128), 0, 0, 360, grass, -1, cv2.LINE_AA); cv2.ellipse(img, c, e(116, 100), 0, 0, 360, sand, -1, cv2.LINE_AA); cv2.ellipse(img, c, e(94, 80), 0, 0, 360, sea, -1, cv2.LINE_AA)
    cv2.ellipse(img, (c[0], c[1] - 8), e(70, 56), 0, 200, 330, (225, 220, 120), 3, cv2.LINE_AA); cv2.ellipse(bay, c, e(165, 143), 0, 0, 360, 255, -1)
mask = cv2.max(bay, cv2.dilate(stray, np.ones((9, 9), np.uint8))); mask[near < gap * 0.07] = 0
cv2.imwrite(str(OUT/"mapg_land_pre.png"), img); cv2.imwrite(str(OUT/"mask_land_fix.png"), mask); print("mapg_land_pre.png")
def call(path, payload):
    req = urllib.request.Request(API + path, data=json.dumps(payload).encode(), headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=1800) as r: return json.load(r)
def post(path, payload):
    try: return call(path, payload)
    except urllib.error.HTTPError as e:
        print("WebUI", e.code, "→ reloading the checkpoint", flush=True); call("/sdapi/v1/unload-checkpoint", {}); call("/sdapi/v1/reload-checkpoint", {}); return call(path, payload)
b64 = lambda a: base64.b64encode(cv2.imencode(".png", a)[1].tobytes()).decode()
lp = OUT/"seeds.json"; log = json.load(open(lp)) if lp.exists() else {}
for seed in [int(s) for s in sys.argv[1:]]:
    res = post("/sdapi/v1/img2img", {"init_images": [b64(img)], "mask": b64(mask), "mask_blur": 8, "inpainting_fill": 1, "inpaint_full_res": False, "denoising_strength": 0.55,
        "prompt": PROMPT, "negative_prompt": NEG, "seed": seed, "steps": 32, "cfg_scale": 6.5, "sampler_name": "DPM++ 2M", "scheduler": "karras",
        "width": w, "height": h, "override_settings": {"sd_model_checkpoint": CKPT}, "override_settings_restore_afterwards": False, "save_images": False})
    fn = f"mapg_land_{seed}.png"; (OUT/fn).write_bytes(base64.b64decode(res["images"][0]))
    log[fn] = {"format": "land", "from": SRC, "checkpoint": CKPT, "prompt": PROMPT, "negative": NEG, "settings": "fix.py: strokes and stray path taken out, one bay laid in by code, then inpaint 0.55 over mask_land_fix.png, steps 32 cfg 6.5 DPM++ 2M karras, mask blur 8"}
    json.dump(log, open(lp, "w"), indent=1); print(fn, flush=True)
