#!/usr/bin/env python3
"""Draw the colour-block layout guide for the hero island (1536x768). Writes layout.png and layout_places.json."""
import json, math
from PIL import Image, ImageDraw, ImageFilter
W,H=1536,768
im=Image.new("RGB",(W,H)); d=ImageDraw.Draw(im)
# sky gradient cream -> peach
for y in range(H):
    t=y/H; d.line([(0,y),(W,y)],fill=(int(255-20*t),int(240-60*t),int(215-80*t)))
# clouds
for cx,cy,r in [(200,110,70),(260,130,55),(1250,90,80),(1330,115,60),(760,70,50)]:
    d.ellipse([cx-r,cy-r*0.55,cx+r,cy+r*0.55],fill=(255,250,240))
# island cliffs (terracotta) : jagged underside
top=[(110,420),(200,320),(420,290),(700,280),(1000,290),(1250,310),(1440,380),(1470,470)]
bottom=[(1420,560),(1330,640),(1200,600),(1100,700),(950,660),(820,740),(700,680),(560,720),(430,650),(320,690),(200,600),(120,520)]
d.polygon(top+bottom,fill=(170,95,60))
# plateau meadow (honey)
plateau=[(130,425),(210,332),(420,302),(700,292),(1000,302),(1250,322),(1430,385),(1450,470),(1350,545),(1150,580),(900,595),(650,590),(400,565),(200,510)]
d.polygon(plateau,fill=(232,184,80))
# hill far right
d.ellipse([1130,370,1420,520],fill=(226,170,70))
# river: from right-centre top winding to left edge, then waterfall
river=[(1010,350),(930,380),(860,430),(760,470),(640,480),(520,500),(400,490),(290,470),(190,455),(150,445)]
for i in range(len(river)-1): d.line([river[i],river[i+1]],fill=(90,160,220),width=26)
d.rectangle([128,445,165,610],fill=(150,205,240))  # waterfall
# path (dirt) connecting the five places
path=[(230,480),(340,500),(470,520),(600,515),(720,500),(830,505),(960,520),(1100,500),(1220,470),(1300,440)]
for i in range(len(path)-1): d.line([path[i],path[i+1]],fill=(200,150,95),width=14)
def house(x,y,w,h,wall,roof):
    d.rectangle([x-w//2,y-h,x+w//2,y],fill=wall,outline=(60,35,20),width=3)
    d.polygon([(x-w//2-8,y-h),(x,y-h-int(h*0.7)),(x+w//2+8,y-h)],fill=roof,outline=(60,35,20),width=3)
places={}
# market stall far left (cloth roof)
d.polygon([(250,415),(330,415),(345,445),(235,445)],fill=(230,90,70),outline=(60,35,20),width=3); d.rectangle([248,445,332,470],fill=(220,190,140),outline=(60,35,20),width=3)
places["market"]=(290,445)
# cafe left of centre by the river, awning + 2 tables
house(560,470,110,60,(245,225,190),(170,70,50)); d.rectangle([505,440,615,452],fill=(220,60,60))
for tx in (520,600): d.ellipse([tx-12,478,tx+12,490],fill=(250,250,250),outline=(60,35,20),width=2)
places["cafe"]=(560,455)
# beekeeper hut centre + 3 hives
house(790,440,120,70,(190,140,90),(120,75,45))
for hx in (870,905,940): d.rectangle([hx-12,428,hx+12,455],fill=(250,245,230),outline=(60,35,20),width=2); d.rectangle([hx-15,424,hx+15,430],fill=(140,90,50))
places["hut"]=(790,420); places["hives"]=(905,440)
# shop right of centre, striped canopy + crates
house(1020,470,120,65,(240,230,200),(150,90,60))
for i in range(6): d.rectangle([960+i*20,438,980+i*20,452],fill=(230,80,60) if i%2 else (250,250,250),outline=(60,35,20),width=2)
for bx in (1095,1115): d.rectangle([bx-9,452,bx+9,470],fill=(205,160,100),outline=(60,35,20),width=2)
places["shop"]=(1020,455)
# hotel far right on the hill, bigger, terrace
house(1290,420,160,95,(250,235,210),(190,80,60)); d.rectangle([1200,420,1380,432],fill=(170,120,80),outline=(60,35,20),width=2)
for wx in (1250,1290,1330):
    for wy in (345,380): d.rectangle([wx-9,wy,wx+9,wy+16],fill=(120,160,200),outline=(60,35,20),width=2)
places["hotel"]=(1290,400)
# trees
for tx,ty,r in [(420,400,28),(680,560,24),(1150,420,30),(1400,520,22),(360,540,20)]:
    d.ellipse([tx-r,ty-r,tx+r,ty+r],fill=(110,150,70),outline=(60,35,20),width=3)
# roots under island
for rx in (420,700,1000,1250):
    d.line([(rx,660),(rx-15,720),(rx+10,750)],fill=(90,50,30),width=5)
im.save("layout.png")
json.dump({"size":[W,H],"places":places},open("layout_places.json","w"),indent=1)
print(places)
