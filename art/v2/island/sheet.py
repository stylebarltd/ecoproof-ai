#!/usr/bin/env python3
"""Contact sheet: sheet.py <out.png> <prefix> seed..."""
import sys
from PIL import Image, ImageDraw, ImageFont
out, prefix, seeds = sys.argv[1], sys.argv[2], [int(s) for s in sys.argv[3:]]
W,H=Image.open(f"{prefix}{seeds[0]}.png").size; cw=int(H*9/16); tile_w=1024; tile_h=512; crop_w=int(cw*tile_h/H); pad=16
sheet=Image.new("RGB",(pad+tile_w+pad+crop_w+pad, pad+len(seeds)*(tile_h+pad)),(240,232,220))
d=ImageDraw.Draw(sheet); f=ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",22)
for i,s in enumerate(seeds):
    im=Image.open(f"{prefix}{s}.png"); y=pad+i*(tile_h+pad)
    sm=im.resize((tile_w,tile_h),Image.LANCZOS); x0=(tile_w-crop_w)//2
    ImageDraw.Draw(sm).rectangle([x0,0,x0+crop_w-1,tile_h-1],outline=(220,40,40),width=3)
    sheet.paste(sm,(pad,y)); cx=(W-cw)//2
    sheet.paste(im.crop((cx,0,cx+cw,H)).resize((crop_w,tile_h),Image.LANCZOS),(pad+tile_w+pad,y))
    d.text((pad+8,y+6),f"seed {s}",fill=(255,255,255),font=f,stroke_width=2,stroke_fill=(0,0,0))
    im.crop((cx,0,cx+cw,H)).save(f"{prefix}{s}_9x16.png")
sheet.save(out); print(out, sheet.size)
