#!/usr/bin/env python3
"""Season 1, props drawn by hand where painting them in (fix.py) failed: the clear glass of Refill Round's bottle, Hive Workshop's
toolbox merged with its wrench, Rain Patrol's leaf umbrella, Clean Shore's net of collected bottles, Old Oak's seedling.
Run with the WebUI venv python: props.py → <card>_bee_prop.png for each of the five (sources are named in the code)."""
import pathlib, math, random, importlib.util
import numpy as np, cv2
from PIL import Image, ImageDraw, ImageFilter
D = pathlib.Path(__file__).parent; INK = (58, 40, 28, 255)
def hsv_of(im): return cv2.cvtColor(np.asarray(im.convert("RGB")), cv2.COLOR_RGB2HSV)
def bg_mask(im):   # the flat dusty blue background (OpenCV hue 0..179)
    h = hsv_of(im); return ((np.abs(h[..., 0].astype(int) - 114) < 16) & (h[..., 1] > 25)).astype(np.uint8)

def refill():      # the dark fill of the bottle becomes pale glass; a rim of the dark stays as its outline
    im = Image.open(D/"w_refill_fix_94001.png").convert("RGB"); a = np.asarray(im).copy(); h = hsv_of(im)
    poly = np.zeros(a.shape[:2], np.uint8); cv2.fillPoly(poly, [np.int32([(442, 602), (525, 602), (602, 973), (576, 1024), (397, 1024), (384, 973), (435, 768)])], 1)
    dark = ((h[..., 2] < 95) & (poly > 0)).astype(np.uint8); inner = cv2.erode(dark, np.ones((13, 13), np.uint8)); inner = cv2.dilate(inner, np.ones((5, 5), np.uint8)) & dark
    glass = np.array((214, 229, 232)); yy = np.linspace(0, 1, a.shape[0])[:, None, None]
    a = np.where(inner[..., None] > 0, (glass - 14*yy).astype(np.uint8), a)
    Image.fromarray(a.astype(np.uint8)).save(D/"refill_round_bee_prop.png")

def hive():        # wrench from one repair, toolbox from another
    w = Image.open(D/"w_hive_fix_94003.png").convert("RGB"); b = Image.open(D/"w_hivebox_fix_94002.png").convert("RGB")
    m = Image.new("L", w.size, 0); ImageDraw.Draw(m).rectangle((40, 760, 330, 1024), fill=255)
    w.paste(b, (0, 0), m.filter(ImageFilter.GaussianBlur(3))); w.save(D/"hive_workshop_bee_prop.png")

def leaf_shape(cx, cy, rx, ry, rot, n=60):   # a broad leaf: pointed at both ends of its long axis
    pts = []
    for i in range(n):
        t = 2*math.pi*i/n; x = rx*math.cos(t); y = ry*math.sin(t)*(1 - 0.35*abs(math.cos(t))**3)
        pts.append((cx + x*math.cos(rot) - y*math.sin(rot), cy + x*math.sin(rot) + y*math.cos(rot)))
    return pts
