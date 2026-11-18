#!/usr/bin/env python3
"""Put the order email (tablet.png: `php render.php client full`, screenshot at 1000x1000) on the blank tablet screen of the chosen
home scene. The screen's corners are read off a 2x zoom by hand (the stand hides part of its lower edge); only pixels that are
glass, not the brown wood of the stand, are replaced, so the stand in front stays in front. The screen glows, so the
picture is laid over it, not multiplied; a little of the photo's own reflection is kept. Run with the WebUI venv python (numpy, cv2)
→ out_home.png (800x800)."""
import numpy as np, cv2, pathlib
from PIL import Image
D = pathlib.Path(__file__).parent
SCENE = "sofa_513.png"
CORNERS = [(342.5, 346.5), (686, 349), (656, 682.5), (311, 675)]  # TL TR BR BL of the glass
SS = 2
scene = cv2.cvtColor(cv2.imread(str(D/SCENE)), cv2.COLOR_BGR2RGB); H, W = scene.shape[:2]
# screen = inside the glass and not wood: the glass is grey-white (red and blue alike), the stand in front of it is brown
q = np.zeros((H, W), np.uint8); cv2.fillPoly(q, [np.int32(np.round(CORNERS))], 255)
f = scene.astype(np.int32); wood = ((f[..., 0] - f[..., 2]) > 32).astype(np.uint8)*255
wood = cv2.morphologyEx(wood, cv2.MORPH_OPEN, np.ones((5, 5), np.uint8)); wood = cv2.dilate(wood, np.ones((3, 3), np.uint8))
m = q & ~wood
m = cv2.resize(m, (W*SS, H*SS), interpolation=cv2.INTER_LINEAR).astype(np.float32)/255
m = cv2.GaussianBlur(m, (0, 0), 1.2)[..., None]
shot = np.asarray(Image.open(D/"tablet.png").convert("RGB"), np.float32); sh, sw = shot.shape[:2]
big = cv2.resize(scene, (W*SS, H*SS), interpolation=cv2.INTER_LANCZOS4).astype(np.float32)
M = cv2.getPerspectiveTransform(np.float32([(0, 0), (sw, 0), (sw, sh), (0, sh)]), np.float32(CORNERS)*SS)
warped = cv2.warpPerspective(shot, M, (W*SS, H*SS), flags=cv2.INTER_AREA, borderValue=(255, 255, 255))
inside = cv2.warpPerspective(np.full((sh, sw), 255, np.float32), M, (W*SS, H*SS))[..., None]/255
a = m*inside
glow = warped*0.9 + big*0.1  # the photo's own soft reflection stays on the glass
out = big*(1-a) + glow*a
out = cv2.resize(out.clip(0, 255).astype(np.uint8), (800, 800), interpolation=cv2.INTER_AREA)
Image.fromarray(out).save(D/"out_home.png"); print("wrote out_home.png")
