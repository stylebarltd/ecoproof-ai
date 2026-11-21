#!/usr/bin/env python3
"""Round 4/5, last step: the chosen painting per board, plus what the painter would not do: the river and its bridge are drawn by code
(a painted river became foam or puddles), and small painted objects (props.py) are cut out and set on the land at one scale, where the
trail, the stations and each other leave room. Cropped to the board → final_<fmt>.png and public/journey/<VER>/<land|port>.webp
(a new VER whenever a deployed picture changes, and PAINTED in components/PassportMap.tsx with it).
Usage: compose.py (WebUI venv python: cv2 + numpy)."""
import json, pathlib, re
import numpy as np, cv2
OUT = pathlib.Path(__file__).parent; VER = "v9"; WEB = OUT.parent.parent/"public/journey"/VER
LAYOUT = json.load(open(OUT/"layout.json"))
PICK = {"land": "mapne_land_78001.png", "port": "mapne_port_78002.png"}   # painted for the ranks at 1 / 10 / 20 / 35 / 50 (2026-11-20)
ROWS = {"land": (468, 282, 96), "port": (666, 568, 470, 372, 274, 176, 78)}; K = {"land": 1.536, "port": 2.2}; CROP = {"land": 860, "port": 1628}
# object → the renders to use (props.py); several = variants, one is drawn by chance and may be mirrored
PROP = {"palm": ["palm_74003", "palm_74006", "palm_74007", "palmshort_74006"], "parasol": ["parasol_74002"], "beachhut": ["beachhut_74002"],
        "hive": ["hive_74003"], "farm": ["farm_74003"], "cabin": ["cabin_74002"]}
BASE = {"palm": "sand", "palmshort": "sand", "farm": "grass", "hive": "grass"}   # the painted patch under the object, taken off
ERASE = {"beachhut_74002": [(0.775, 0, 1, 1), (0.72, 0.6, 1, 1)]}   # boxes (share of the render) to drop: a small palm and a rock beside the hut
# zone → (object, how many, size as a share of the distance between two passes of the trail); the same on both boards, so one scale
PLACE = {"shore": [("beachhut", 1, 0.46), ("palm", 7, 0.34), ("parasol", 4, 0.15)], "meadow": [("hive", 3, 0.36)], "hills": [("farm", 3, 0.27)], "summit": [("cabin", 1, 0.40)]}
# board → object → fixed places (painting pixels) instead of drawn ones (Pola's review of the landscape board: the cabin at the foot of the mountains, not on a
# peak; two farmhouses by the windmill and none in the top left corner)
FIXED = {"land": {"cabin": []}, "port": {"cabin": [], "beachhut": [(455, 500)]}}   # an empty list = none on this board (the mountains leave no flat place, and on grass or sand the snow cabin looked wrong; phone: the beach hut stood in the lake on the right)
# board → object → factor on its size (Pola's review of the desktop board: hive huts smaller, farmhouses half, to fit the painted farmhouse beside them)
SCALE = {"land": {"hive": 0.5, "farm": 0.5}}
# board → (painting to show through, distance in px): the beach stops this far before the mountains and the painting from before the beach step shows there
# (Pola: sand running straight into the rock is not nice, and it covered part of the painted lake at the mountains' foot)
UNDER = {"land": ("mapnb_land_ill_0.65_76001.png", 190)}
# board → (shift as a share of the pass distance, from, to in the same unit from the left edge): the river's mouth is moved along the trail's left turn so the
# bridge is clear of the rank station there (Vanguard at 35 stood on it), and the river swings back to its line before the lake
# board → (painting, boxes): water of the earlier painting, with its rim, is brought back inside these boxes (phone: the sand step covered the top of the lake on the right)
WATER_BACK = {"port": ("mapnb_port_ill_0.48_76002.png", [(540, 620, 704, 780)])}
RIVER_SHIFT = {"land": (-0.22, 0.6, 1.1)}
# board → boxes (x0, y0, x1, y1) where green leftovers of the painter on the sand are taken out (half a painted palm frond under a placed palm)
CLEAN = {}
AVOID = {}   # board → boxes no drawn object may stand in: the painted rowing boats (a palm stood on them)
SEED = {"land": 8, "port": 5}
# what the painted ground looks like per zone (mean hue 0-180, saturation, value under the object): the painter did not keep the guide's borders exactly
GROUND = {"shore": lambda h, s, v: v > 200 and s < 120 and h < 31, "meadow": lambda h, s, v: 30 < h < 55 and v > 165, "hills": lambda h, s, v: 30 < h < 55 and v > 165, "summit": lambda h, s, v: s < 70}

