#!/usr/bin/env python3
"""Season 1 cards, last step: cut the picked bee out of its flat dusty-blue background (hue key, as ../v2/ranks/personas/cards.py)
and stand it in its scene, at the bottom edge, with a soft shadow behind it. PICKS says which bee render, which scene, how big and
where. Run with the WebUI venv python (numpy, cv2, PIL): compose.py [card ...] → <card>.png (1024x1024) and <card>_bee.png."""
import sys, pathlib
import numpy as np, cv2
from PIL import Image, ImageFilter
D = pathlib.Path(__file__).parent
PICKS = {  # card: bee render, scene, size of the bee (1 = full width), x of its left edge, and optional repairs
 "morning_cup": dict(bee="morning_cup_bee_d78_66002_fix_3.png", scene="morning_cup_scene_63004.png", scale=0.80, x=-40),
 "market_day": dict(bee="market_day_bee_d78_66002.png", scene="market_day_scene_63001.png", scale=0.76, x=150),
 # the render drew the antenna tips cream: darkened to the Sentinel's own brown-black
 "first_trail": dict(bee="first_trail_bee_d68_66001.png", scene="first_trail_scene_63004.png", scale=0.78, x=235, dark=[(370, 120, 610, 260), (790, 120, 1010, 260)]),
 # the scene's orange blot on the paper sat right behind the head like a tuft of hair: painted out
 "first_proof": dict(bee="first_proof_bee_d70_67002.png", scene="first_proof_scene_64006.png", scale=0.82, x=-150, erase=[(545, 395, 725, 570)]),
}
def key(im):
    """Alpha from hue: the background is the only blue-violet thing; holes inside the bee are filled, loose specks dropped."""
    hsv = np.asarray(im.convert("RGB").convert("HSV")).astype(np.float32); Hh, Ss, Vv = hsv[..., 0], hsv[..., 1], hsv[..., 2]
    alpha = 1 - np.clip(1 - (np.abs(Hh - 161) - 20)/8, 0, 1)*np.clip((Ss - 14)/14, 0, 1)*np.clip((Vv - 70)/30, 0, 1)
    fg = (alpha >= 0.5).astype(np.uint8)
    n, lab, stats, _ = cv2.connectedComponentsWithStats(1 - fg, 4)            # background regions not touching the border are holes in the bee
    H, W = fg.shape; border = set(lab[0]) | set(lab[-1]) | set(lab[:, 0]) | set(lab[:, -1])
    hole = np.isin(lab, [i for i in range(1, n) if i not in border]); alpha = np.where(hole, 1.0, alpha)
    n, lab, stats, _ = cv2.connectedComponentsWithStats((alpha >= 0.5).astype(np.uint8), 4)
    small = np.isin(lab, [i for i in range(1, n) if stats[i, cv2.CC_STAT_AREA] < 2000]); alpha = np.where(small, 0.0, alpha)
    out = im.convert("RGBA"); out.putalpha(Image.fromarray((alpha*255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(0.6))); return out

for card in (sys.argv[1:] or PICKS):
    p = PICKS[card]; im = Image.open(D/p["bee"]).convert("RGB")
    for (x0, y0, x1, y1) in p.get("dark", []):
        a = np.asarray(im).copy(); box = a[y0:y1, x0:x1].astype(np.int32); light = (box[..., 0] > box[..., 2] + 8) & (box.sum(2) > 300)
        box[light] = (62, 44, 34); a[y0:y1, x0:x1] = box; im = Image.fromarray(a.astype(np.uint8))
    bee = key(im); bee.save(D/f"{card}_bee.png")
    n = round(1024*p["scale"]); bee = bee.resize((n, n), Image.LANCZOS); x, y = p["x"], 1024 - n
    sc = cv2.cvtColor(cv2.imread(str(D/p["scene"])), cv2.COLOR_BGR2RGB)
    for (x0, y0, x1, y1) in p.get("erase", []):
        em = np.zeros(sc.shape[:2], np.uint8); em[y0:y1, x0:x1] = 255; sc = cv2.inpaint(sc, em, 7, cv2.INPAINT_TELEA)
    scene = Image.fromarray(sc).convert("RGBA")
    layer = Image.new("RGBA", (1024 + 2*n, 1024), (0, 0, 0, 0)); layer.paste(bee, (x + n, y))   # padded, so a bee may hang over either side
    bee_full = layer.crop((n, 0, n + 1024, 1024))
    shadow = Image.new("RGBA", scene.size, (0, 0, 0, 0)); shadow.paste(Image.new("RGBA", scene.size, (58, 42, 28, 255)), (12, 8), bee_full.getchannel("A").point(lambda v: int(v*0.38)))
    scene.alpha_composite(shadow.filter(ImageFilter.GaussianBlur(14))); scene.alpha_composite(bee_full)
    scene.convert("RGB").save(D/f"{card}.png"); print(f"{card}.png")
