#!/usr/bin/env python3
"""Composite the real assets onto the rendered counter scene: the WordPress plugins page onto the POS screen, the QR card onto the blank card.
Corners were read off labelled zoom crops (quad() is kept for a rough automatic guess). Run with the WebUI venv python (numpy)."""
import numpy as np, sys, pathlib, json
from PIL import Image, ImageFilter
D = pathlib.Path(__file__).parent
scene = Image.open(D/"r1_106.png").convert("RGB"); W,H = scene.size
def quad(box, thresh):
    """Corners (TL,TR,BR,BL) of the bright region inside box, from the extreme points of its mask."""
    x0,y0,x1,y1 = box; a = np.asarray(scene.crop(box).convert("L"), np.float32)
    m = a > thresh; ys,xs = np.nonzero(m); xs = xs + x0; ys = ys + y0
    s, d = xs+ys, xs-ys
    return [(int(xs[s.argmin()]),int(ys[s.argmin()])), (int(xs[d.argmax()]),int(ys[d.argmax()])), (int(xs[s.argmax()]),int(ys[s.argmax()])), (int(xs[d.argmin()]),int(ys[d.argmin()]))]
def coeffs(src, dst):
    A = []
    for (x,y),(u,v) in zip(dst, src): A += [[x,y,1,0,0,0,-u*x,-u*y],[0,0,0,x,y,1,-v*x,-v*y]]
    return np.linalg.solve(np.array(A, np.float64), np.array(src, np.float64).reshape(8)).tolist()
def place(overlay, corners, inset=0):
    """Warp overlay into the quad (corners TL,TR,BR,BL, shrunk by inset px) and return an RGBA layer the size of the scene."""
    cx = sum(p[0] for p in corners)/4; cy = sum(p[1] for p in corners)/4
    c = [(x+(cx-x)*inset/abs(cx-x) if x!=cx else x, y+(cy-y)*inset/abs(cy-y) if y!=cy else y) for x,y in corners]
    w,h = overlay.size; src = [(0,0),(w,0),(w,h),(0,h)]
    ov = overlay.convert("RGBA"); ov.putalpha(255)
    return ov.transform((W,H), Image.PERSPECTIVE, coeffs(src, c), Image.BICUBIC)
out = scene.copy()
# screen: 4:3 crop of the plugins page (sidebar, notice and the EcoProof row), shown slightly soft like the photo, with the screen's own glow kept
sq = [(178,523),(520,505),(543,760),(203,790)]   # inner glass, read off _zoom_screen.png
wp = Image.open(D/"wp_plugins_small.png").convert("RGB")   # 800x600 tablet-size render at 2x, 4:3 like the screen
lay = place(wp, sq, inset=3).filter(ImageFilter.GaussianBlur(0.7))
glow = np.asarray(scene.convert("L"), np.float32)/255
l = np.asarray(lay, np.float32); a = l[...,3:4]/255
mix = l[...,:3]*0.9 + 255*0.1*glow[...,None]            # lift blacks a little toward the panel's light
out = Image.fromarray((np.asarray(out,np.float32)*(1-a) + mix*a).clip(0,255).astype(np.uint8))
# card: keep the photo's shading by multiplying the artwork with the card's normalised brightness
cq = [(591,853),(750,835),(828,902),(670,932)]   # top face of the card stack, read off _zoom_card.png
card = Image.open(D/"card.png").convert("RGB")
lay = place(card, cq, inset=2).filter(ImageFilter.GaussianBlur(0.5))
l = np.asarray(lay, np.float32); a = l[...,3:4]/255
shade = np.asarray(scene.convert("L"), np.float32); shade = (shade/np.percentile(shade[np.asarray(lay)[...,3]>0], 95)).clip(0,1)[...,None]
mix = l[...,:3]*(0.35+0.65*shade)
out = Image.fromarray((np.asarray(out,np.float32)*(1-a) + mix*a).clip(0,255).astype(np.uint8))
out.save(D/"connect_composite.png")
# the step image: a tighter square around the screen and the card, 800x800 like the other steps
crop = out.crop((120,264,880,1024)).resize((800,800), Image.LANCZOS); crop.save(D/"connect.png")
crop.save(D.parents[2]/"public"/"landing"/"steps"/"connect.webp", quality=86, method=6)
json.dump({"scene":"r1_106.png","screen":sq,"card":cq}, open(D/"composite.json","w"), indent=1)
