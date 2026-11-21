#!/usr/bin/env python3
"""Stamp-like rings for the EcoProof logo (Pola, 2026-11-20: "it is supposed to be imitating a passport stamp, we have to work on both
circles"). Both rings are drawn as outlines, not strokes, so the ink can be uneven the way a rubber stamp prints: more pressure on one
side (the line is fatter there and thin opposite), a rough edge, chips where the rubber missed the paper, pin holes in the ink, breaks.
The inner ring keeps the six breaks of number 9. Checkmark and leaf are untouched. Plain paths only (no filters), so it prints anywhere.
→ rings/r<N>.svg (on cream), rings/r<N>-mark.svg (no background); the pick (PICK) is also written as the logo, ecoproof-stamp.svg and ecoproof-stamp-mark.svg; `rings.py sheet` also writes rings/sheet.html for stamp_rings.png."""
import math, pathlib, random, sys
OUT = pathlib.Path(__file__).parent / "rings"; OUT.mkdir(exist_ok=True)
INK, PAPER, LEAF, RIB = "#3a2a1c", "#f4e9d8", "#64974d", "#86c16d"
C, R_OUT, W_OUT, R_IN, W_IN = 512, 392, 30, 333, 8
GAPS = [(20.25, 23.75), (28, 29.5), (203.75, 205.25), (208, 210), (230.5, 235.5), (270, 272.75)]  # the inner ring's breaks (number 9)
HEAVY = 105  # the side that got the most pressure, in degrees clockwise from the right (y down): the bottom; the top prints lightest

# name, pressure (0 = even line), edge roughness in units, chips, pin holes, breaks in the outer ring, optionally how deep the chips go (1 if left out, 0 = none) and which pin holes stay (1 = all, 2 = every second)
VARIANTS = [
    ("uneven pressure", 0.22, 0.0, 0, 0, []),
    ("pressure, rough edge", 0.22, 1.5, 0, 0, []),
    ("rough edge, chips", 0.22, 1.5, 7, 0, []),
    ("chips, pin holes", 0.22, 1.5, 7, 26, []),
    ("worn: rough edge, holes", 0.30, 2.2, 11, 44, [], 0, 2),  # Pola's pick, 2026-11-20. Every second pin hole is filled again (Pola: "fill half of the dots"). It had three breaks in the outer ring and chips on both of its edges at first; Pola wanted neither (the chips are still rolled, with no depth, so the holes stay where they were)
    ("dry ink, clean edge", 0.14, 0.0, 6, 34, []),
]

def band(rng, amp, lo, hi, n):
    ks = [(rng.randint(lo, hi), rng.uniform(0, 2 * math.pi), rng.uniform(0.4, 1)) for _ in range(n)]
    norm = amp / math.sqrt(sum(w * w for _, _, w in ks) / 2)
    return lambda a: norm * sum(w * math.sin(k * math.radians(a) + ph) for k, ph, w in ks)
def noise(rng, amp):
    """An edge that is not quite a circle: a slow drift (the rubber is never perfectly round) plus a fine grain (ink soaking into paper).
    Whole numbers of waves, so it closes without a seam. Even waves in the middle range are left out: they read as a bottle cap."""
    if not amp: return lambda a: 0.0
    slow, fine = band(rng, amp * 0.55, 2, 9, 6), band(rng, amp * 0.3, 45, 130, 16)
    return lambda a: slow(a) + fine(a)

def chips(rng, n, depth):
    """Places where the edge is eaten away: (centre, half width in degrees, depth)."""
    cs = [(rng.uniform(0, 360), rng.uniform(1.5, 5), rng.uniform(0.25, 1) * depth) for _ in range(n)]
    def f(a):
        t = 0.0
        for c, h, d in cs:
            x = abs((a - c + 180) % 360 - 180) / h
            if x < 1: t = max(t, d * math.cos(x * math.pi / 2) ** 2)
        return t
    return f

def pt(r, a): return f"{C + r * math.cos(math.radians(a)):.1f} {C + r * math.sin(math.radians(a)):.1f}"
def poly(pts): return "M" + " L".join(pts) + " Z"
def steps(a0, a1, per_deg=1):
    n = max(2, int((a1 - a0) * per_deg)); return [a0 + (a1 - a0) * i / n for i in range(n + 1)]
def spans(gaps):
    """The inked stretches between the breaks, as (from, to) with to > from."""
    g = sorted(gaps); return [(g[i][1], g[(i + 1) % len(g)][0] + (360 if i + 1 == len(g) else 0)) for i in range(len(g))]

