#!/usr/bin/env python3
"""The "order arrived" picture: on the chosen kitchen scene (gen.py parcel 525: an opened kraft parcel, a blank card leaning on it, a
tablet on a stand) print the real A6 parcel card (../../postcard/card_demo-parcel_web.png, the app's own print of a parcel card with
its QR swapped for one to https://ecoproof.app) onto the card, and lay the order email (tablet.png: `php render.php client full
portrait`, screenshot at 750x1070, scale 2) on the tablet's screen. Corners are read off gridded zooms by hand. The card is paper, so
the print is multiplied onto it and keeps the photo's light; the screen glows, so the picture is laid over it with a little of the
photo's own reflection. Run with the WebUI venv python (numpy, cv2) → out_home.png (800x800)."""
import numpy as np, cv2, pathlib
from PIL import Image
D = pathlib.Path(__file__).parent
SCENE = "parcel_525.png"
CARD = [(99, 641), (298, 610), (354, 918), (153, 990)]        # TL TR BR BL of the leaning card
HOLE = (215, 651, 15, 15)                                      # the punched hole in it, filled in before printing
SCREEN = [(644, 461.7), (824.3, 456.7), (825.7, 721.7), (643.3, 712.3)]  # TL TR BR BL of the tablet's glass
SS = 2
scene = cv2.cvtColor(cv2.imread(str(D/SCENE)), cv2.COLOR_BGR2RGB); H, W = scene.shape[:2]
em = np.zeros((H, W), np.uint8); cv2.ellipse(em, HOLE[:2], HOLE[2:], 0, 0, 360, 255, -1)
scene = cv2.inpaint(scene, em, 9, cv2.INPAINT_TELEA)
big = cv2.resize(scene, (W*SS, H*SS), interpolation=cv2.INTER_LANCZOS4).astype(np.float32)
size = (W*SS, H*SS)

def warp(path, quad):
    img = np.asarray(Image.open(path).convert("RGB"), np.float32); h, w = img.shape[:2]
    M = cv2.getPerspectiveTransform(np.float32([(0, 0), (w, 0), (w, h), (0, h)]), np.float32(quad)*SS)
    rgb = cv2.warpPerspective(img, M, size, flags=cv2.INTER_AREA, borderValue=(255, 255, 255))
    a = cv2.warpPerspective(np.full((h, w), 255, np.float32), M, size, flags=cv2.INTER_LINEAR)[..., None]/255
    return rgb, a

rgb, a = warp(D/"../../postcard/card_demo-parcel_web.png", CARD)
big = big*(1-a) + big*(rgb/255)*a
rgb, a = warp(D/"tablet.png", SCREEN)
big = big*(1-a) + (rgb*0.92 + big*0.25)*a  # the dark glass adds only a faint reflection
out = cv2.resize(big.clip(0, 255).astype(np.uint8), (800, 800), interpolation=cv2.INTER_AREA)
Image.fromarray(out).save(D/"out_home.png"); print("wrote out_home.png")