def rain():        # a big leaf over the head, behind the bee, its stem tucked in at the shoulder
    im = Image.open(D/"rain_patrol_bee_d72_81003.png").convert("RGB"); bg = bg_mask(im)
    L = Image.new("RGBA", im.size, (0, 0, 0, 0)); d = ImageDraw.Draw(L); cx, cy, rx, ry, rot = 700, 235, 345, 165, math.radians(-7)
    stem = [(540, 610), (560, 470), (620, 330), (cx, cy)]
    d.line(stem, fill=INK, width=20, joint="curve"); d.line(stem, fill=(104, 150, 74, 255), width=11, joint="curve")
    pts = leaf_shape(cx, cy, rx, ry, rot); d.polygon(pts, fill=(104, 158, 78, 255)); d.line(pts + pts[:1], fill=INK, width=7, joint="curve")
    lo = leaf_shape(cx, cy + 34, rx*0.93, ry*0.72, rot); m2 = Image.new("L", im.size, 0); ImageDraw.Draw(m2).polygon(lo, fill=255)   # darker underside towards the bee
    m1 = Image.new("L", im.size, 0); ImageDraw.Draw(m1).polygon(pts, fill=255)
    L.paste((84, 136, 66, 255), (0, 0), Image.fromarray((np.asarray(m1)//255*np.asarray(m2)).astype(np.uint8)))
    d = ImageDraw.Draw(L); ax = (math.cos(rot), math.sin(rot)); p = lambda u, v: (cx + u*ax[0] - v*ax[1], cy + u*ax[1] + v*ax[0])
    d.line([p(-rx + 10, 0), p(rx - 10, 0)], fill=(58, 96, 48, 255), width=5)
    for u in range(-250, 251, 100):
        for s in (-1, 1): d.line([p(u, 0), p(u + 70, s*ry*0.62*(1 - abs(u)/420))], fill=(58, 96, 48, 255), width=3)
    d.line(pts + pts[:1], fill=INK, width=7, joint="curve")
    a = np.asarray(L).copy(); a[..., 3] = a[..., 3]*cv2.erode(bg, np.ones((3, 3), np.uint8))          # only where the background shows: behind the bee
    out = im.convert("RGBA"); out.alpha_composite(Image.fromarray(a)); out.convert("RGB").save(D/"rain_patrol_bee_prop.png")

def shore():       # the cream sack in the net becomes collected glass bottles, the net drawn over them
    im = Image.open(D/"clean_shore_bee_d64_71002.png").convert("RGB"); h = hsv_of(im)
    reg = np.zeros(h.shape[:2], np.uint8); reg[380:1024, 20:400] = 1
    sack = ((h[..., 1] < 75) & (h[..., 2] > 185) & (reg > 0)).astype(np.uint8); sack = cv2.morphologyEx(sack, cv2.MORPH_CLOSE, np.ones((9, 9), np.uint8))
    n, lab, st, _ = cv2.connectedComponentsWithStats(sack, 4); keep = [i for i in range(1, n) if st[i, cv2.CC_STAT_AREA] > 3000]; sack = np.isin(lab, keep).astype(np.uint8)
    sack = cv2.morphologyEx(sack, cv2.MORPH_CLOSE, np.ones((31, 31), np.uint8)); cnt, _ = cv2.findContours(sack, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE); cv2.drawContours(sack, cnt, -1, 1, -1)
    hand = ((h[..., 1] > 110) & (h[..., 0] > 12) & (h[..., 0] < 40)) | (h[..., 2] < 70)                 # never over the thumb, the arm or any ink
    sack = cv2.medianBlur(sack*255, 21)//255; sack[cv2.dilate(hand.astype(np.uint8), np.ones((5, 5), np.uint8)) > 0] = 0
    sack = cv2.morphologyEx(sack, cv2.MORPH_OPEN, np.ones((15, 15), np.uint8)); inner = sack
    L = Image.new("RGBA", im.size, (232, 222, 196, 255)); d = ImageDraw.Draw(L); rnd = random.Random(5)
    cols = [(112, 164, 116), (120, 168, 204), (196, 146, 76), (150, 190, 170), (104, 150, 188)]
    def bottle(cx, cy, ang, col, s=1.0):
        B = Image.new("RGBA", (120, 260), (0, 0, 0, 0)); b = ImageDraw.Draw(B)
        b.rounded_rectangle((20, 80, 100, 250), 22, fill=col + (255,), outline=INK, width=5); b.polygon([(34, 86), (48, 30), (72, 30), (86, 86)], fill=col + (255,))
        b.line([(34, 86), (48, 30), (72, 30), (86, 86)], fill=INK, width=5, joint="curve"); b.rectangle((44, 12, 76, 32), fill=tuple(int(c*0.8) for c in col) + (255,), outline=INK, width=4)
        b.line([(38, 110), (38, 215)], fill=(255, 255, 255, 150), width=8)
        B = B.resize((int(120*s), int(260*s)), Image.LANCZOS).rotate(ang, resample=Image.BICUBIC, expand=True); L.alpha_composite(B, (int(cx - B.width/2), int(cy - B.height/2)))
    for i, (cx, cy) in enumerate([(95, 470), (215, 455), (80, 650), (200, 690), (120, 860), (260, 880), (330, 760), (60, 990), (220, 1010)]):
        bottle(cx, cy, rnd.uniform(-70, 70), cols[i % len(cols)], rnd.uniform(0.85, 1.05))
    d = ImageDraw.Draw(L)
    for k in range(-1024, 1024, 52):                                                                   # the net: two sets of diagonal cords
        d.line([(k, 0), (k + 1024, 1024)], fill=(140, 98, 56, 255), width=4); d.line([(k + 1024, 0), (k, 1024)], fill=(140, 98, 56, 255), width=4)
    a = np.asarray(L).copy(); a[..., 3] = inner*255
    out = im.convert("RGBA"); out.alpha_composite(Image.fromarray(a).filter(ImageFilter.GaussianBlur(0.5)))
    edge = cv2.morphologyEx(inner, cv2.MORPH_GRADIENT, np.ones((5, 5), np.uint8)); e = np.zeros(a.shape, np.uint8); e[edge > 0] = INK; out.alpha_composite(Image.fromarray(e)); out.convert("RGB").save(D/"clean_shore_bee_prop.png")

def oak():         # a small hand out of the cloak, holding a seedling in a clay pot
    im = Image.open(D/"old_oak_bee_d64_71002.png").convert("RGBA"); d = ImageDraw.Draw(im); x, y = 300, 730
    Y = (252, 214, 110, 255); POT = (190, 108, 66, 255)
    d.line([(x + 20, y - 70), (x + 16, y - 150)], fill=INK, width=12); d.line([(x + 20, y - 70), (x + 16, y - 150)], fill=(104, 150, 74, 255), width=6)   # stem
    for s in (-1, 1):                                                                                   # two leaves
        pts = leaf_shape(x + 16 + s*44, y - 168 - 6, 46, 24, math.radians(-s*28)); d.polygon(pts, fill=(112, 166, 80, 255)); d.line(pts + pts[:1], fill=INK, width=5, joint="curve")
        d.line([(x + 16, y - 150), (x + 16 + s*78, y - 190)], fill=(58, 96, 48, 255), width=3)
    d.polygon([(x - 34, y - 78), (x + 74, y - 78), (x + 60, y + 6), (x - 20, y + 6)], fill=POT); d.line([(x - 34, y - 78), (x + 74, y - 78), (x + 60, y + 6), (x - 20, y + 6), (x - 34, y - 78)], fill=INK, width=6, joint="curve")
    d.rounded_rectangle((x - 42, y - 96, x + 82, y - 70), 8, fill=(206, 124, 78, 255), outline=INK, width=6)
    d.ellipse((x + 40, y - 30, x + 150, y + 60), fill=(40, 30, 24, 255))                                # fuzzy dark wrist coming out of the cloak
    d.ellipse((x - 46, y - 26, x + 100, y + 66), fill=Y, outline=INK, width=6)                           # the hand cupping the pot
    for fx in (x - 2, x + 28, x + 58): d.arc((fx - 16, y - 40, fx + 16, y + 14), 20, 160, fill=INK, width=5)   # finger tips over the pot's foot
    im.convert("RGB").save(D/"old_oak_bee_prop.png")

for f in (refill, hive, rain, oak): f(); print(f.__name__)   # shore(): the net mask still comes out ragged, not used yet
