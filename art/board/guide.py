#!/usr/bin/env python3
"""Round 4: the zones are the map. Paints a rough colour guide of the whole land from the app's own trail layout (layout.json, written by
`npx tsx` from lib/journeyMap.ts: see the note in CLAUDE.md), so the painted map and the SVG trail on top of it agree.
Every piece of land belongs to the rank area whose part of the trail is nearest (summit, meadow and forest get extra weight, they are short).
Usage: guide.py → guide_land.png, guide_port.png (run with the WebUI venv's python: needs cv2 + numpy)."""
import json, pathlib, re
import numpy as np, cv2
OUT = pathlib.Path(__file__).parent
LAYOUT = json.load(open(OUT/"layout.json"))
CANVAS = {"land": (1536, 864, 1.536), "port": (704, 1632, 2.2)}       # width, height, px per board unit
ROWS = {"land": (468, 282, 96), "port": (666, 568, 470, 372, 274, 176, 78)}  # the trail's passes (board units), bottom to top
RIVERS = {}
TERRAIN = ["meadow", "forest", "hills", "shore", "summit"]   # by rank area, as TERRAIN in lib/journeyMap.ts
WEIGHT = {"meadow": 1.35, "forest": 1.45, "shore": 1.0, "hills": 1.0, "summit": 1.9}
BGR = lambda h: (int(h[5:7], 16), int(h[3:5], 16), int(h[1:3], 16))
BASE = {"meadow": "#a9d46a", "forest": "#2f7d47", "shore": "#c9dc8c", "hills": "#8fb04f", "summit": "#8d8f98"}
SEA, SAND, PATH, RIVER = "#4fb3d9", "#f0e0b0", "#e2c48c", "#3fa0dc"

def pts(d, k): return np.array([[float(a) * k, float(b) * k] for a, b in re.findall(r"([-\d.]+) ([-\d.]+)", d)], np.float32)
def dist_to(line, w, h):
    m = np.full((h, w), 255, np.uint8); cv2.polylines(m, [line.astype(np.int32)], False, 0, 2)
    return cv2.distanceTransform(m, cv2.DIST_L2, 5)
