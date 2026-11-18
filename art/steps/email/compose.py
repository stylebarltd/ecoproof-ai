#!/usr/bin/env python3
"""The "order arrived" picture: the kitchen scene (gen.py parcel 525), cropped to the opened parcel, the tablet and the table in front
of them, with the parcel card leaning on the jar and the order email on the tablet. The parcel card is a business card (Pola,
2026-11-18: a green shop does not put a postcard in a parcel), so the scene's blank A6 card is cropped away and the small card is laid
in: bizcard.png is the app's own print (/place/demo-eco-shop/cards?batch=picture&token=<ADMIN_TOKEN> to PDF with headless Brave, then
pdftoppm -r 600 -x 472 -y 248 -W 2008 -H 1299), its QR swapped here for one to https://ecoproof.app (../../postcard/qr.png). The email is tablet.png (`php render.php client
full portrait`, screenshot at 750x1070, scale 2), laid on the glass with a little of the photo's reflection. Corners are read off
gridded zooms by hand. Run with the WebUI venv python (numpy, cv2) → out_home.png (800x800)."""
import numpy as np, cv2, pathlib
from PIL import Image
D = pathlib.Path(__file__).parent
SCENE = "parcel_525.png"
CROP = (380, 330, 644)                                        # x, y, side of the square that is kept
SCREEN = [(644, 461.7), (824.3, 456.7), (825.7, 721.7), (643.3, 712.3)]  # TL TR BR BL of the tablet's glass
CARD = [(867.8, 602), (990.2, 613.4), (985.4, 689), (863, 676)]  # TL TR BR BL of the card, leaning on the jar
SS = 2

# the card, with the web QR
card = Image.open(D/"bizcard.png").convert("RGB"); a = np.asarray(card).sum(2); cq = card.width/100
x0, x1 = round(9*cq), round(38*cq)                            # inside the QR's frame (Postcard.tsx: .bc-qr)
rows = np.nonzero((a[:, x0:x1] < 300).sum(1) > 20)[0]; run = max(np.split(rows, np.nonzero(np.diff(rows) > 12)[0]+1), key=len); y0, y1 = run[0], run[-1]+1
cols = np.nonzero((a[y0:y1, x0-10:x1+10] < 300).sum(0) > 0)[0]; xa, xb = x0-10+cols[0], x0-10+cols[-1]+1
card.paste(Image.open(D/"../../postcard/qr.png").convert("RGB").resize((xb-xa, y1-y0), Image.NEAREST), (xa, y0))
card = np.asarray(card, np.float32)

scene = cv2.cvtColor(cv2.imread(str(D/SCENE)), cv2.COLOR_BGR2RGB); H, W = scene.shape[:2]
big = cv2.resize(scene, (W*SS, H*SS), interpolation=cv2.INTER_LANCZOS4).astype(np.float32)
size = (W*SS, H*SS)

def warp(img, quad):
    h, w = img.shape[:2]
    M = cv2.getPerspectiveTransform(np.float32([(0, 0), (w, 0), (w, h), (0, h)]), np.float32(quad)*SS)
    rgb = cv2.warpPerspective(img, M, size, flags=cv2.INTER_AREA, borderValue=(255, 255, 255))
    a = cv2.warpPerspective(np.full((h, w), 255, np.float32), M, size, flags=cv2.INTER_LINEAR)[..., None]/255
    return rgb, a

rgb, a = warp(card, CARD)
shadow = cv2.GaussianBlur(np.roll(a[..., 0], (3*SS, -4*SS), (0, 1)), (0, 0), 4*SS)[..., None]  # a soft shadow behind the card
big = big*(1 - 0.45*shadow*(1-a))
big = big*(1-a) + rgb*np.array((0.90, 0.875, 0.83))*a          # white paper in this warm light
rgb, a = warp(np.asarray(Image.open(D/"tablet.png").convert("RGB"), np.float32), SCREEN)
big = big*(1-a) + (rgb*0.92 + big*0.25)*a                       # the dark glass adds only a faint reflection
x, y, n = (v*SS for v in CROP)
out = cv2.resize(big[y:y+n, x:x+n].clip(0, 255).astype(np.uint8), (800, 800), interpolation=cv2.INTER_AREA)
Image.fromarray(out).save(D/"out_home.png"); print("wrote out_home.png")
