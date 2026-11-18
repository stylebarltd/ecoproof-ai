#!/usr/bin/env python3
"""The A6 postcard on its wooden block, cut out with a transparent background, for the hero (Pola, 2026-11-18: keep the card stand,
but without a photo behind it; the hero is three pictures: the map, the stand, the phone). Cut from the hotel reception photo
(../postcard/reception2_436.png) with the app's own postcard printed on it, as in ../postcard/compose.py; outlines read off gridded
zooms by hand. Run with the WebUI venv python (numpy, cv2) → stand.png (300x510, RGBA)."""
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
# The block in the photo is far wider and deeper than the card and has a glossy top (Pola: "overdimensional", "too shiny", "thinner
# in depth"), so a slim holder is built from its wood instead: a little wider than the card, a narrow strip deep, lower, with a matt
# top. Its faces are rough sawn, untreated wood (wood.py: a plank for the top and the front, end grain for the side; Pola: natural, rougher, nature looking).
F, R, L = np.float32((500, 828)), np.float32((773, 793)), np.float32((303, 775))     # the photo block's front, right and left top corners
P = lambda a, b: F + a*(R - F) + b*(L - F)                                            # a along the card, b into the depth; the card stands at b = 0.57
A0, A1, B0, B1, TH = -0.04, 0.90, 0.44, 0.70, np.float32((0, 56))                     # the new holder: along the card, in depth, and its height
f, r, l, bk = P(A0, B0), P(A1, B0), P(A0, B1), P(A1, B1)
size = (W*SS, H*SS)
block = np.zeros((H*SS, W*SS, 3), np.float32); bm = np.zeros((H*SS, W*SS), np.uint8)
WOOD = {n: np.asarray(Image.open(D/f"wood_{n}.png").convert("RGB"), np.float32) for n in ("face", "end")}   # wood.py: rough sawn, untreated
def face(tex, box, dst_quad, gain=1.0):
    """Lay the part `box` (x0, y0, x1, y1) of a wood texture onto one face of the holder."""
    global block, bm
    x0, y0, x1, y1 = box; t = WOOD[tex][y0:y1, x0:x1]
    M2 = cv2.getPerspectiveTransform(np.float32([(0, 0), (x1-x0, 0), (x1-x0, y1-y0), (0, y1-y0)]), np.float32(dst_quad)*SS)
    w = cv2.warpPerspective(t, M2, size, flags=cv2.INTER_AREA); m = np.zeros((H*SS, W*SS), np.uint8); cv2.fillPoly(m, [np.int32(np.float32(dst_quad)*SS)], 255, cv2.LINE_AA)
    k = (m.astype(np.float32)/255)[..., None]; block = block*(1-k) + w*gain*k; bm = np.maximum(bm, m)
face("face", (60, 40, 1000, 230), [l, bk, r, f], 1.06)            # top: the plank's upper boards
face("end", (60, 120, 400, 420), [l, f, f + TH, l + TH], 0.72)    # the side: end grain, in shadow
face("face", (40, 280, 1000, 500), [f, r, r + TH, f + TH], 0.92)  # the front: the lower boards with their knots
cm = np.zeros((H*SS, W*SS), np.uint8); cv2.fillPoly(cm, [np.int32(np.float32(QUAD)*SS)], 255, cv2.LINE_AA)
ca = (cv2.GaussianBlur(cm, (0, 0), 0.8).astype(np.float32)/255)[..., None]
out = block*(1-ca) + big*ca
mask = np.maximum(cv2.GaussianBlur(bm, (0, 0), 0.8), cv2.GaussianBlur(cm, (0, 0), 0.8))
x0, y0, x1, y1 = 366*SS, 362*SS, 666*SS, 872*SS
rgba = np.dstack([out.clip(0, 255).astype(np.uint8), mask])[y0:y1, x0:x1]
im = Image.fromarray(rgba, "RGBA"); im = im.resize((im.width//2, im.height//2), Image.LANCZOS); im.save(D/"stand.png"); print("wrote stand.png", im.size)
