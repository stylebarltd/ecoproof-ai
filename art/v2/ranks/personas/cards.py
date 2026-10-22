#!/usr/bin/env python3
"""Card masters from the picked persona renders: key the flat dusty-blue background to transparency (soft edge, speckle-free),
save pick/cards/<rank>_card.png plus 128 and 64 px thumbs composited on dusty blue. The Warden is the former Sentinel card, already transparent.
Run with the WebUI venv python (numpy, PIL)."""
import numpy as np, pathlib, json
from PIL import Image, ImageFilter
P = pathlib.Path(__file__).parent/"pick"; OUT = P/"cards"; OUT.mkdir(exist_ok=True)
BLUE = (139, 154, 190)
def key(im):
    """Hue key: the background is the only blue-violet thing in these renders (flat or with a soft glow), the bee is yellow, brown,
    cream, red and black. Dark and near-white pixels are kept (eyes, antennae, highlights); background holes inside the character
    (goggle lenses, gaps) are filled back; loose foreground specks are dropped."""
    import collections
    hsv = np.asarray(im.convert("RGB").convert("HSV")).astype(np.float32)
    Hh, Ss, Vv = hsv[..., 0], hsv[..., 1], hsv[..., 2]           # H: 0..255 for 0..360 deg
    w_h = np.clip(1 - (np.abs(Hh - 161) - 20) / 8, 0, 1)         # blue-violet band, 200..255 deg full, soft shoulders
    w_s = np.clip((Ss - 14) / 14, 0, 1)                          # greys and whites are not background
    w_v = np.clip((Vv - 70) / 30, 0, 1)                          # dark pixels are not background
    alpha = 1 - w_h * w_s * w_v
    H, W = alpha.shape
    # fill background holes: background regions not connected to the border belong to the character
    hard_bg = alpha < 0.5; reach = np.zeros((H, W), bool); q = collections.deque()
    for y in range(H):
        for x in (0, W - 1):
            if hard_bg[y, x] and not reach[y, x]: reach[y, x] = True; q.append((y, x))
    for x in range(W):
        for y in (0, H - 1):
            if hard_bg[y, x] and not reach[y, x]: reach[y, x] = True; q.append((y, x))
    while q:
        y, x = q.popleft()
        for yy, xx in ((y-1,x),(y+1,x),(y,x-1),(y,x+1)):
            if 0 <= yy < H and 0 <= xx < W and hard_bg[yy, xx] and not reach[yy, xx]: reach[yy, xx] = True; q.append((yy, xx))
    alpha = np.where(hard_bg & ~reach, 1.0, alpha)
    # drop loose foreground specks (< 2000 px) not part of the character
    hard_fg = alpha >= 0.5; lab = np.zeros((H, W), int); n = 0
    for y0 in range(H):
        for x0 in range(W):
            if hard_fg[y0, x0] and not lab[y0, x0]:
                n += 1; q = collections.deque([(y0, x0)]); lab[y0, x0] = n
                while q:
                    y, x = q.popleft()
                    for yy, xx in ((y-1,x),(y+1,x),(y,x-1),(y,x+1)):
                        if 0 <= yy < H and 0 <= xx < W and hard_fg[yy, xx] and not lab[yy, xx]: lab[yy, xx] = n; q.append((yy, xx))
    if n:
        sizes = np.bincount(lab.ravel()); sizes[0] = 0; small = (sizes < 2000)[lab] & hard_fg
        alpha = np.where(small, 0.0, alpha)
    m = Image.fromarray((alpha * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(0.6))
    out = im.convert("RGBA"); out.putalpha(m); return out, "hue key"
def thumbs(card, stem):
    for s in (128, 64):
        bg = Image.new("RGBA", card.size, BLUE + (255,)); bg.alpha_composite(card); bg.convert("RGB").resize((s, s), Image.LANCZOS).save(OUT/f"{stem}_{s}.png")
log = {}
for rank in ("sentinel", "guardian", "vanguard", "paragon"):
    card, bg = key(Image.open(P/f"{rank}.png")); card.save(OUT/f"{rank}_card.png"); thumbs(card, f"{rank}_card"); log[rank] = {"key": bg}
w = Image.open(P/"warden.png").convert("RGBA"); w.save(OUT/"warden_card.png"); thumbs(w, "warden_card"); log["warden"] = {"source": "former sentinel_card.png, already transparent"}
json.dump(log, open(OUT/"cards.json", "w"), indent=1); print("cards:", sorted(p.name for p in OUT.iterdir()))
