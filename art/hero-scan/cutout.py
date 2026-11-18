#!/usr/bin/env python3
"""The A6 postcard on its wooden block, cut out with a transparent background, for the hero (Pola, 2026-11-18: keep the card stand,
but without a photo behind it; the hero is three pictures: the map, the stand, the phone). Cut from the hotel reception photo
(../postcard/reception2_436.png) with the app's own postcard printed on it, as in ../postcard/compose.py; outlines read off gridded
zooms by hand. Run with the WebUI venv python (numpy, cv2) → stand.png (470x606, RGBA)."""
import pathlib
import numpy as np, cv2
from PIL import Image
D = pathlib.Path(__file__).parent
QUAD = [(376, 369), (592, 372), (612, 765), (401, 796)]                                   # the blank card, TL TR BR BL
BLOCK = [(303, 775), (400, 760), (615, 760), (773, 793), (773, 900), (500, 974), (303, 864)]  # the wooden block's outline
SS = 2
src = cv2.cvtColor(cv2.imread(str(D/"../postcard/reception2_436.png")), cv2.COLOR_BGR2RGB); H, W = src.shape[:2]
big = cv2.resize(src, (W*SS, H*SS), interpolation=cv2.INTER_LANCZOS4).astype(np.float32)
card = np.asarray(Image.open(D/"../postcard/card_demo-hotel_web.png").convert("RGB"), np.float32); ch, cw = card.shape[:2]
M = cv2.getPerspectiveTransform(np.float32([(0, 0), (cw, 0), (cw, ch), (0, ch)]), np.float32(QUAD)*SS)
pr = cv2.warpPerspective(card, M, (W*SS, H*SS), flags=cv2.INTER_AREA, borderValue=(255, 255, 255))
a = cv2.warpPerspective(np.full((ch, cw), 255, np.float32), M, (W*SS, H*SS), flags=cv2.INTER_LINEAR)[..., None]/255
big = big*(1-a) + big*(pr/255)*a
mask = np.zeros((H*SS, W*SS), np.uint8)
cv2.fillPoly(mask, [np.int32(np.float32(QUAD)*SS)], 255, cv2.LINE_AA); cv2.fillPoly(mask, [np.int32(np.float32(BLOCK)*SS)], 255, cv2.LINE_AA)
mask = cv2.GaussianBlur(cv2.erode(mask, np.ones((3, 3), np.uint8)), (0, 0), 0.8)
x0, y0, x1, y1 = 300*SS, 366*SS, 776*SS, 978*SS
rgba = np.dstack([big.clip(0, 255).astype(np.uint8), mask])[y0:y1, x0:x1]
im = Image.fromarray(rgba, "RGBA"); im = im.resize((im.width//2, im.height//2), Image.LANCZOS); im.save(D/"stand.png"); print("wrote stand.png", im.size)
