#!/usr/bin/env python3
"""A colour sketch of the board's land for img2img (gen2.py): txt2img alone ignored the order of the regions and drew small
isometric dioramas (gen.py, round 1). The five regions in trail order: meadow and hive village, forest and river, shore and harbour,
terraced highlands, golden summit; left to right on the landscape board, bottom to top on the portrait one.
→ sketch_land.png (1536x768), sketch_port.png (768x1344)."""
import pathlib, random
from PIL import Image, ImageDraw, ImageFilter
D = pathlib.Path(__file__).parent
SEA, SAND, MEADOW, FOREST, RIVER, HILL, ROCK, GOLD, ROOF = "#9fc3cf", "#ecd9a8", "#b9cf7a", "#5f8f4e", "#6fb0c8", "#93b060", "#a98f6c", "#f2c14e", "#b4703c"
def board(w, h, port):
    im = Image.new("RGB", (w, h), SEA); d = ImageDraw.Draw(im); random.seed(7)
    # t runs 0..1 along the trail; u 0..1 across it. Map to the picture for either format.
    P = (lambda t, u: (u*w, (1-t)*h)) if port else (lambda t, u: (t*w, u*h))
    def blob(t, u, rt, ru, col):
        (x, y) = P(t, u); rx, ry = (ru*w, rt*h) if port else (rt*w, ru*h); d.ellipse((x-rx, y-ry, x+rx, y+ry), fill=col)
    for t in [i/40 for i in range(2, 39)]: blob(t, 0.5, 0.06, 0.40, SAND)          # the land, with a sand rim
    for t in [i/40 for i in range(3, 38)]: blob(t, 0.5, 0.05, 0.35, MEADOW)
    for _ in range(60): blob(random.uniform(0.24, 0.42), random.uniform(0.2, 0.8), 0.022, 0.05, FOREST)   # forest
    for i in range(30): blob(0.30 + 0.05*((i % 7)/7), 0.12 + i*0.026, 0.008, 0.018, RIVER)                  # river through it
    blob(0.52, 0.86 if not port else 0.9, 0.09, 0.2, SEA); blob(0.52, 0.66, 0.08, 0.08, SAND)               # a bay with a beach
    for _ in range(40): blob(random.uniform(0.62, 0.8), random.uniform(0.2, 0.8), 0.03, 0.06, HILL)         # highlands
    for _ in range(14): blob(random.uniform(0.82, 0.93), random.uniform(0.3, 0.7), 0.035, 0.09, ROCK)       # the mountain
    blob(0.9, 0.5, 0.03, 0.07, GOLD)                                                                        # its golden summit
    for t, u in [(0.08, 0.4), (0.11, 0.55), (0.14, 0.42), (0.1, 0.68), (0.5, 0.56), (0.55, 0.6), (0.7, 0.45), (0.72, 0.6)]: blob(t, u, 0.008, 0.02, ROOF)  # houses
    return im.filter(ImageFilter.GaussianBlur(6))
board(1536, 768, False).save(D/"sketch_land.png"); board(768, 1344, True).save(D/"sketch_port.png"); print("wrote sketches")
