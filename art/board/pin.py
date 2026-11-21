#!/usr/bin/env python3
"""The player's pin on the journey board: the full-body bee with both legs (art/v2/ranks/sentinel/sentinel_full.png, the original bee, called
Sentinel then; Pola, 2026-11-20: not the cut-off bust of the rank card). Its dusty blue paper is keyed out, as for the rank cards.
Usage: pin.py → public/journey/pin/<VER>/bee.webp (a new VER whenever a deployed picture changes) and prints its size for PassportMap.tsx."""
import pathlib, numpy as np, cv2
HERE = pathlib.Path(__file__).parent; ROOT = HERE.parent.parent; VER = "v1"
im = cv2.imread(str(ROOT/"art/v2/ranks/sentinel/sentinel_full.png")); h, w = im.shape[:2]
H, S, V = cv2.split(cv2.cvtColor(cv2.GaussianBlur(im, (0, 0), 1), cv2.COLOR_BGR2HSV))
blue = ((H > 98) & (H < 128) & (S > 45) & (V > 120)).astype(np.uint8)   # bright only: the black of eyes and stripes has a blue hue too
n, lab = cv2.connectedComponents(blue, connectivity=4)   # only the blue that reaches the picture's edge is paper
edge = set(np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))) - {0}
bg = np.isin(lab, list(edge)); holes = (blue > 0) & ~bg   # blue shut in between arm and body is paper too, if it is big enough
n2, lab2, st, _ = cv2.connectedComponentsWithStats(holes.astype(np.uint8), 4)
for i in range(1, n2):
    if st[i, cv2.CC_STAT_AREA] > 60: bg |= lab2 == i
keep = np.where(bg, 0, 255).astype(np.uint8); n3, lab3, st3, _ = cv2.connectedComponentsWithStats(keep, 8)
keep = np.where(lab3 == 1 + int(np.argmax(st3[1:, cv2.CC_STAT_AREA])), 255, 0).astype(np.uint8)
alpha = cv2.GaussianBlur(cv2.erode(keep, np.ones((3, 3), np.uint8)), (0, 0), 0.8)
ys, xs = np.nonzero(alpha > 8); out = np.dstack([im, alpha])[ys.min():ys.max() + 1, xs.min():xs.max() + 1]
f = 640 / out.shape[0]; out = cv2.resize(out, (round(out.shape[1] * f), 640), interpolation=cv2.INTER_AREA)
dst = ROOT/"public/journey/pin"/VER; dst.mkdir(parents=True, exist_ok=True)
cv2.imwrite(str(dst/"bee.webp"), out, [cv2.IMWRITE_WEBP_QUALITY, 90]); print(dst/"bee.webp", out.shape[1], "x", out.shape[0])
a = out[..., 3:] / 255.; cv2.imwrite(str(HERE/"_pin_check.png"), (out[..., :3] * a + np.array([120, 200, 160]) * (1 - a)).astype(np.uint8))
