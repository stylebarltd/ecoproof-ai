#!/usr/bin/env python3
"""The "order arrived" picture: a kitchen table seen from above (gen.py inbox 905: an opened kraft parcel with a white sheet in
it, a tablet lying on a stand), with the parcel card in the opened parcel and the order email on the tablet. The parcel card is a
business card (Pola, 2026-11-18: a green shop does not put a postcard in a parcel; and the card belongs in the parcel): bizcard.png
is the app's own print (/place/demo-eco-shop/cards?batch=picture&token=<ADMIN_TOKEN> to PDF with headless Brave, then pdftoppm -r 600
-x 472 -y 248 -W 2008 -H 1299), its QR swapped here for one to https://ecoproof.app (../../postcard/qr.png). The scene's white sheet
is tinted to brown packing paper and the card is laid on it. The email is tablet-land.png (`php render.php client full | sed
's/width:1000px/width:1333px/g' > tablet-land.html`, screenshot at 1333x1000, scale 2), laid over the lit screen. Corners are read
off gridded zooms by hand. Run with the WebUI venv python (numpy, cv2) → out_home.png (800x800)."""
import numpy as np, cv2, pathlib
from PIL import Image
D = pathlib.Path(__file__).parent
SCENE = "inbox_905.png"
CROP = (0, 94, 930)                                           # x, y, side of the square that is kept
SCREEN = [(699, 526), (888, 632), (803, 762), (622, 637)]     # TL TR BR BL of the tablet's screen
SHEET = (85, 670, 340, 805)                                   # the box around the white sheet in the parcel
CARD = [(172, 692), (318, 718), (279, 783), (133, 755)]       # TL TR BR BL of the card on that sheet
SS = 2

# the card, with the web QR
card = Image.open(D/"bizcard.png").convert("RGB"); a = np.asarray(card).sum(2); cq = card.width/100
x0, x1 = round(9*cq), round(38*cq)                            # inside the QR's frame (Postcard.tsx: .bc-qr)
rows = np.nonzero((a[:, x0:x1] < 300).sum(1) > 20)[0]; run = max(np.split(rows, np.nonzero(np.diff(rows) > 12)[0]+1), key=len); y0, y1 = run[0], run[-1]+1
cols = np.nonzero((a[y0:y1, x0-10:x1+10] < 300).sum(0) > 0)[0]; xa, xb = x0-10+cols[0], x0-10+cols[-1]+1
card.paste(Image.open(D/"../../postcard/qr.png").convert("RGB").resize((xb-xa, y1-y0), Image.NEAREST), (xa, y0))
card = np.asarray(card, np.float32)

scene = cv2.cvtColor(cv2.imread(str(D/SCENE)), cv2.COLOR_BGR2RGB).astype(np.float32); H, W = scene.shape[:2]
x0, y0, x1, y1 = SHEET; part = scene[y0:y1, x0:x1]
white = cv2.GaussianBlur(((part.min(2) > 150) & (part.max(2) - part.min(2) < 45)).astype(np.float32), (0, 0), 1.2)[..., None]
scene[y0:y1, x0:x1] = part*(1 - white) + part*np.array((0.80, 0.66, 0.50))*white   # the white sheet becomes brown packing paper
scene = scene.clip(0, 255).astype(np.uint8)
big = cv2.resize(scene, (W*SS, H*SS), interpolation=cv2.INTER_LANCZOS4).astype(np.float32)
size = (W*SS, H*SS)

def warp(img, quad):
    h, w = img.shape[:2]
    M = cv2.getPerspectiveTransform(np.float32([(0, 0), (w, 0), (w, h), (0, h)]), np.float32(quad)*SS)
    rgb = cv2.warpPerspective(img, M, size, flags=cv2.INTER_AREA, borderValue=(255, 255, 255))
    a = cv2.warpPerspective(np.full((h, w), 255, np.float32), M, size, flags=cv2.INTER_LINEAR)[..., None]/255
    return rgb, a

rgb, a = warp(card, CARD)
shadow = cv2.GaussianBlur(np.roll(a[..., 0], (3*SS, 2*SS), (0, 1)), (0, 0), 3*SS)[..., None]  # a soft shadow under the card
big = big*(1 - 0.45*shadow*(1-a))
big = big*(1-a) + rgb*np.array((0.93, 0.93, 0.95))*a          # white paper in this warm light
rgb, a = warp(np.asarray(Image.open(D/"tablet-land.png").convert("RGB"), np.float32), SCREEN)
big = big*(1-a) + rgb*(0.55 + 0.45*big/big.max())*a             # the screen is lit white in the photo: keep its light and glare
x, y, n = (v*SS for v in CROP)
out = cv2.resize(big[y:y+n, x:x+n].clip(0, 255).astype(np.uint8), (800, 800), interpolation=cv2.INTER_AREA)
Image.fromarray(out).save(D/"out_home.png"); print("wrote out_home.png")