def ring(rng, r, w, press, rough, n_chips, n_holes, gaps, deep=1, every=1):
    """One ring as a filled outline. Its two edges wobble on their own; pressure makes the line fatter on the heavy side."""
    wide = lambda a: w * (1 + press * math.cos(math.radians(a - HEAVY)))
    ro, ri = noise(rng, rough), noise(rng, rough)
    co, ci = chips(rng, n_chips, w * 0.55 * deep), chips(rng, n_chips // 2, w * 0.4 * deep)
    # the edges may never cross: a chip takes at most what the other edge leaves
    def edges(a):
        half = wide(a) / 2; o = half + ro(a) - co(a); i = -half + ri(a) + ci(a)
        if o - i < 1.2: m = (o + i) / 2; o, i = m + 0.6, m - 0.6
        return r + o, r + i
    d = []
    if gaps:
        for a0, a1 in spans(gaps):
            aa = steps(a0, a1); d.append(poly([pt(edges(a)[0], a) for a in aa] + [pt(edges(a)[1], a) for a in reversed(aa)]))
    else:
        aa = steps(0, 360)[:-1]
        d += [poly([pt(edges(a)[0], a) for a in aa]), poly([pt(edges(a)[1], a) for a in aa])]
    # pin holes: small paper-coloured specks inside the line, more of them where the pressure was light
    tries = 0; made = 0
    while made < n_holes and tries < 4000:
        tries += 1; a = rng.uniform(0, 360)
        if rng.random() > 0.25 + 0.75 * (1 - math.cos(math.radians(a - HEAVY))) / 2: continue
        if any(g0 - 2 < (a % 360) < g1 + 2 for g0, g1 in gaps): continue
        o, i = edges(a); size = rng.uniform(0.9, min(3.6, (o - i) / 4.5))
        if o - i < size * 2 + 5: continue
        rr = rng.uniform(i + size + 2, o - size - 2); k = rng.randint(6, 9); ph = rng.uniform(0, 360)
        cx, cy = C + rr * math.cos(math.radians(a)), C + rr * math.sin(math.radians(a))
        hole = (poly([f"{cx + size * rng.uniform(.6, 1.25) * math.cos(math.radians(ph + 360 * j / k)):.1f} "
                       f"{cy + size * rng.uniform(.6, 1.25) * math.sin(math.radians(ph + 360 * j / k)):.1f}" for j in range(k)]))
        if made % every == 0: d.append(hole)
        made += 1
    return f'  <path fill="{INK}" fill-rule="evenodd" d="{" ".join(d)}"/>\n'

CENTRE = f'''  <path d="M332 524 L452 655 L593 484" fill="none" stroke="{INK}" stroke-width="66" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M535 536 L507 592" fill="none" stroke="{LEAF}" stroke-width="13" stroke-linecap="round"/>
  <path d="M522 548 C 503 440, 585 313, 727 282 C 741 402, 666 532, 522 548 Z" fill="{LEAF}"/>
  <path d="M536 540 Q 596 420 687 327 Q 620 440 536 540 Z" fill="{RIB}"/>
'''
HEAD = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" role="img" aria-label="EcoProof">\n'

def build(n):
    name, press, rough, n_chips, n_holes, breaks, deep, every = (VARIANTS[n - 1] + (1, 1))[:8]; rng = random.Random(98000 + n)
    mark = ring(rng, R_OUT, W_OUT, press, rough, n_chips, n_holes, breaks, deep, every) \
         + ring(rng, R_IN, W_IN, press * 1.6, rough * 0.45, 0, 0, GAPS) + CENTRE
    (OUT / f"r{n}.svg").write_text(HEAD + f'  <rect width="1024" height="1024" fill="{PAPER}"/>\n' + mark + "</svg>\n")
    (OUT / f"r{n}-mark.svg").write_text(HEAD + mark + "</svg>\n")
    return name

names = [build(n) for n in range(1, len(VARIANTS) + 1)]
PICK = 5  # the logo (logo.py drew the earlier, clean-ringed one). Written beside this script and into the app:
#   ecoproof-stamp.svg (on cream), ecoproof-stamp-mark.svg (no background)
#   public/logo-mark.svg            the mark: header logo (components/Logo.tsx)
#   public/landing/ecoproof-stamp.svg  the same mark: back of the landing's rank cards
#   public/logo.svg                 favicon: the mark on a rounded cream tile, a little larger so it holds at 16 px
#   lib/logoMark.ts                 the mark as a string, for the PNG app icons (app/icons/[size])
APP = OUT.parent.parent.parent; full, bare = (OUT / f"r{PICK}.svg").read_text(), (OUT / f"r{PICK}-mark.svg").read_text()
(OUT.parent / "ecoproof-stamp.svg").write_text(full); (OUT.parent / "ecoproof-stamp-mark.svg").write_text(bare)
(APP / "public/logo-mark.svg").write_text(bare); (APP / "public/landing/ecoproof-stamp.svg").write_text(bare)
inner = bare[len(HEAD):-len("</svg>\n")]
(APP / "public/logo.svg").write_text(HEAD + f'  <rect width="1024" height="1024" rx="230" fill="{PAPER}"/>\n  <g transform="translate(512 512) scale(1.1) translate(-512 -512)">\n'
                                     + inner + "  </g>\n</svg>\n")
(APP / "lib/logoMark.ts").write_text("// Written by art/logo/rings.py: the EcoProof stamp logo without a background. Do not edit by hand.\n"
                                     f"export const LOGO_PAPER = \"{PAPER}\";\nexport const LOGO_MARK_SVG = {bare.strip()!r};\n")
if "sheet" in sys.argv:
    cell = lambda n, name: (f'<div><img src="r{n}.svg" width="520" height="520"><p><b>{n}</b> {name}'
                            f'<img src="r{n}.svg" width="96"><img src="r{n}.svg" width="48"><img src="r{n}.svg" width="24"></p></div>')
    (OUT / "sheet.html").write_text('<body style="margin:0;padding:16px;background:#f4e9d8;font:22px sans-serif;color:#3a2a1c;display:grid;'
        'grid-template-columns:repeat(3,520px);gap:8px 16px"><style>p{margin:0 0 18px;display:flex;align-items:center;gap:14px}'
        'p img{border-radius:20%;outline:1px solid #d8c7ab}</style>' + "".join(cell(i + 1, n) for i, n in enumerate(names)) + "</body>\n")
print("\n".join(f"{i + 1} {n}" for i, n in enumerate(names)))
