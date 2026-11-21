#!/usr/bin/env python3
"""Cut a landmark (landmarks.py) out of its plain background and export it for the app: the background is everything the paper
colour reaches from the picture's edge (the ink outline stops it), the rest is kept, cropped square and saved at 320 px.
PICKS holds the chosen seed per terrain. Run with the WebUI venv python (numpy, cv2) → cut_<terrain>.png and
public/journey/<VER>/<terrain>.webp (a new VER whenever a deployed picture changes, and LANDMARKS in components/PassportMap.tsx with it)."""
import pathlib
import numpy as np, cv2
from PIL import Image
D = pathlib.Path(__file__).parent; VER = "v1"; PUB = D/"../../public/journey"/VER; PUB.mkdir(parents=True, exist_ok=True)
PICKS = {"meadow": 74002, "forest": 74002, "shore": 74002, "hills": 74002, "summit": 74002}
for key, seed in PICKS.items():
    im = cv2.cvtColor(cv2.imread(str(D/f"lm_{key}_{seed}.png")), cv2.COLOR_BGR2RGB); h, w = im.shape[:2]
    mask = np.zeros((h+2, w+2), np.uint8); soft = cv2.GaussianBlur(im, (0, 0), 1.2)
    for x, y in [(0, 0), (w-1, 0), (0, h-1), (w-1, h-1), (w//2, 0), (w//2, h-1), (0, h//2), (w-1, h//2)]:  # the paper has a soft gradient, so each step may differ a little from its neighbour
        cv2.floodFill(soft, mask, (x, y), 0, (3,)*3, (3,)*3, 4 | cv2.FLOODFILL_MASK_ONLY | (255 << 8))
    keep = 255 - mask[1:-1, 1:-1]
    n, lab, stats, _ = cv2.connectedComponentsWithStats(keep, 8); big = 1 + int(np.argmax(stats[1:, cv2.CC_STAT_AREA]))   # the landmark is the largest piece; specks of paper go
    keep = np.where(lab == big, 255, 0).astype(np.uint8)
    keep = cv2.GaussianBlur(cv2.erode(keep, np.ones((3, 3), np.uint8)), (0, 0), 0.9)
    ys, xs = np.nonzero(keep > 8); x0, x1, y0, y1 = xs.min(), xs.max()+1, ys.min(), ys.max()+1
    side = max(x1-x0, y1-y0) + 12; cx, cy = (x0+x1)//2, (y0+y1)//2
    rgba = np.dstack([im, keep]); canvas = np.zeros((side, side, 4), np.uint8)
    sx0, sy0 = cx - side//2, cy - side//2
    ax0, ay0, ax1, ay1 = max(sx0, 0), max(sy0, 0), min(sx0+side, w), min(sy0+side, h)
    canvas[ay0-sy0:ay1-sy0, ax0-sx0:ax1-sx0] = rgba[ay0:ay1, ax0:ax1]
    out = Image.fromarray(canvas, "RGBA").resize((320, 320), Image.LANCZOS)
    out.save(D/f"cut_{key}.png"); out.save(PUB/f"{key}.webp", "WEBP", quality=88, method=6); print(key, seed, "kept", round(100*(keep > 127).mean()), "%")
