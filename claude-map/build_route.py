#!/usr/bin/env python3
"""Build the claude-map walking route from independently sourced anchors.

Method (no data taken from ../sites.js):
  1. Anchor landmarks via published OS National Grid references
     (Historic England listing NGRs, geograph.org.uk, LDWA) found by web search.
  2. Hand-trace the street corners between anchors on the OS grid (metres),
     from the city's street layout: New Dover Rd, Lower Chantry Ln, Longport,
     Monastery St, Lady Wootton's Green, Broad St, The Borough, Palace St,
     The Friars, St Radigund's St, Pound Ln, St Peter's St, Stour St,
     High St, Butchery Ln, Burgate, Canterbury Ln, St George's St.
  3. Convert EPSG:27700 -> WGS84 with pyproj and emit route-data.js + preview.svg.

Anchor sources:
  St Martin's Church      TR1586557758  Historic England 1242166
  Fyndon's Gate           TR1538557846  Historic England (Kent HER)
  St Augustine's Abbey    TR1547857821  Historic England 1016844
  Christ Church Gate      TR1498357860  Historic England (listing NGR)
  The Beaney              TR1486257898  Historic England 1085027
  Westgate                TR14595808    Kent HER TR15NW155
  St George's Tower       TR15105765    geograph.org.uk square
  King's Bridge           TR147579      britishlistedbuildings 101085029
  Greyfriars              TR146578      Historic England 1005195
  YHA Canterbury          TR156571      ldwa.org.uk location 1661
"""
import json
import math
from xml.sax.saxutils import escape
from pyproj import Transformer

T = Transformer.from_crs("EPSG:27700", "EPSG:4326", always_xy=True)


def ll(e, n):
    lon, lat = T.transform(e, n)
    return round(lat, 6), round(lon, 6)


# The walking loop, YHA -> 16 stops -> YHA, as (easting, northing) corners.
PATH_EN = [
    (615648, 157148),  # YHA Canterbury, 54 New Dover Rd (start)
    (615560, 157230), (615480, 157300),          # New Dover Rd, NW
    (615425, 157352),                            # Lower Chantry Lane corner
    (615438, 157450), (615448, 157560), (615455, 157705),  # Lower Chantry Ln N
    (615560, 157722), (615700, 157737), (615825, 157748),  # Longport E
    (615858, 157752), (615865, 157758),          # 1 St Martin's Church
    (615858, 157752), (615825, 157748), (615700, 157737),  # back W on Longport
    (615560, 157722), (615480, 157708),
    (615470, 157730),                            # 2 St Augustine's Abbey entrance
    (615468, 157706),
    (615400, 157700), (615312, 157700),          # Longport W to Monastery St
    (615330, 157762), (615352, 157808),          # Monastery St N
    (615385, 157846),                            # 3 Fyndon's Gate
    (615320, 157890),                            # 4 Bertha & Ethelbert, Lady Wootton's Green
    (615245, 157930),                            # 5 City Walls at Broad St
    (615205, 158035), (615150, 158130), (615075, 158215),  # Broad St outside the wall
    (615005, 158252),                            # Northgate corner
    (614978, 158195), (614962, 158150),          # The Borough SW
    (614935, 158105),                            # Palace St / The Friars corner
    (614880, 158118), (614842, 158132),          # The Friars W
    (614815, 158145),                            # 6 Marlowe Theatre
    (614788, 158158),                            # Friars bridge over the Stour
    (614745, 158205),                            # 7 Solly's Orchard
    (614695, 158215), (614640, 158212),          # St Radigund's St W
    (614612, 158155), (614600, 158110),          # Pound Lane S along the wall
    (614595, 158085),                            # 8 Westgate Towers
    (614580, 158060), (614565, 158030),          # Westgate Grove
    (614552, 158002),                            # 9 Westgate Gardens (Tower House)
    (614565, 158030), (614580, 158060),          # back to the gate
    (614608, 158062),
    (614660, 158030), (614715, 158000),          # St Peter's St SE
    (614760, 157972), (614766, 157976),          # 10 King's Bridge / river tours
    (614790, 157952),                            # Stour St corner at Eastbridge
    (614800, 157898), (614806, 157852),          # Stour St S
    (614740, 157850),
    (614668, 157848),                            # 11 Greyfriars Chapel
    (614740, 157850), (614806, 157852),          # back out to Stour St
    (614800, 157898), (614790, 157952),
    (614830, 157922), (614862, 157884),          # High St SE past the Beaney
    (614862, 157895),                            # 12 The Beaney
    (614862, 157884), (614910, 157840),
    (614950, 157805),                            # Mercery Lane corner
    (615000, 157763),                            # Butchery Lane corner
    (615009, 157790),                            # 13 Roman Museum, Butchery Ln
    (615022, 157822),                            # Burgate end of Butchery Ln
    (614995, 157833),
    (614958, 157845),                            # 14 War Memorial, Buttermarket
    (614983, 157860),                            # Christ Church Gate
    (615047, 157910),                            # 15 Canterbury Cathedral
    (614983, 157860),                            # back out of the precincts
    (615010, 157838),
    (615062, 157815), (615085, 157806),          # Burgate E to Canterbury Ln
    (615072, 157760), (615062, 157712),          # Canterbury Ln S
    (615105, 157663), (615110, 157655),          # 16 St George's Tower
    (615172, 157597),                            # cross the ring road
    (615208, 157560),                            # St George's roundabout
    (615300, 157468), (615420, 157348),          # St George's Place SE
    (615480, 157295), (615560, 157225),          # New Dover Rd
    (615648, 157148),                            # YHA (finish)
]

