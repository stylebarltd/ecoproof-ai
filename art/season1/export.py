#!/usr/bin/env python3
"""Season 1 cards, into the app: every finished picture (<card>.png here, 1024 px) goes to public/nft/season1/<card>.png (the NFT
image, lib/seasonRules.ts seasonImage) and a 512 px WebP to public/nft/season1/web/<card>.webp (pages). Run with the WebUI venv
python after compose.py: export.py"""
import pathlib, re
from PIL import Image
D = pathlib.Path(__file__).parent; OUT = D/"../../public/nft/season1"; (OUT/"web").mkdir(parents=True, exist_ok=True)
keys = re.findall(r'\["([a-z_]+)", "[^"]+", "[a-z]+", "[a-z]+"\]', (D/"../../lib/seasonRules.ts").read_text())
assert len(keys) == 20, keys
for k in keys:
    im = Image.open(D/f"{k}.png").convert("RGB"); assert im.size == (1024, 1024), (k, im.size)
    im.save(OUT/f"{k}.png", optimize=True); im.resize((512, 512), Image.LANCZOS).save(OUT/"web"/f"{k}.webp", quality=86, method=6)
print(len(keys), "cards exported")
