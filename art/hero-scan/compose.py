#!/usr/bin/env python3
"""The hero's photo, "the scan moment" (Pola, 2026-11-18): the desk of an eco hotel in golden evening light, a plant and a terrace
behind it (gen.py hand2 1513, the phone on the desk taken away by clear.py 1603), with the hotel's A6 postcard on its wooden block on
the desk. The phone that scans it is not in the photo: the hero lays the app's own phone over it (components/landing/IslandHero.tsx).
The card and its block are cut out of the hotel reception photo (../postcard/reception2_436.png, with the app's own postcard printed
on it as in ../postcard/compose.py), warmed to this light and set on the desk. The scene is enlarged 2x first (A1111 extras,
R-ESRGAN 4x+). Outlines are read off gridded zooms by hand. Run with the WebUI venv python (numpy, cv2) → out_hero.png (2432x1664)."""
import base64, io, json, pathlib, urllib.request
import numpy as np, cv2
from PIL import Image
D = pathlib.Path(__file__).parent
QUAD = [(376, 369), (592, 372), (612, 765), (401, 796)]                                   # the blank card in the reception photo, TL TR BR BL
BLOCK = [(303, 775), (400, 760), (615, 760), (773, 793), (773, 900), (500, 974), (303, 864)]  # the wooden block's outline
FOOT, AT, SCALE = (500, 974), (520, 735), 0.62   # the block's front corner, where it stands in the room (1216 wide), and its size there
TINT = np.array((0.98, 0.88, 0.72))               # evening light on the cut-out
SS = 2

if not (D/"desk_1603_x2.png").exists():
    b = io.BytesIO(); Image.open(D/"desk_1603.png").save(b, "PNG")
    req = urllib.request.Request("http://127.0.0.1:7860/sdapi/v1/extra-single-image", headers={"Content-Type": "application/json"},
        data=json.dumps({"image": base64.b64encode(b.getvalue()).decode(), "upscaling_resize": 2, "upscaler_1": "R-ESRGAN 4x+"}).encode())
    Image.open(io.BytesIO(base64.b64decode(json.load(urllib.request.urlopen(req, timeout=900))["image"]))).convert("RGB").save(D/"desk_1603_x2.png")
room = np.asarray(Image.open(D/"desk_1603_x2.png"), np.float32)

src = cv2.cvtColor(cv2.imread(str(D/"../postcard/reception2_436.png")), cv2.COLOR_BGR2RGB); H, W = src.shape[:2]
big = cv2.resize(src, (W*SS, H*SS), interpolation=cv2.INTER_LANCZOS4).astype(np.float32)
card = np.asarray(Image.open(D/"../postcard/card_demo-hotel_web.png").convert("RGB"), np.float32); ch, cw = card.shape[:2]
M = cv2.getPerspectiveTransform(np.float32([(0, 0), (cw, 0), (cw, ch), (0, ch)]), np.float32(QUAD)*SS)
pr = cv2.warpPerspective(card, M, (W*SS, H*SS), flags=cv2.INTER_AREA, borderValue=(255, 255, 255))
a = cv2.warpPerspective(np.full((ch, cw), 255, np.float32), M, (W*SS, H*SS), flags=cv2.INTER_LINEAR)[..., None]/255
big = big*(1-a) + big*(pr/255)*a
mask = np.zeros((H*SS, W*SS), np.uint8)
cv2.fillPoly(mask, [np.int32(np.float32(QUAD)*SS)], 255, cv2.LINE_AA); cv2.fillPoly(mask, [np.int32(np.float32(BLOCK)*SS)], 255, cv2.LINE_AA)

# source pixel (at SS) → room pixel (at 2x): scale about the block's front corner
k = SCALE*2/SS
A = np.float32([[k, 0, AT[0]*2 - FOOT[0]*SS*k], [0, k, AT[1]*2 - FOOT[1]*SS*k]]); size = (room.shape[1], room.shape[0])
cut = cv2.warpAffine(big, A, size, flags=cv2.INTER_AREA); m = cv2.warpAffine(mask, A, size, flags=cv2.INTER_AREA).astype(np.float32)/255
m = cv2.GaussianBlur(m, (0, 0), 0.8)[..., None]
shadow = cv2.GaussianBlur(np.roll(m[..., 0], (18, -16), (0, 1)), (0, 0), 14)[..., None]    # the light comes from the window behind: the shadow falls to the front
room = room*(1 - 0.5*shadow*(1-m))
room = room*(1-m) + cut*TINT*m
Image.fromarray(room.clip(0, 255).astype(np.uint8)).save(D/"out_hero.png"); print("wrote out_hero.png")