STOPS_EN = [
    ("St Martin's Church", 615865, 157758),
    ("St Augustine's Abbey", 615470, 157730),
    ("Fyndon's Gate", 615385, 157846),
    ("Queen Bertha & King Ethelbert", 615320, 157890),
    ("City Walls", 615240, 157925),
    ("The Marlowe Theatre", 614815, 158145),
    ("Solly's Orchard", 614745, 158205),
    ("Westgate Towers", 614595, 158085),
    ("Westgate Gardens", 614552, 158002),
    ("River Tours (King's Bridge)", 614766, 157976),
    ("Greyfriars Chapel", 614668, 157848),
    ("The Beaney", 614862, 157895),
    ("Roman Museum", 615009, 157790),
    ("War Memorial (Buttermarket)", 614958, 157845),
    ("Canterbury Cathedral", 615047, 157910),
    ("St George's Tower", 615110, 157655),
]

START_EN = ("YHA Canterbury (start/finish)", 615648, 157148)

path = [ll(e, n) for e, n in PATH_EN]
stops = [{"n": i + 1, "name": name, "lat": ll(e, n)[0], "lng": ll(e, n)[1]}
         for i, (name, e, n) in enumerate(STOPS_EN)]
start = {"name": START_EN[0], "lat": ll(*START_EN[1:])[0], "lng": ll(*START_EN[1:])[1]}

dist = sum(math.dist(a, b) for a, b in zip(PATH_EN, PATH_EN[1:]))
km = round(dist / 1000, 2)

js = (
    "// Generated by build_route.py — route hand-traced on the OS grid from\n"
    "// published NGR anchors (Historic England / geograph / LDWA), then\n"
    "// converted OSGB36 -> WGS84. Independent of ../sites.js.\n"
    f"const TOUR_KM = {km};\n"
    f"const TOUR_START = {json.dumps(start)};\n"
    f"const TOUR_STOPS = {json.dumps(stops, indent=2)};\n"
    f"const TOUR_PATH = {json.dumps(path)};\n"
)
with open("route-data.js", "w") as f:
    f.write(js)

# SVG preview (OS grid, north up) so the shape can be checked without tiles.
xs = [e for e, n in PATH_EN]; ys = [n for e, n in PATH_EN]
x0, y0, x1, y1 = min(xs) - 60, min(ys) - 60, max(xs) + 230, max(ys) + 60
W = 900; S = W / (x1 - x0); H = int((y1 - y0) * S)
def sx(e): return (e - x0) * S
def sy(n): return H - (n - y0) * S
pts = " ".join(f"{sx(e):.1f},{sy(n):.1f}" for e, n in PATH_EN)
svg = [f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" '
       f'viewBox="0 0 {W} {H}" font-family="sans-serif">',
       f'<rect width="{W}" height="{H}" fill="#f4f1ea"/>',
       f'<polyline points="{pts}" fill="none" stroke="#1a73e8" stroke-width="3" '
       'stroke-linejoin="round" stroke-linecap="round" stroke-dasharray="1 7"/>']
e, n = START_EN[1:]
svg.append(f'<circle cx="{sx(e):.1f}" cy="{sy(n):.1f}" r="9" fill="#188038"/>')
svg.append(f'<text x="{sx(e):.1f}" y="{sy(n)+4:.1f}" text-anchor="middle" '
           'fill="#fff" font-size="11" font-weight="bold">S</text>')
for i, (name, e, n) in enumerate(STOPS_EN):
    svg.append(f'<circle cx="{sx(e):.1f}" cy="{sy(n):.1f}" r="9" fill="#1a4f8a"/>')
    svg.append(f'<text x="{sx(e):.1f}" y="{sy(n)+4:.1f}" text-anchor="middle" '
               f'fill="#fff" font-size="11" font-weight="bold">{i+1}</text>')
    svg.append(f'<text x="{sx(e)+12:.1f}" y="{sy(n)+4:.1f}" fill="#333" '
               f'font-size="11">{escape(name)}</text>')
svg.append(f'<text x="16" y="{H-16}" font-size="14" fill="#333">'
           f'Canterbury walking loop — {km} km, 16 stops (north up)</text>')
svg.append('</svg>')
with open("preview.svg", "w") as f:
    f.write("\n".join(svg))

longest = sorted((math.dist(a, b) for a, b in zip(PATH_EN, PATH_EN[1:])), reverse=True)[:5]
print("longest segments (m):", [round(d) for d in longest])
print(f"route: {len(path)} points, {km} km; stops: {len(stops)}")
for s in stops:
    print(f"  {s['n']:>2} {s['name']:32s} {s['lat']:.6f}, {s['lng']:.6f}")
print(f"start {start['lat']:.6f}, {start['lng']:.6f}")
