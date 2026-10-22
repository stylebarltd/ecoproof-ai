#!/usr/bin/env python3
"""Composite the real assets onto a rendered counter scene (second round: seeds 105 and 103). Corners read off labelled zoom crops.
Warped at 2x, downsampled at the end. Usage: compose2.py <scene key>. Run with the WebUI venv python (numpy)."""
import numpy as np, pathlib, json, sys
from PIL import Image
D = pathlib.Path(__file__).parent
SS = 2
SCENES = {
    # the QR card alone on the counter stand
    "105": {"scene": "r1_105.png", "card": [(333,492),(677,546),(615,825),(292,715)], "card_art": "card.png", "screen": None, "crop": (0,0,1024,1024)},
    # the plugins page on the tablet POS, the QR card flat on the counter
    "103": {"scene": "r1_103.png", "screen": [(400,490),(592,492),(513,613),(333,593)], "card": [(550,797),(838,790),(832,873),(563,870)], "card_art": "card.png", "crop": (0,0,1024,1024)},
}
key = sys.argv[1]; S = SCENES[key]
scene = Image.open(D/S["scene"]).convert("RGB"); W,H = scene.size
big = scene.resize((W*SS,H*SS), Image.LANCZOS)
def coeffs(src, dst):
    A = []
    for (x,y),(u,v) in zip(dst, src): A += [[x,y,1,0,0,0,-u*x,-u*y],[0,0,0,x,y,1,-v*x,-v*y]]
    return np.linalg.solve(np.array(A, np.float64), np.array(src, np.float64).reshape(8)).tolist()
def place(overlay, corners):
    c = [(x*SS, y*SS) for x,y in corners]; w,h = overlay.size; ov = overlay.convert("RGBA"); ov.putalpha(255)
    return ov.transform((W*SS,H*SS), Image.PERSPECTIVE, coeffs([(0,0),(w,0),(w,h),(0,h)], c), Image.BICUBIC)
out = np.asarray(big, np.float32); lum = np.asarray(big.convert("L"), np.float32)/255
if S["screen"]:
    l = np.asarray(place(Image.open(D/"wp_plugins_fit.png").convert("RGB"), S["screen"]), np.float32); a = l[...,3:4]/255
    out = out*(1-a) + (l[...,:3]*0.94 + 255*0.06*lum[...,None])*a
l = np.asarray(place(Image.open(D/S["card_art"]).convert("RGB"), S["card"]), np.float32); a = l[...,3:4]/255
shade = (lum*255/np.percentile((lum*255)[l[...,3]>0], 95)).clip(0,1)[...,None]
out = out*(1-a) + l[...,:3]*(0.35+0.65*shade)*a
big = Image.fromarray(out.clip(0,255).astype(np.uint8))
x0,y0,x1,y1 = S["crop"]
big.crop((x0*SS,y0*SS,x1*SS,y1*SS)).resize((800,800), Image.LANCZOS).save(D/f"connect_{key}.png")
print("wrote", f"connect_{key}.png")
