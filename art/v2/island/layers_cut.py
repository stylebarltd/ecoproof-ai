#!/usr/bin/env python3
"""island_main.png (sky removed) and island_fg.png (bottom 15%, feathered top). Run with the WebUI venv python (numpy, scipy)."""
import numpy as np, pathlib
from PIL import Image, ImageDraw
from scipy.ndimage import median_filter
import sys
OUT = pathlib.Path(__file__).parent/(sys.argv[1] if len(sys.argv) > 1 else "pick")
HOTEL_ON_MESA = "--mesa-hotel" in sys.argv
src = Image.open(OUT/"hero_island.png").convert("RGB"); W,H = src.size
a = np.asarray(src).astype(np.float32)/255
r,g,b = a[...,0],a[...,1],a[...,2]; mx,mn = a.max(-1),a.min(-1); L=(mx+mn)/2
S = np.where(mx==mn,0,(mx-mn)/(1-np.abs(2*L-1)+1e-6)); d = mx-mn+1e-6
hue = np.where(mx==r,((g-b)/d)%6,np.where(mx==g,(b-r)/d+2,(r-g)/d+4))*60
# dark, or green/yellow-green, or the hazy pale-teal distant hills; the pale yellow sun glow (L >= 0.85) is sky, never land
land = (L < 0.55) | ((hue > 45) & (hue < 170) & (S > 0.25) & (L < 0.80)) | ((hue > 120) & (hue < 200) & (L < 0.78))
# rough sky-line from the hand-drawn polygons (same as layers_sky.py, undilated)
rough = Image.new("L", (W,H), 0); dr = ImageDraw.Draw(rough)
dr.rectangle([0,290,W,H], fill=255)
dr.polygon([(400,300),(470,215),(560,200),(620,125),(700,170),(760,180),(830,220),(930,260),(940,300)], fill=255)
dr.polygon([(1250,300),(1300,250),(1370,250),(1380,90),(1700,90),(1700,250),(1760,300)] if HOTEL_ON_MESA else [(1250,300),(1290,240),(1330,214),(1700,214),(1760,300)], fill=255)
rough = np.asarray(rough) > 128
rough_top = np.argmax(rough, axis=0)
horizon = rough_top.copy()
for x in range(W):
    lo, hi = max(0, rough_top[x]-14), H
    col = land[lo:hi, x]; runs = np.convolve(col.astype(int), np.ones(12,int), "full")[11:] >= 12
    if runs.any(): horizon[x] = lo + int(np.argmax(runs)) - 1
horizon = median_filter(horizon, size=7)
# forced land: the hotel's pale thatched roof passes as sky, so hard-code its outline
force = Image.new("L", (W,H), 0)
if HOTEL_ON_MESA: ImageDraw.Draw(force).polygon([(1376,152),(1442,112),(1530,84),(1622,112),(1696,152),(1700,300),(1372,300)], fill=255)
force = np.asarray(force) > 128
ftop = np.where(force.any(axis=0), np.argmax(force, axis=0), H)
horizon = np.minimum(horizon, ftop)
ys = np.arange(H)[:,None]
alpha = np.clip((ys - horizon[None,:] + 2)/3, 0, 1)
main = np.dstack([a*255, alpha*255]).astype(np.uint8); Image.fromarray(main, "RGBA").save(OUT/"island_main.png")
fg_alpha = np.clip((ys - 870)/60, 0, 1).repeat(W,1)
fg = np.dstack([a*255, fg_alpha*255]).astype(np.uint8); Image.fromarray(fg, "RGBA").save(OUT/"island_fg.png")
chk = Image.new("RGB",(W,H),(255,0,255)); m = Image.fromarray(main,"RGBA"); chk.paste(m,(0,0),m); chk.resize((1024,512)).save(OUT/"_chk_main.png")
print("horizon min/max", horizon.min(), horizon.max())
