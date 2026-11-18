#!/usr/bin/env python3
"""The app prints a card with the local claim link of a dev place. For the pictures, swap that QR for one to https://ecoproof.app
(qr.png: `qrcode` with margin 0, level Q, the card's ink #3a2a1c). Usage: web_qr.py <place id>... → card_<id>_web.png.
The card itself comes from: brave --headless --print-to-pdf http://localhost:3000/place/<id>?size=a4, then pdftoppm -r 150 -png."""
import numpy as np, sys, pathlib
from PIL import Image
D = pathlib.Path(__file__).parent
qr = Image.open(D/"qr.png").convert("RGB")
for n in sys.argv[1:]:
    im = Image.open(D/f"card_{n}.png").convert("RGB"); a = np.asarray(im).sum(2)
    cq = im.width/100; x0, x1 = round(10.5*cq), round(39.5*cq)  # the QR image sits 10.5cqw to 39.5cqw from the left (Postcard.tsx)
    rows = np.nonzero((a[:, x0:x1] < 300).sum(1) > 20)[0]; rows = rows[(rows > 600) & (rows < 1300)]
    runs = np.split(rows, np.nonzero(np.diff(rows) > 12)[0]+1); run = max(runs, key=len); y0, y1 = run[0], run[-1]+1
    cols = np.nonzero((a[y0:y1, x0-10:x1+10] < 300).sum(0) > 0)[0]; xa, xb = x0-10+cols[0], x0-10+cols[-1]+1
    im.paste(qr.resize((xb-xa, y1-y0), Image.NEAREST), (xa, y0)); im.save(D/f"card_{n}_web.png"); print(n, (xa, y0, xb, y1))
