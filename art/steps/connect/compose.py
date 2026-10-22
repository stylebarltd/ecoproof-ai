#!/usr/bin/env python3
"""Composite the real assets onto the rendered counter scene: the WordPress plugins page replica onto the POS screen, the QR card onto the blank
card. Corners were read off labelled zoom crops. Everything is warped at 2x and downsampled at the end so the overlays stay crisp.
Run with the WebUI venv python (numpy)."""
import numpy as np, pathlib, json
from PIL import Image
D = pathlib.Path(__file__).parent
SS = 2
scene = Image.open(D/"r1_106.png").convert("RGB"); W,H = scene.size
big = scene.resize((W*SS,H*SS), Image.LANCZOS)
SCREEN = [(180,524),(524,500),(538,757),(205,788)]   # inner glass, read off _zoom_screen.png
CARD = [(591,853),(750,835),(828,902),(670,932)]     # top face of the card stack, read off _zoom_card.png
def coeffs(src, dst):
    A = []
    for (x,y),(u,v) in zip(dst, src): A += [[x,y,1,0,0,0,-u*x,-u*y],[0,0,0,x,y,1,-v*x,-v*y]]
    return np.linalg.solve(np.array(A, np.float64), np.array(src, np.float64).reshape(8)).tolist()
def place(overlay, corners, inset=0):
    """Warp overlay into the quad (TL,TR,BR,BL in scene px, shrunk by inset px) on the 2x canvas; returns an RGBA layer."""
    cx = sum(p[0] for p in corners)/4; cy = sum(p[1] for p in corners)/4
    c = [((x+(cx-x)*inset/abs(cx-x) if x!=cx else x)*SS, (y+(cy-y)*inset/abs(cy-y) if y!=cy else y)*SS) for x,y in corners]
    w,h = overlay.size; ov = overlay.convert("RGBA"); ov.putalpha(255)
    return ov.transform((W*SS,H*SS), Image.PERSPECTIVE, coeffs([(0,0),(w,0),(w,h),(0,h)], c), Image.BICUBIC)
out = np.asarray(big, np.float32)
lum = np.asarray(big.convert("L"), np.float32)/255
# screen: the page fills the glass edge to edge; a touch of the panel's own light lifts the blacks like a real backlit display
l = np.asarray(place(Image.open(D/"wp_plugins_fit.png").convert("RGB"), SCREEN), np.float32); a = l[...,3:4]/255
out = out*(1-a) + (l[...,:3]*0.92 + 255*0.08*lum[...,None])*a
# card: the artwork keeps the photo's shading (multiplied by the card's normalised brightness)
lay = place(Image.open(D/"card.png").convert("RGB"), CARD, inset=1); l = np.asarray(lay, np.float32); a = l[...,3:4]/255
shade = (lum*255/np.percentile((lum*255)[l[...,3]>0], 95)).clip(0,1)[...,None]
out = out*(1-a) + l[...,:3]*(0.35+0.65*shade)*a
big = Image.fromarray(out.clip(0,255).astype(np.uint8))
big.resize((W,H), Image.LANCZOS).save(D/"connect_composite.png")
# the step image: a tighter square around the screen and the card, 800x800 like the other steps
crop = big.crop((120*SS,264*SS,880*SS,1024*SS)).resize((800,800), Image.LANCZOS); crop.save(D/"connect.png")
crop.save(D.parents[2]/"public"/"landing"/"steps"/"connect.webp", quality=88, method=6)
json.dump({"scene":"r1_106.png","screen":SCREEN,"card":CARD,"screen_page":"wp_plugins_fit.png","card_art":"card.png"}, open(D/"composite.json","w"), indent=1)
