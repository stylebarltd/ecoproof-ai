#!/usr/bin/env python3
"""Season 1, River Crossing: the Guardian's walking pole. Painting a pole into the hand (fix.py) failed six times, so it is drawn:
a rough wooden pole laid over a Guardian render with a raised fist, and the fist put back on top, so it grips the pole.
Usage (WebUI venv python): pole.py <render.png> <fist x0,y0,x1,y1> <pole x at top,x at bottom> → river_crossing_bee_pole.png"""
import sys, pathlib, random
import numpy as np, cv2
from PIL import Image, ImageDraw, ImageFilter
D = pathlib.Path(__file__).parent
src = Image.open(D/sys.argv[1]).convert("RGB"); x0, y0, x1, y1 = [int(v) for v in sys.argv[2].split(",")]; xt, xb = [int(v) for v in sys.argv[3].split(",")]
a = np.asarray(src); hsv = cv2.cvtColor(a, cv2.COLOR_RGB2HSV)
fist = (((hsv[..., 1] > 95) & (hsv[..., 0] > 12) & (hsv[..., 0] < 40)) | (hsv[..., 2] < 70)).astype(np.uint8)   # felt yellow or ink, not wing cream or sky
box = np.zeros_like(fist); cv2.ellipse(box, ((x0 + x1)//2, (y0 + y1)//2), ((x1 - x0)//2, (y1 - y0)//2), 0, 0, 360, 1, -1); fist &= box
fist = cv2.morphologyEx(fist, cv2.MORPH_CLOSE, np.ones((15, 15), np.uint8))
n, lab, st, _ = cv2.connectedComponentsWithStats(fist, 4); fist = (lab == 1 + np.argmax(st[1:, cv2.CC_STAT_AREA])).astype(np.uint8)
cnt, _ = cv2.findContours(fist, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE); cv2.drawContours(fist, cnt, -1, 1, -1)
W = 26; top, bot = 70, 1040; rnd = random.Random(4)
pole = Image.new("RGBA", src.size, (0, 0, 0, 0)); d = ImageDraw.Draw(pole)
L = [(xt + (xb - xt)*(y - top)/(bot - top) + rnd.uniform(-2.5, 2.5), y) for y in range(top, bot, 40)]
d.line(L, fill=(58, 40, 28, 255), width=2*W + 8, joint="curve"); d.ellipse((L[0][0] - W - 4, top - W - 4, L[0][0] + W + 4, top + W + 4), fill=(58, 40, 28, 255))
d.line(L, fill=(150, 104, 62, 255), width=2*W, joint="curve"); d.ellipse((L[0][0] - W, top - W, L[0][0] + W, top + W), fill=(150, 104, 62, 255))
d.line([(x + 9, y) for x, y in L], fill=(176, 128, 80, 255), width=12, joint="curve")                       # lighter side
for _ in range(26):                                                                                          # grain strokes
    y = rnd.uniform(top, bot - 60); x = xt + (xb - xt)*(y - top)/(bot - top) + rnd.uniform(-W + 6, W - 8); h = rnd.uniform(25, 70)
    d.line([(x, y), (x + rnd.uniform(-2, 2), y + h)], fill=(104, 70, 42, 255), width=2)
out = src.convert("RGBA"); out.alpha_composite(pole)
m = Image.fromarray(fist*255).filter(ImageFilter.GaussianBlur(0.8)); out.paste(src, (0, 0), m)
out.convert("RGB").save(D/"river_crossing_bee_pole.png"); print("river_crossing_bee_pole.png")
