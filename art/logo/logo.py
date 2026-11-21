#!/usr/bin/env python3
"""SUPERSEDED 2026-11-20: rings.py now writes ecoproof-stamp.svg and ecoproof-stamp-mark.svg (stamp-like rings, variant 5); running this overwrites them with the clean-ringed logo.
The EcoProof stamp logo as a vector (Pola's pick, 2026-11-19: number 2 of stamp_variants3.png = mA_97001.png, redrawn by hand).
A round passport stamp: a bold outer ring, a thin inner ring broken in six places (the ring of number 9, variants2/v02_like02_wai_d57.png), a checkmark whose long stroke
becomes a leaf: the stroke runs on under the leaf, so its end is never seen (Pola). Writes ecoproof-stamp.svg (on cream) and ecoproof-stamp-mark.svg (no background), 1024 units square."""
import math, pathlib
OUT = pathlib.Path(__file__).parent
INK, PAPER, LEAF, RIB = "#3a2a1c", "#f4e9d8", "#64974d", "#86c16d"  # the leaf is the one of mA_97002.png: deeper green, a tapered light midrib, no veins
C, R_OUT, R_IN = 512, 392, 333
def arc(r, a0, a1):  # degrees, clockwise on screen (y down)
    p = lambda a: (C + r * math.cos(math.radians(a)), C + r * math.sin(math.radians(a)))
    (x0, y0), (x1, y1) = p(a0), p(a1)
    return f"M{x0:.1f} {y0:.1f} A{r} {r} 0 {1 if a1 - a0 > 180 else 0} 1 {x1:.1f} {y1:.1f}"
# the inner ring is the one of variants2/v02_like02_wai_d57.png (number 9 of stamp_variants3.png; Pola, 2026-11-20, after trying number 11): an even thin line, broken in six places (two short dashes among them)
# as if the stamp had not touched the paper there. Measured off the picture: (from, to) of each break in degrees.
GAPS = [(20.25, 23.75), (28, 29.5), (203.75, 205.25), (208, 210), (230.5, 235.5), (270, 272.75)]
RING = " ".join(arc(R_IN, g1, GAPS[(i + 1) % len(GAPS)][0] + (360 if i + 1 == len(GAPS) else 0)) for i, (_, g1) in enumerate(GAPS))
mark = f'''  <g fill="none" stroke="{INK}" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="{C}" cy="{C}" r="{R_OUT}" stroke-width="30"/>
    <path d="{RING}" stroke-width="8" stroke-linecap="butt"/>
    <path d="M332 524 L452 655 L593 484" stroke-width="66"/>
  </g>
  <path d="M535 536 L507 592" fill="none" stroke="{LEAF}" stroke-width="13" stroke-linecap="round"/>
  <path d="M522 548 C 503 440, 585 313, 727 282 C 741 402, 666 532, 522 548 Z" fill="{LEAF}"/>
  <path d="M536 540 Q 596 420 687 327 Q 620 440 536 540 Z" fill="{RIB}"/>
'''
head = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" role="img" aria-label="EcoProof">\n'
(OUT / "ecoproof-stamp.svg").write_text(head + f'  <rect width="1024" height="1024" fill="{PAPER}"/>\n' + mark + "</svg>\n")
(OUT / "ecoproof-stamp-mark.svg").write_text(head + mark + "</svg>\n")
