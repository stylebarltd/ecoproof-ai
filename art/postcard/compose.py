#!/usr/bin/env python3
"""Print the real postcard (card_<place>_web.png: the app's own print of components/Postcard.tsx, its QR swapped for one to
https://ecoproof.app) onto the blank card of a generated scene. The blank card is found from a point on it (the connected bright,
colourless area around that point, reduced to its four corners), and the postcard is multiplied onto it, so the photo's own light and
shadow stay on the paper. Warped at 2x, downsampled at the end. Usage: compose.py <scene key>. Run with the WebUI venv python (numpy, cv2)
→ out_<key>.png (800x800)."""
import numpy as np, cv2, pathlib, sys
from PIL import Image
D = pathlib.Path(__file__).parent
SS = 2
SCENES = {
    # scene file, a point on the blank card, the postcard to print, and optionally corners by hand (TL TR BR BL)
    "cafe": {"scene": "cafe_403.png", "at": (242, 640), "card": "card_demo-cafe_web.png"},
    "restaurant": {"scene": "restaurant_403.png", "at": (232, 620), "card": "card_demo-restaurant_web.png"},
    "hotel": {"scene": "reception2_436.png", "at": (486, 580), "card": "card_demo-hotel_web.png"},
    "store": {"scene": "store_402.png", "at": (516, 520), "card": "card_demo-eco-shop_web.png"},
}

def corners(img, at, tol):
    """The four corners of the bright area around `at`: flood fill, then the quad that best covers its outline."""
    h, w = img.shape[:2]; mask = np.zeros((h+2, w+2), np.uint8)
    cv2.floodFill(img.copy(), mask, at, 0, (tol,)*3, (tol,)*3, 4 | cv2.FLOODFILL_MASK_ONLY | cv2.FLOODFILL_FIXED_RANGE | (255 << 8))
    m = cv2.morphologyEx(mask[1:-1, 1:-1], cv2.MORPH_OPEN, np.ones((5, 5), np.uint8))
    cs, _ = cv2.findContours(m, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE); c = max(cs, key=cv2.contourArea)
    hull = cv2.convexHull(c)
    for eps in np.linspace(0.01, 0.1, 30):
        q = cv2.approxPolyDP(hull, eps*cv2.arcLength(hull, True), True)
        if len(q) == 4: break
    q = q.reshape(-1, 2).astype(np.float32)
    s = q.sum(1); d = q[:, 0]-q[:, 1]
    return [tuple(q[s.argmin()]), tuple(q[d.argmax()]), tuple(q[s.argmax()]), tuple(q[d.argmin()])], m

key = sys.argv[1]; S = SCENES[key]
scene = cv2.cvtColor(cv2.imread(str(D/S["scene"])), cv2.COLOR_BGR2RGB); H, W = scene.shape[:2]
for (cx, cy, rx, ry) in S.get("erase", []):  # things painted on or over the card (a hook, a ring): filled in from their surroundings
    em = np.zeros((H, W), np.uint8); cv2.ellipse(em, (cx, cy), (rx, ry), 0, 0, 360, 255, -1)
    scene = cv2.inpaint(scene, em, 9, cv2.INPAINT_TELEA)
quad, m = (S["corners"], None) if "corners" in S else corners(scene, S["at"], S.get("tol", 26))
print(key, "corners", [(round(x), round(y)) for x, y in quad])
card = np.asarray(Image.open(D/S["card"]).convert("RGB"), np.float32); ch, cw = card.shape[:2]
big = cv2.resize(scene, (W*SS, H*SS), interpolation=cv2.INTER_LANCZOS4).astype(np.float32)
M = cv2.getPerspectiveTransform(np.float32([(0, 0), (cw, 0), (cw, ch), (0, ch)]), np.float32(quad)*SS)
warped = cv2.warpPerspective(card, M, (W*SS, H*SS), flags=cv2.INTER_AREA, borderValue=(255, 255, 255))
a = cv2.warpPerspective(np.full((ch, cw), 255, np.float32), M, (W*SS, H*SS), flags=cv2.INTER_LINEAR)[..., None]/255
out = big*(1-a) + big*(warped/255)*a
out = cv2.resize(out.clip(0, 255).astype(np.uint8), (800, 800), interpolation=cv2.INTER_AREA)
Image.fromarray(out).save(D/f"out_{key}.png"); print("wrote", f"out_{key}.png")
