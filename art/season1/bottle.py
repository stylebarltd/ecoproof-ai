#!/usr/bin/env python3
"""Season 1, Clean Shore: the collected bottle. The net of bottles failed painted (fix.py) and drawn (props.py shore), so the idea is
simpler: the Vanguard holds up one bottle found on the beach. A glass bottle is drawn over a Vanguard render with a raised fist and
the fist put back on top (as pole.py); fix.py with DENOISE=0.68 then wraps the fingers around it.
Usage (WebUI venv python): bottle.py <render.png> <fist x0,y0,x1,y1> → clean_shore_bee_bottle.png"""
import sys, pathlib
import numpy as np, cv2
from PIL import Image, ImageDraw, ImageFilter
D = pathlib.Path(__file__).parent; INK = (58, 40, 28, 255); GLASS = (118, 172, 128, 255)
src = Image.open(D/sys.argv[1]).convert("RGB"); x0, y0, x1, y1 = [int(v) for v in sys.argv[2].split(",")]
a = np.asarray(src); hsv = cv2.cvtColor(a, cv2.COLOR_RGB2HSV)
fist = (((hsv[..., 1] > 110) & (hsv[..., 0] > 12) & (hsv[..., 0] < 40)) | (hsv[..., 2] < 70)).astype(np.uint8)
box = np.zeros_like(fist); cv2.ellipse(box, ((x0 + x1)//2, (y0 + y1)//2), ((x1 - x0)//2, (y1 - y0)//2), 0, 0, 360, 1, -1); fist &= box
fist = cv2.morphologyEx(fist, cv2.MORPH_CLOSE, np.ones((15, 15), np.uint8))
n, lab, st, _ = cv2.connectedComponentsWithStats(fist, 4); fist = (lab == 1 + np.argmax(st[1:, cv2.CC_STAT_AREA])).astype(np.uint8)
cnt, _ = cv2.findContours(fist, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE); cv2.drawContours(fist, cnt, -1, 1, -1)
W, H = 150, 470; B = Image.new("RGBA", (W + 40, H + 40), (0, 0, 0, 0)); d = ImageDraw.Draw(B); ox = oy = 20
d.rounded_rectangle((ox, oy + 170, ox + W, oy + H), 30, fill=GLASS, outline=INK, width=7)                                    # body
d.polygon([(ox + 14, oy + 190), (ox + 48, oy + 60), (ox + W - 48, oy + 60), (ox + W - 14, oy + 190)], fill=GLASS)            # shoulder and neck
d.line([(ox + 6, oy + 196), (ox + 48, oy + 60)], fill=INK, width=7); d.line([(ox + W - 6, oy + 196), (ox + W - 48, oy + 60)], fill=INK, width=7)
d.rounded_rectangle((ox + 40, oy + 22, ox + W - 40, oy + 66), 8, fill=(92, 140, 104, 255), outline=INK, width=6)             # lip
d.rounded_rectangle((ox + 50, oy, ox + W - 50, oy + 28), 6, fill=(196, 158, 108, 255), outline=INK, width=6)                 # cork
d.line([(ox + 30, oy + 215), (ox + 30, oy + H - 50)], fill=(226, 244, 226, 190), width=13)                                   # highlight
d.rectangle((ox + 4, oy + 255, ox + W - 4, oy + 350), fill=(244, 234, 208, 255), outline=INK, width=5)                       # a worn blank label
d.line([(ox + 24, oy + 285), (ox + W - 24, oy + 285)], fill=(150, 120, 88, 255), width=4); d.line([(ox + 24, oy + 315), (ox + W - 50, oy + 315)], fill=(150, 120, 88, 255), width=4)
B = B.rotate(9, resample=Image.BICUBIC, expand=True)
cx, bottom = (x0 + x1)//2 - 6, y1 + 22
out = src.convert("RGBA"); out.alpha_composite(B, (cx - B.width//2, bottom - B.height))
out.paste(src, (0, 0), Image.fromarray(fist*255).filter(ImageFilter.GaussianBlur(0.8)))
out.convert("RGB").save(D/"clean_shore_bee_bottle.png"); print("clean_shore_bee_bottle.png")