def noise(w, h, cell, rs):
    small = rs.rand(h // cell + 2, w // cell + 2).astype(np.float32)
    return cv2.resize(small, (w, h), interpolation=cv2.INTER_CUBIC) - 0.5

def guide(fmt):
    w, h, k = CANVAS[fmt]; j = LAYOUT[fmt]; rs = np.random.RandomState(7)
    gap = abs(ROWS[fmt][0] - ROWS[fmt][1]) * k
    areas = [pts(a["d"], k) for a in j["areas"]]
    dists = np.stack([dist_to(a, w, h) / WEIGHT[t] for a, t in zip(areas, TERRAIN)])
    wob = noise(w, h, int(gap * 0.5), rs) * gap * 0.5
    label = np.argmin(dists + wob[None], 0)
    road = pts(j["road"], k); near = dist_to(road, w, h)
    edge = near + noise(w, h, int(gap * 0.6), rs) * gap * 0.35
    land, sand = edge < gap * 0.62, edge < gap * 0.72
    img = np.zeros((h, w, 3), np.uint8); img[:] = BGR(SEA); img[sand] = BGR(SAND)
    for i, t in enumerate(TERRAIN): img[land & (label == i)] = BGR(BASE[t])
    img[land & (label == 2) & (edge > gap * 0.42)] = BGR(SAND)   # the shore's beach: sand towards the sea
    inner = np.where(land & (label == 2), near, 0); ly, lx = np.unravel_index(np.argmax(inner), inner.shape); lr = int(inner[ly, lx])
    cv2.ellipse(img, (int(lx), int(ly)), (int(lr * 0.95), int(lr * 0.6)), 0, 0, 360, BGR(SAND), -1, cv2.LINE_AA)    # a lagoon where the trail leaves most room
    cv2.ellipse(img, (int(lx), int(ly)), (int(lr * 0.78), int(lr * 0.45)), 0, 0, 360, BGR("#5cc9d6"), -1, cv2.LINE_AA)
    lagoon = lambda x, y: ((x - lx) / (lr * 1.0)) ** 2 + ((y - ly) / (lr * 0.65)) ** 2 < 1
    for i, t in enumerate(TERRAIN):   # where zones.py may repaint a zone: its land, off the trail
        cv2.imwrite(str(OUT/f"mask_{fmt}_{t}.png"), (land & (label == i) & (near > gap * 0.085)).astype(np.uint8) * 255)
    free = lambda x, y, r: 0 <= x < w and 0 <= y < h and land[int(y), int(x)] and near[int(y), int(x)] > r
    zone = lambda x, y: TERRAIN[label[int(y), int(x)]]
    # river: in the gap under the top pass, from the summit end to the turn and out to sea, plus a small lake in the forest
    y0 = (ROWS[fmt][-1] + ROWS[fmt][-2]) / 2 * k
    xs = np.linspace(w * 0.80, -20, 40); river = np.stack([xs, y0 + np.sin(xs / (gap * 0.45)) * gap * 0.12], 1).astype(np.int32)
    # (the river itself is not painted into the guide any more: no painter kept it, it became a strip of foam; compose.py draws it)
    RIVERS[fmt] = river
    # scatter: what makes each zone read as itself
    step = int(gap * 0.17)
    for y in range(step, h - step, step):
        for x in range(step, w - step, step):
            px, py = x + rs.randint(-step // 2, step // 2), y + rs.randint(-step // 2, step // 2)
            if not (0 <= px < w and 0 <= py < h) or not land[py, px]: continue
            t = zone(px, py); r = rs.rand()
            if t == "forest" and free(px, py, gap * 0.11):
                rad = int(gap * (0.07 + 0.04 * r)); cv2.circle(img, (px, py + rad // 3), rad, BGR("#1f5a35"), -1, cv2.LINE_AA); cv2.circle(img, (px - rad // 4, py - rad // 4), int(rad * 0.75), BGR("#3f9a55"), -1, cv2.LINE_AA)
            elif t == "meadow" and r < 0.5 and free(px, py, gap * 0.08):
                cv2.circle(img, (px, py), max(2, int(gap * 0.018)), BGR(["#ffffff", "#ffd84a", "#ff9ec4"][rs.randint(3)]), -1, cv2.LINE_AA)
            elif t == "hills" and r < 0.55 and free(px, py, gap * 0.12):
                a, b = int(gap * 0.16), int(gap * 0.08); col = ["#c9b45a", "#6f9a3f", "#b7c96a", "#d8c06c"][rs.randint(4)]
                cv2.ellipse(img, (px, py), (a, b), rs.randint(-25, 25), 0, 360, BGR(col), -1, cv2.LINE_AA)
            elif t == "shore" and r < 0.3 and free(px, py, gap * 0.1) and not lagoon(px, py):
                rad = int(gap * 0.05); cv2.circle(img, (px, py), rad, BGR("#3f9a55"), -1, cv2.LINE_AA)
    # the mountains: big peaks with snow, biggest in the middle of the summit zone
    ys, xs_ = np.nonzero(land & (label == 4))
    if len(xs_):
        cx, cy = xs_.mean(), ys.mean(); peaks = []
        for _ in range(400):
            i = rs.randint(len(xs_)); px, py = int(xs_[i]), int(ys[i])
            size = gap * (0.42 - 0.22 * min(1, np.hypot(px - cx, py - cy) / (gap * 1.2)))
            if near[py, px] > size * 0.45 and all(np.hypot(px - a, py - b) > (size + s) * 0.42 for a, b, s in peaks): peaks.append((px, py, size))
        for px, py, s in sorted(peaks, key=lambda p: p[1]):
            s = int(s); top = (px, py - s); l, r_, m = (px - int(s * 0.8), py + s // 3), (px + int(s * 0.8), py + s // 3), (px + s // 8, py + s // 3)
            cv2.fillPoly(img, [np.array([top, l, m])], BGR("#a8abb5"), cv2.LINE_AA); cv2.fillPoly(img, [np.array([top, m, r_])], BGR("#5e6170"), cv2.LINE_AA)
            f = 0.42; sl = (int(px - s * 0.8 * f), int(py - s + s * 1.33 * f)); sr = (int(px + s * 0.8 * f), int(py - s + s * 1.33 * f)); sm = (px + s // 16, int(py - s + s * 1.33 * f * 0.8))
            cv2.fillPoly(img, [np.array([top, sl, sm, sr])], (255, 255, 255), cv2.LINE_AA)
    # the trail as a dirt path, so the painter keeps it free
    cv2.polylines(img, [road.astype(np.int32)], False, BGR(PATH), int(gap * 0.13), cv2.LINE_AA)
    img = cv2.GaussianBlur(img, (0, 0), 1.6)
    rm = np.zeros((h, w), np.uint8); cv2.polylines(rm, [RIVERS[fmt]], False, 255, int(gap * 0.34))   # the river's strip, for zones.py: off the trail, outside the mountains
    cv2.imwrite(str(OUT/f"mask_{fmt}_river.png"), np.where(land & (label != 4) & (near > gap * 0.085), rm, 0).astype(np.uint8))
    cv2.imwrite(str(OUT/f"guide_{fmt}.png"), img); print(f"guide_{fmt}.png")

for f in CANVAS: guide(f)