def cut(name):
    """The object without its paper: everything the paper colour reaches from the edge goes (as cut.py), the largest piece stays.
    Then the patch of sand or grass it was painted on goes too (BASE): on the map a plot under every house reads as a tile."""
    im = cv2.imread(str(OUT/f"prop_{name}.png")); h, w = im.shape[:2]
    mask = np.zeros((h + 2, w + 2), np.uint8); soft = cv2.GaussianBlur(im, (0, 0), 1.2)
    for x, y in [(0, 0), (w - 1, 0), (0, h - 1), (w - 1, h - 1), (w // 2, 0), (w // 2, h - 1), (0, h // 2), (w - 1, h // 2)]:
        cv2.floodFill(soft, mask, (x, y), 0, (3,) * 3, (3,) * 3, 4 | cv2.FLOODFILL_MASK_ONLY | (255 << 8))
    keep = 255 - mask[1:-1, 1:-1]
    for x0, y0, x1, y1 in ERASE.get(name, []): keep[int(y0 * h):int(y1 * h), int(x0 * w):int(x1 * w)] = 0
    H, S, V = cv2.split(cv2.cvtColor(soft, cv2.COLOR_BGR2HSV)); kind = BASE.get(name.split("_")[0])
    if kind == "sand": keep[(S < 70) & (V > 120)] = 0
    if kind == "grass": keep[(H > 28) & (H < 95) & (S > 25) & (V > 90)] = 0
    if kind: keep = cv2.morphologyEx(keep, cv2.MORPH_OPEN, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (9, 9)))   # the patch's ink outline is thin: it goes
    n, lab, stats, _ = cv2.connectedComponentsWithStats(keep, 8)
    keep = np.where(lab == 1 + int(np.argmax(stats[1:, cv2.CC_STAT_AREA])), 255, 0).astype(np.uint8)
    keep = cv2.GaussianBlur(cv2.erode(keep, np.ones((3, 3), np.uint8)), (0, 0), 0.9)
    ys, xs = np.nonzero(keep > 8); return np.dstack([im, keep])[ys.min():ys.max() + 1, xs.min():xs.max() + 1]

def paste(img, spr, cx, cy, size):
    """Sprite with its longer side = size, standing with its foot at (cx, cy + size/2), a soft shadow under it."""
    f = size / max(spr.shape[:2]); s = cv2.resize(spr, (max(1, round(spr.shape[1] * f)), max(1, round(spr.shape[0] * f))), interpolation=cv2.INTER_AREA)
    h, w = s.shape[:2]; x0, y0 = int(cx - w / 2), int(cy - h / 2); H, W = img.shape[:2]
    fx = np.nonzero(s[int(h * 0.88):, :, 3] > 128)[1]; fx = x0 + (fx.mean() if len(fx) else w / 2); fw = max(w * 0.2, (np.ptp(fx_) if len(fx_ := np.nonzero(s[int(h * 0.88):, :, 3] > 128)[1]) else w) * 0.7)   # the shadow lies under the foot (a palm leans)
    sh = np.zeros((H, W), np.float32); cv2.ellipse(sh, (int(fx + fw * 0.15), int(cy + h * 0.46)), (int(fw), max(2, int(h * 0.09))), 0, 0, 360, 0.22, -1, cv2.LINE_AA)
    img[:] = (img * (1 - cv2.GaussianBlur(sh, (0, 0), 2.5)[..., None])).astype(np.uint8)
    ax0, ay0, ax1, ay1 = max(x0, 0), max(y0, 0), min(x0 + w, W), min(y0 + h, H)
    if ax1 <= ax0 or ay1 <= ay0: return
    part = s[ay0 - y0:ay1 - y0, ax0 - x0:ax1 - x0]; a = part[..., 3:4].astype(np.float32) / 255
    img[ay0:ay1, ax0:ax1] = (part[..., :3] * a + img[ay0:ay1, ax0:ax1] * (1 - a)).astype(np.uint8)

SPR = {n: cut(n) for names in PROP.values() for n in names}
TALL = {"palm_74003": 1.0, "palm_74006": 0.9, "palm_74007": 1.15, "palmshort_74006": 0.72}   # palms differ in height
for fmt, src in PICK.items():
    img = cv2.imread(str(OUT/src)); h, w = img.shape[:2]; k = K[fmt]; gap = abs(ROWS[fmt][0] - ROWS[fmt][1]) * k; j = LAYOUT[fmt]; rs = np.random.RandomState(SEED[fmt])
    for x0, y0, x1, y1 in CLEAN.get(fmt, []):
        H_, S_, V_ = cv2.split(cv2.cvtColor(img[y0:y1, x0:x1], cv2.COLOR_BGR2HSV)); g = cv2.dilate(((H_ > 35) & (H_ < 95) & (S_ > 70)).astype(np.uint8) * 255, np.ones((7, 7), np.uint8))
        img[y0:y1, x0:x1] = cv2.inpaint(img[y0:y1, x0:x1].copy(), g, 5, cv2.INPAINT_TELEA)
    back = np.zeros(img.shape[:2], bool)   # where the earlier painting shows through: no beach there
    if fmt in UNDER:
        src_, dist = UNDER[fmt]; sm = cv2.imread(str(OUT/f"mask_{fmt}_summit.png"), 0); far = cv2.distanceTransform(np.where(sm > 0, 0, 255).astype(np.uint8), cv2.DIST_L2, 5)
        wob = cv2.resize(np.random.RandomState(3).rand(h // 60 + 2, w // 60 + 2).astype(np.float32), (w, h), interpolation=cv2.INTER_CUBIC) - 0.5
        a = cv2.GaussianBlur(((far + wob * 110 < dist) & (cv2.imread(str(OUT/f"mask_{fmt}_shore.png"), 0) > 0)).astype(np.float32), (0, 0), 5)
        a = np.clip(cv2.GaussianBlur(cv2.dilate(a, np.ones((25, 25), np.uint8)), (0, 0), 4), 0, 1)[..., None]   # a little over the zone's edge, where the sand step blurred into the neighbours
        img = (cv2.imread(str(OUT/src_)) * a + img * (1 - a)).astype(np.uint8); back = a[..., 0] > 0.15
    if fmt in WATER_BACK:
        old = cv2.imread(str(OUT/WATER_BACK[fmt][0])); oh = cv2.cvtColor(old, cv2.COLOR_BGR2HSV)
        for x0, y0_, x1, y1 in WATER_BACK[fmt][1]:
            wm = np.zeros((h, w), np.uint8); wm[y0_:y1, x0:x1] = (((oh[y0_:y1, x0:x1, 0] > 85) & (oh[y0_:y1, x0:x1, 0] < 112) & (oh[y0_:y1, x0:x1, 1] > 80)) * 255).astype(np.uint8)
            a = cv2.GaussianBlur(cv2.dilate(wm, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (37, 37))), (0, 0), 3).astype(np.float32)[..., None] / 255
            img = (old * a + img * (1 - a)).astype(np.uint8)
    road = np.array([[float(a) * k, float(b) * k] for a, b in re.findall(r"([-\d.]+) ([-\d.]+)", j["road"])], np.float32)
    tm = np.full((h, w), 255, np.uint8); cv2.polylines(tm, [road.astype(np.int32)], False, 0, 2); near = cv2.distanceTransform(tm, cv2.DIST_L2, 5)
    # the river: the line guide.py draws, as water of changing width with a lighter side, no dashes (those read as a road's centre line)
    y0 = (ROWS[fmt][-1] + ROWS[fmt][-2]) / 2 * k; xs = np.linspace(w * 0.80, -20, 400)
    sh, s0, s1 = RIVER_SHIFT.get(fmt, (0, 0, 1)); t_ = np.clip((xs / gap - s0) / (s1 - s0), 0, 1); off = sh * gap * (1 - t_ * t_ * (3 - 2 * t_))
    line = np.stack([xs, y0 + np.sin(xs / (gap * 0.45)) * gap * 0.12 * (1 - np.abs(off) / max(1e-6, abs(sh) * gap)) + np.sin(xs / (gap * 0.13)) * gap * 0.012 + off], 1)
    wd = gap * 0.05 * (1 + 0.28 * np.sin(xs / (gap * 0.21)) + 0.5 * (1 - xs / (w * 0.8)))   # wider towards the sea
    rmask = cv2.imread(str(OUT/f"mask_{fmt}_river.png"), 0)
    # the river is short (Pola): from the sea under the bridge and a little further, into a lake. River and lake are drawn layer by layer as one
    # shape, so no bank or outline lies between them (a lake with its own rim looked cut off from the river).
    d = np.linalg.norm(road[:, None, :] - line[None, ::8, :], axis=2); ri = int(np.argmin(d.min(1))); bridge = d.min() < gap * 0.05 and 0 < road[ri][0] < w
    on = [i for i, (x, y) in enumerate(line) if 0 <= x < w and rmask[int(y), int(x)]]
    lx = road[ri][0] + gap * 0.95 if bridge else line[on[0]][0] + gap * 0.12; ly = line[int(np.argmin(np.abs(xs - lx)))][1]
    ang = np.linspace(0, 2 * np.pi, 60, endpoint=False); rr = 1 + 0.16 * np.sin(ang * 3 + 1) + 0.09 * np.sin(ang * 5)
    shape = lambda grow: np.stack([lx + np.cos(ang) * (rr * gap * 0.36 + grow), ly + np.sin(ang) * (rr * gap * 0.25 + grow)], 1).astype(np.int32)
    run = [(x, y, r) for (x, y), r in zip(line, wd) if x <= lx]; layer = img.copy(); water = np.zeros((h, w), np.uint8)
    for col, grow in (((168, 214, 226), 7), ((128, 112, 30), 2.5), ((214, 184, 62), 0)):   # sandy bank, ink outline, water (BGR)
        for x, y, r in run: cv2.circle(layer, (int(x), int(y)), int(r + grow), col, -1, cv2.LINE_AA)
        cv2.fillPoly(layer, [shape(grow)], col, cv2.LINE_AA)
    for x, y, r in run: cv2.circle(layer, (int(x), int(y - r * 0.35)), max(1, int(r * 0.45)), (228, 208, 110), -1, cv2.LINE_AA); cv2.circle(water, (int(x), int(y)), int(r + 9), 255, -1)
    hi = np.zeros((h, w), np.uint8); cv2.fillPoly(hi, [shape(-gap * 0.05)], 255); cv2.fillPoly(hi, [shape(-gap * 0.05) + np.array([0, int(gap * 0.05)])], 0)
    layer[hi > 0] = (228, 208, 110)   # the lighter side, on river and lake alike
    cv2.fillPoly(water, [shape(9)], 255); water[near < gap * 0.1] = 0; rmask = water
    m = cv2.GaussianBlur(rmask, (0, 0), 1.2).astype(np.float32)[..., None] / 255
    img = (layer * m + img * (1 - m)).astype(np.uint8)
    # the bridge: where the trail crosses the river, planks along the trail with a rail on each side (the app's road and tiles lie on top)
    if bridge:
        c = road[ri]; t = road[min(ri + 6, len(road) - 1)] - road[max(ri - 6, 0)]; t /= np.linalg.norm(t); n = np.array([-t[1], t[0]])
        L, B = gap * 0.17, gap * 0.085; quad = lambda l, b0, b1: np.array([c - t * l + n * b0, c + t * l + n * b0, c + t * l + n * b1, c - t * l + n * b1], np.int32)
        cv2.fillPoly(img, [quad(L, -B, B)], (96, 140, 186), cv2.LINE_AA); cv2.polylines(img, [quad(L, -B, B)], True, (40, 62, 92), 2, cv2.LINE_AA)
        for u in np.linspace(-L, L, 9)[1:-1]: cv2.line(img, tuple((c + t * u - n * B).astype(int)), tuple((c + t * u + n * B).astype(int)), (60, 96, 138), 1, cv2.LINE_AA)
        for sgn in (-1, 1):
            cv2.fillPoly(img, [quad(L, sgn * B, sgn * B * 1.3)], (58, 92, 140), cv2.LINE_AA); cv2.polylines(img, [quad(L, sgn * B, sgn * B * 1.3)], True, (40, 62, 92), 1, cv2.LINE_AA)
    # the objects
    hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV).astype(np.float32)
    wet = cv2.distanceTransform(np.where(rmask > 0, 0, 255).astype(np.uint8), cv2.DIST_L2, 5)   # distance to river and lake
    stations = [(s["x"] * k, s["y"] * k + j["station"] * k * 0.35) for s in j["stations"]]; put = []
    for zone, items in PLACE.items():
        zm = cv2.imread(str(OUT/f"mask_{fmt}_{zone}.png"), 0) > 0; zm &= rmask == 0; zm &= ~(back & (zone == "shore")); ys_, xs_ = np.nonzero(zm)
        for name, count, share in items:
            size = share * gap * SCALE.get(fmt, {}).get(name, 1); done = 0; fixed = FIXED.get(fmt, {}).get(name)
            if fixed is not None:
                put += [(float(x), float(y), size, PROP[name][0], False) for x, y in fixed]; print(fmt, zone, name, "fixed"); continue
            for _ in range(3000):
                if done == count or not len(xs_): break
                i = rs.randint(len(xs_)); x, y = float(xs_[i]), float(ys_[i]); foot = y + size * 0.3
                if any(x0 - size * 0.4 < x < x1 + size * 0.4 and y0 - size * 0.5 < y < y1 + size * 0.3 for x0, y0, x1, y1 in AVOID.get(fmt, [])): continue
                if not (size * 0.5 < x < w - size * 0.5 and size * 0.6 < y < CROP[fmt] - size * 0.6): continue
                if near[int(y), int(x)] < size * 0.5 + gap * 0.07 or near[int(min(foot, h - 1)), int(x)] < size * 0.3 + gap * 0.07: continue
                if any(np.hypot(x - a, y - b) < j["station"] * k * 0.75 + size * 0.5 for a, b in stations): continue
                if any(np.hypot(x - a, y - b) < (size + s) * 0.52 for a, b, s, *_ in put): continue
                r = int(size * 0.4); hh, ss, vv = hsv[max(0, int(y) - r):int(y) + r, max(0, int(x) - r):int(x) + r].reshape(-1, 3).mean(0)   # the painting must show this zone's ground here
                if not GROUND[zone](hh, ss, vv): continue
                box = hsv[max(0, int(y) - r):int(y + size * 0.55), max(0, int(x) - r):int(x) + r].reshape(-1, 3)   # down to the foot: no water under it, and no tree tops under a house
                if ((box[:, 0] > 85) & (box[:, 0] < 112) & (box[:, 1] > 80)).mean() > 0.03 or (zone in ("meadow", "hills") and ((box[:, 2] < 135) | (box[:, 0] > 55)).mean() > 0.06): continue
                if wet[int(y), int(x)] < size * 0.55: continue
                var = PROP[name][rs.randint(len(PROP[name]))]; f = TALL.get(var, 1) * (rs.uniform(0.88, 1.12) if name == "palm" else 1)
                put.append((x, y + size * (1 - f) / 2, size * f, var, name == "palm" and rs.rand() < 0.5)); done += 1
            print(fmt, zone, name, done, "of", count)
    for x, y, size, var, flip in sorted(put, key=lambda p: p[1] + p[2] / 2): paste(img, SPR[var][:, ::-1] if flip else SPR[var], x, y, size)
    out = img[:CROP[fmt]]; WEB.mkdir(parents=True, exist_ok=True)
    cv2.imwrite(str(WEB/f"{fmt}.webp"), out, [cv2.IMWRITE_WEBP_QUALITY, 86]); cv2.imwrite(str(OUT/f"final_{fmt}.png"), out); print(fmt, out.shape)
