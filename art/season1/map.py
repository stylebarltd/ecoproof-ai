#!/usr/bin/env python3
"""Season 1, Four Corners: the Warden's map. Painting a map into the hand (fix.py) gave maps with no hand, so the map is drawn:
an open folded sheet laid over a Warden render behind its raised hand, and the hand put back on top. fix.py with DENOISE=0.68 then
closes the hand around the paper's edge. Usage (WebUI venv python): map.py <render.png> <hand x0,y0,x1,y1> → four_corners_bee_map.png"""
import sys, pathlib, random
import numpy as np, cv2
from PIL import Image, ImageDraw, ImageFilter
D = pathlib.Path(__file__).parent
src = Image.open(D/sys.argv[1]).convert("RGB"); x0, y0, x1, y1 = [int(v) for v in sys.argv[2].split(",")]
SAT = 130   # the hand is a stronger yellow than the wing behind it
a = np.asarray(src); hsv = cv2.cvtColor(a, cv2.COLOR_RGB2HSV)
hand = (((hsv[..., 1] > SAT) & (hsv[..., 0] > 12) & (hsv[..., 0] < 40)) | (hsv[..., 2] < 70)).astype(np.uint8)   # felt yellow or ink, not wing cream or sky
box = np.zeros_like(hand); box[y0:y1, x0:x1] = 1; hand &= box
hand = cv2.morphologyEx(hand, cv2.MORPH_CLOSE, np.ones((15, 15), np.uint8))
hand = cv2.morphologyEx(hand, cv2.MORPH_OPEN, np.ones((21, 21), np.uint8))   # drop the thin wing outline caught with it
n, lab, st, _ = cv2.connectedComponentsWithStats(hand, 4); hand = (lab == 1 + np.argmax(st[1:, cv2.CC_STAT_AREA])).astype(np.uint8)
cnt, _ = cv2.findContours(hand, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE); cv2.drawContours(hand, cnt, -1, 1, -1)
INK, PAPER, SHADE = (58, 40, 28, 255), (247, 236, 208, 255), (236, 221, 188, 255); rnd = random.Random(11)
W, H = 330, 400; m = Image.new("RGBA", (W + 40, H + 40), (0, 0, 0, 0)); d = ImageDraw.Draw(m); ox = oy = 20
d.polygon([(ox, oy + 14), (ox + W//2, oy), (ox + W//2, oy + H - 12), (ox, oy + H)], fill=SHADE, outline=INK)          # left leaf, folded back a little
d.polygon([(ox + W//2, oy), (ox + W, oy + 16), (ox + W, oy + H), (ox + W//2, oy + H - 12)], fill=PAPER, outline=INK)
d.line([(ox, oy + 14), (ox + W//2, oy), (ox + W, oy + 16), (ox + W, oy + H), (ox + W//2, oy + H - 12), (ox, oy + H), (ox, oy + 14)], fill=INK, width=5, joint="curve")
d.line([(ox + W//2, oy), (ox + W//2, oy + H - 12)], fill=(150, 120, 88, 255), width=3)
d.line([(ox + 30, oy + 250), (ox + 90, oy + 205), (ox + 150, oy + 235), (ox + 215, oy + 180), (ox + 300, oy + 215)], fill=(120, 170, 200, 255), width=9, joint="curve")   # river
route = [(ox + 40, oy + 345), (ox + 85, oy + 300), (ox + 75, oy + 150), (ox + 140, oy + 95), (ox + 205, oy + 120), (ox + 235, oy + 275), (ox + 290, oy + 330)]
for (ax, ay), (bx, by) in zip(route, route[1:]):                                                                          # dotted footpath
    k = max(2, int(((bx - ax)**2 + (by - ay)**2)**0.5/16))
    for i in range(k): t = i/k; d.line([(ax + (bx - ax)*t, ay + (by - ay)*t), (ax + (bx - ax)*(t + 0.5/k), ay + (by - ay)*(t + 0.5/k))], fill=(176, 84, 44, 255), width=4)
for (px, py) in route[1:-1] + [route[-1]]:                                                                                 # the places: small house marks
    d.polygon([(px - 9, py), (px, py - 11), (px + 9, py)], fill=(176, 84, 44, 255)); d.rectangle((px - 7, py, px + 7, py + 9), fill=INK)
for (px, py) in [(250, 70), (285, 95), (45, 90), (120, 330), (160, 345)]:                                                 # hills
    d.line([(ox + px - 12, oy + py + 9), (ox + px, oy + py - 9), (ox + px + 12, oy + py + 9)], fill=(120, 140, 90, 255), width=3, joint="curve")
m = m.rotate(7, resample=Image.BICUBIC, expand=True)
out = src.convert("RGBA"); out.alpha_composite(m, (12, y0 - 345))   # the sheet's bottom edge runs through the hand
out.paste(src, (0, 0), Image.fromarray(hand*255).filter(ImageFilter.GaussianBlur(0.8)))
out.convert("RGB").save(D/"four_corners_bee_map.png"); print("four_corners_bee_map.png")
