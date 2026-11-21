#!/usr/bin/env python3
"""Contact sheet of the logo drafts: sheet.py <out.png> file ... (numbered in order, 5 per row)."""
import sys
from PIL import Image, ImageDraw, ImageFont
out, files = sys.argv[1], sys.argv[2:]; S, P, cols = 400, 14, 5
rows = -(-len(files) // cols); im = Image.new("RGB", (cols * (S + P) + P, rows * (S + P + 34) + P), "#f4e9d8"); d = ImageDraw.Draw(im)
f = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 22)
for i, p in enumerate(files):
    x, y = P + (i % cols) * (S + P), P + (i // cols) * (S + P + 34)
    im.paste(Image.open(p).convert("RGB").resize((S, S), Image.LANCZOS), (x, y)); d.text((x + 4, y + S + 4), f"{i + 1}", fill="#3a2a1c", font=f)
im.save(out)
