#!/usr/bin/env python3
"""Composite the real assets onto the chosen door renders: the QR card into the hotel frame (211) and the restaurant wicker stand (202),
the SuperBee receipt and the EcoProof screen onto the eco store counter (203, with the hand repainted off the screen by inpaint_hand.py, seed 306). The painted cards carry fake script, so each card face is
repainted as clean paper from a lighting fit of its own pixels before the card is printed on it (multiply). Corners read off gridded zoom
crops. Usage: compose.py <hotel|restaurant|store>. Run with the WebUI venv python (numpy, cv2) → door_<name>.png (800x800)."""
import numpy as np, cv2, pathlib, sys
from PIL import Image
D = pathlib.Path(__file__).parent
CARD = Image.open(D/"../../steps/connect/card.png").convert("RGB")  # 1200x800, white
SS = 2  # warp at 2x, downsample at the end

def card_fit(ratio):
    """The QR card cropped or padded to width/height = ratio, white kept white."""
    w, h = CARD.size
    if ratio >= w/h:  # wider: crop height
        nh = round(w/ratio); y = (h-nh)//2; return CARD.crop((0, y, w, y+nh))
    nw = max(round(h*ratio), 1040)  # narrower: trim the side margins first, then pad height
    x = (w-nw)//2; c = CARD.crop((x, 0, x+nw, h)); nh = round(nw/ratio)
    out = Image.new("RGB", (nw, nh), "white"); out.paste(c, (0, (nh-h)//2)); return out

SCENES = {
    "hotel": {"scene": "hotel_211.png", "card": [(461,601),(597,607),(593,684),(457,677)], "ratio": 1.72},
    "restaurant": {"scene": "restaurant_202.png", "card": [(84,577),(299,561),(322,727),(101,761)], "ratio": 1.25},
    "store": {"scene": "store_203_hand_306.png",
              # visible part of the printed sheet (edges under the hand and phone are masked by colour)
              "sheet": [(0,760),(68,728),(362,585),(645,694),(540,752),(230,835),(80,836),(0,812)],
              "bag": [(560,395),(800,430),(790,520),(560,490)],
              "corner": [(775,935),(930,815),(1024,845),(1024,1024),(870,1024)],  # the small kraft card bottom right
              "receipt": [(362,565),(558,641),(348,781),(149,705)],
              "hands": [(0,700),(260,725),(420,735),(560,760),(560,1024),(0,1024)],  # where skin colour really is a hand (kraft paper reads as skin)
              "phone": [(440,716),(550,768),(322,886),(252,830)],  # the whole phone with its bezel, lies over the receipt
              "screen": [(433,722),(535,775),(338,888),(268,830)],  # TL TR BR BL: portrait, top at the far end; BR runs under the fingers
              "bezel": [(433,722),(535,775),(532,762),(404,712)]},  # the glass strip between the screen's top edge and the rim, painted as bezel
}

def quad_mask(shape, pts, s=1):
    m = np.zeros(shape[:2], np.uint8); cv2.fillPoly(m, [np.int32(np.round(np.array(pts)*s))], 255); return m

def warp(img, pts, size):
    w, h = img.size; src = np.float32([(0,0),(w,0),(w,h),(0,h)]); dst = np.float32(pts)*SS
    M = cv2.getPerspectiveTransform(src, dst)
    rgb = cv2.warpPerspective(np.asarray(img, np.float32), M, size, flags=cv2.INTER_CUBIC, borderValue=(255,255,255))
    a = cv2.warpPerspective(np.full((h, w), 255, np.float32), M, size, flags=cv2.INTER_LINEAR)
    return rgb, a[..., None]/255

def lighting(img, mask, drop=14):
    """Quadratic fit of each channel over the mask, refit without the ink (pixels clearly darker than the first fit)."""
    ys, xs = np.nonzero(mask); X = xs/1000; Y = ys/1000
    A = np.stack([np.ones_like(X), X, Y, X*X, Y*Y, X*Y], 1); px = img[ys, xs].astype(np.float64)
    keep = np.ones(len(xs), bool)
    for _ in range(2):
        coef, *_ = np.linalg.lstsq(A[keep], px[keep], rcond=None)
        fit = A @ coef; keep = px.mean(1) > fit.mean(1) - drop
    H, W = mask.shape; yy, xx = np.mgrid[0:H, 0:W]/1000
    B = np.stack([np.ones_like(xx), xx, yy, xx*xx, yy*yy, xx*yy], -1)
    return (B @ coef).clip(0, 255)

def skin(img):
    f = img.astype(np.int32); r, g, b = f[...,0], f[...,1], f[...,2]
    return ((r - b > 28) & (r > 110) & (r >= g)).astype(np.uint8)*255

def print_card(big, S, size):
    """Repaint the card face as paper (lighting fit, a little grain), then multiply the QR card onto it."""
    m = quad_mask(big.shape, S["card"], SS); inner = cv2.erode(m, np.ones((7,7), np.uint8))
    paper = lighting(big, inner)
    grain = cv2.GaussianBlur(np.random.default_rng(7).normal(0, 2.2, big.shape[:2]).astype(np.float32), (0,0), 0.8)[..., None]
    rgb, a = warp(card_fit(S["ratio"]), S["card"], size)
    rgb = cv2.GaussianBlur(rgb, (0,0), 0.9)  # match the photo's softness
    face = paper*(rgb/255) + grain
    return big*(1-a) + face*a

key = sys.argv[1]; S = SCENES[key]
scene = Image.open(D/S["scene"]).convert("RGB"); W, H = scene.size; size = (W*SS, H*SS)
big = np.asarray(scene.resize(size, Image.LANCZOS), np.float32)
orig = big.copy()

if "card" in S:
    big = print_card(big, S, size)
else:
    sk = skin(orig.astype(np.uint8)); sk = cv2.dilate(sk, np.ones((5,5), np.uint8))
    lum = orig.mean(2)
    # 1. clean the fake print off the sheet, the bag and the corner card: ink = clearly darker than its neighbourhood, not hand, not phone
    local = cv2.medianBlur(lum.clip(0,255).astype(np.uint8), 41).astype(np.float32)
    for poly, drop in ((S["sheet"], 16), (S["bag"], 18), (S["corner"], 18)):
        # only the sheet has the hand and phone on it (kraft paper reads as skin, and its ink is as dark as the phone)
        guard = (sk | (lum < 70).astype(np.uint8)*255) if poly is S["sheet"] else np.zeros_like(sk)
        m = quad_mask(big.shape, poly, SS) & ~guard
        ink = ((lum < local - drop) & (m > 0)).astype(np.uint8)*255
        ink = cv2.dilate(ink, np.ones((5,5), np.uint8)) & m
        big = cv2.inpaint(big.clip(0,255).astype(np.uint8), ink, 7, cv2.INPAINT_TELEA).astype(np.float32)
    # 2. the receipt lying on the sheet: soft contact shadow, the sheet's own light, under the hand
    rec = Image.open(D/"receipt.png").convert("RGB"); rec = rec.crop((0, 0, rec.width, 720))
    rgb, a = warp(rec, S["receipt"], size)
    sh = cv2.GaussianBlur(np.roll(a[...,0], (6, 4), (0, 1)), (0,0), 6)[..., None]
    big = big*(1 - 0.28*sh)
    light = lighting(orig, quad_mask(big.shape, S["sheet"], SS) & ~sk & (lum > 150).astype(np.uint8)*255) / 245
    rgb = cv2.GaussianBlur(rgb, (0,0), 0.8)*light.clip(0.8, 1.05)
    keep = cv2.GaussianBlur((sk & quad_mask(big.shape, S["hands"], SS)).astype(np.float32)/255, (0,0), 1.2)[..., None]
    phone = cv2.GaussianBlur(quad_mask(big.shape, S["phone"], SS).astype(np.float32)/255, (0,0), 1.2)[..., None]
    a = a*(1-np.maximum(keep, phone)); big = big*(1-a) + rgb*a
    # 3. the EcoProof screen in the phone, under the fingertip
    scr = Image.open(D/"screen.png").convert("RGB")
    rgb, a = warp(scr, S["screen"], size)
    rgb = cv2.GaussianBlur(rgb, (0,0), 0.8)*0.95 + 10
    a = a*(1-keep); big = big*(1-a) + rgb*a
    # 4. close the phone at the top: the glass strip above the screen becomes bezel, in the phone's own near-black
    bz = cv2.GaussianBlur(quad_mask(big.shape, S["bezel"], SS).astype(np.float32)/255, (0,0), 1.0)[..., None]*(1-keep)
    big = big*(1-bz) + np.float32([26, 26, 29])*bz

out = Image.fromarray(big.clip(0,255).astype(np.uint8)).resize((800, 800), Image.LANCZOS)
out.save(D/f"door_{key}.png"); print("wrote", f"door_{key}.png")
