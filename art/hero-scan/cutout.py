#!/usr/bin/env python3
"""The A6 postcard on its wooden block, cut out with a transparent background, for the hero (Pola, 2026-11-18: keep the card stand,
but without a photo behind it; the hero is three pictures: the map, the stand, the phone). Cut from the hotel reception photo
(../postcard/reception2_436.png) with the app's own postcard printed on it, as in ../postcard/compose.py; outlines read off gridded
zooms by hand. Run with the WebUI venv python (numpy, cv2) → stand.png (280x522, RGBA)."""
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
# The block in the photo is far wider than the card (Pola: "overdimensional"), so it is drawn at half its size about the middle of the
# card's foot, under the card. The plain photo is used for the block, the printed one for the card.
PIVOT, SHRINK = (506, 781), 0.5
plain = cv2.resize(src, (W*SS, H*SS), interpolation=cv2.INTER_LANCZOS4).astype(np.float32)
bm = np.zeros((H*SS, W*SS), np.uint8); cv2.fillPoly(bm, [np.int32(np.float32(BLOCK)*SS)], 255, cv2.LINE_AA)
A = np.float32([[SHRINK, 0, PIVOT[0]*SS*(1-SHRINK)], [0, SHRINK, PIVOT[1]*SS*(1-SHRINK)]]); size = (W*SS, H*SS)
block = cv2.warpAffine(plain, A, size, flags=cv2.INTER_AREA); bm = cv2.warpAffine(bm, A, size, flags=cv2.INTER_AREA)
cm = np.zeros((H*SS, W*SS), np.uint8); cv2.fillPoly(cm, [np.int32(np.float32(QUAD)*SS)], 255, cv2.LINE_AA)
ca = (cv2.GaussianBlur(cm, (0, 0), 0.8).astype(np.float32)/255)[..., None]
out = block*(1-ca) + big*ca
mask = np.maximum(cv2.GaussianBlur(bm, (0, 0), 0.8), cv2.GaussianBlur(cm, (0, 0), 0.8))
x0, y0, x1, y1 = 368*SS, 362*SS, 648*SS, 884*SS
rgba = np.dstack([out.clip(0, 255).astype(np.uint8), mask])[y0:y1, x0:x1]
im = Image.fromarray(rgba, "RGBA"); im = im.resize((im.width//2, im.height//2), Image.LANCZOS); im.save(D/"stand.png"); print("wrote stand.png", im.size)
