#!/usr/bin/env python3
"""Route the walking tour over the road pixels of the stitched Google z18 map.

Builds a cost surface (roads cheap, park interiors walkable-but-dearer,
water blocked except where a road/bridge crosses, all else off-limits) and
chains least-cost paths through the stops with skimage.route_through_array.
"""
import json
import math

import numpy as np
from PIL import Image
from scipy.ndimage import binary_dilation
from skimage.graph import route_through_array

Z, XA, YA = 18, 131852, 87429
N = 256 * (2 ** Z)


def to_px(lat, lng):
    x = (lng + 180) / 360 * N - XA * 256
    r = math.radians(lat)
    y = (1 - math.log(math.tan(r) + 1 / math.cos(r)) / math.pi) / 2 * N - YA * 256
    return x, y


def to_ll(x, y):
    lng = (x + XA * 256) / N * 360 - 180
    t = math.pi * (1 - 2 * (y + YA * 256) / N)
    return math.degrees(math.atan(math.sinh(t))), lng


print("loading basemap…")
img = np.asarray(Image.open("/tmp/canterbury_z18.png").convert("RGB"), dtype=np.int16)
R, G, B = img[..., 0], img[..., 1], img[..., 2]

road = (B - R >= 8) & (B - R <= 45) & (G - R >= 4) & (G - R <= 30) & (B >= 185) & (R >= 140)
water = (G - R >= 40) & (B >= 195)
park = (G - R >= 15) & (G - B >= 10) & (G >= 200) & ~road
white = (R >= 252) & (G >= 252) & (B >= 252)
near_road = binary_dilation(road, iterations=4)

cost = np.full(img.shape[:2], 50000.0, dtype=np.float32)  # off-limits
cost[park] = 3.0
cost[white] = 2.0
cost[near_road & ~water] = 1.3                            # bridges label gaps
cost[road] = 1.0
cost[water & ~road] = 120000.0

# pedestrian corridors Google paints like buildings (Buttermarket, the lanes):
# declared walkable by hand, endpoints from the OS-grid derivation.
CORRIDORS = [
    ((51.279302, 1.081152), (51.279176, 1.080786)),  # Christ Church Gate - memorial
    ((51.279176, 1.080786), (51.278820, 1.080710)),  # Buttermarket - Mercery Ln - High St
    ((51.278420, 1.081430), (51.278980, 1.081750)),  # Butchery Lane
    ((51.278980, 1.081750), (51.279210, 1.080860)),  # Burgate (west end)
    ((51.278980, 1.081750), (51.278830, 1.082660)),  # Burgate (east to Canterbury Ln)
    ((51.278830, 1.082660), (51.277990, 1.082330)),  # Canterbury Lane
]
yy, xx = np.mgrid[-6:7, -6:7]
disk = (yy**2 + xx**2) <= 36
for (a, b) in CORRIDORS:
    (x0c, y0c), (x1c, y1c) = to_px(*a), to_px(*b)
    n_steps = int(max(abs(x1c - x0c), abs(y1c - y0c))) + 1
    for t in np.linspace(0, 1, n_steps):
        cy, cx = int(round(y0c + (y1c - y0c) * t)), int(round(x0c + (x1c - x0c) * t))
        ys, xs = np.nonzero(disk)
        cost[np.clip(cy + ys - 6, 0, cost.shape[0]-1), np.clip(cx + xs - 6, 0, cost.shape[1]-1)] =             np.minimum(cost[np.clip(cy + ys - 6, 0, cost.shape[0]-1), np.clip(cx + xs - 6, 0, cost.shape[1]-1)], 1.0)
print(f"road {road.mean():.1%}, park {park.mean():.1%}, water {water.mean():.1%}")

# walking order = the original tour's order; pins = NGR anchors where they were
# proven good, ground-truth corrections where v1 was wrong (start, 6, 7, 9, 10).
STOPS = [
    ("St Martin's Church", 51.278052, 1.093718),
    ("St Augustine's Abbey", 51.277730, 1.087960),
    ("Fyndon's Gate", 51.279024, 1.086899),
    ("Queen Bertha & King Ethelbert", 51.279444, 1.085995),
    ("City Walls", 51.279788, 1.084871),
    ("The Marlowe Theatre", 51.281600, 1.078900),
    ("Solly's Orchard", 51.282250, 1.078350),
    ("Westgate Towers", 51.281468, 1.075733),
    ("River Tours", 51.281280, 1.074800),
    ("Westgate Gardens", 51.280400, 1.074000),
    ("Greyfriars Chapel", 51.279312, 1.076636),
    ("The Beaney", 51.279661, 1.079441),
    ("Canterbury Cathedral", 51.279302, 1.081152),
    ("War Memorial", 51.279176, 1.080786),
    ("Roman Museum", 51.278663, 1.081483),
    ("St George's Tower", 51.277413, 1.082847),
]
START = ("YHA Canterbury", 51.270727, 1.092914)
SEQ = [START] + STOPS + [START]


def snap(y, x, rad=80):
    """nearest road pixel"""
    y0, y1 = max(0, y - rad), min(road.shape[0], y + rad)
    x0, x1 = max(0, x - rad), min(road.shape[1], x + rad)
    win = road[y0:y1, x0:x1]
    ys, xs = np.nonzero(win)
    if not len(ys):
        return y, x
    i = np.argmin((ys + y0 - y) ** 2 + (xs + x0 - x) ** 2)
    return int(ys[i] + y0), int(xs[i] + x0)


pts = []
for name, lat, lng in SEQ:
    x, y = to_px(lat, lng)
    pts.append(snap(int(round(y)), int(round(x))))

full = []
total_cost_flags = []
for i in range(len(pts) - 1):
    (y0, x0), (y1, x1) = pts[i], pts[i + 1]
    m = 520
    ya_, yb = max(0, min(y0, y1) - m), min(cost.shape[0], max(y0, y1) + m)
    xa_, xb = max(0, min(x0, x1) - m), min(cost.shape[1], max(x0, x1) + m)
    sub = cost[ya_:yb, xa_:xb]
    path, c = route_through_array(sub, (y0 - ya_, x0 - xa_), (y1 - ya_, x1 - xa_),
                                  fully_connected=True, geometric=True)
    per_px = c / max(1, len(path))
    total_cost_flags.append(per_px)
    print(f"leg {i:>2} {SEQ[i][0][:18]:18s} -> {SEQ[i+1][0][:18]:18s} {len(path):>5} px, cost/px {per_px:7.2f}")
    full += [(py + ya_, px_ + xa_) for py, px_ in (path if i == 0 else path[1:])]

# simplify: keep every 3rd px then Douglas-Peucker in pixel space
def dp(points, tol):
    if len(points) < 3:
        return points
    a, b = np.array(points[0], float), np.array(points[-1], float)
    ab = b - a
    L = np.hypot(*ab) or 1.0
    d = [abs(np.cross(ab, np.array(p, float) - a)) / L for p in points[1:-1]]
    i = int(np.argmax(d))
    if d[i] > tol:
        left = dp(points[: i + 2], tol)
        return left[:-1] + dp(points[i + 1 :], tol)
    return [points[0], points[-1]]


import sys
sys.setrecursionlimit(100000)
pts3 = full[::3]
half = len(pts3) // 2          # split: dp degenerates on closed loops
slim = dp(pts3[:half + 1], tol=2.5)[:-1] + dp(pts3[half:], tol=2.5)
route_ll = [tuple(round(v, 6) for v in to_ll(x, y)) for y, x in slim]
print(f"path {len(full)} px -> {len(slim)} vertices")

# length
def dist(a, b):
    return math.dist(to_px(*a), to_px(*b)) * 0.3736  # m/px at z18, lat 51.28
km = sum(dist(a, b) for a, b in zip(route_ll, route_ll[1:])) / 1000
print(f"length ≈ {km:.2f} km")

json.dump({"km": round(km, 2),
           "stops": [{"n": i + 1, "name": n, "lat": la, "lng": ln}
                     for i, (n, la, ln) in enumerate(STOPS)],
           "start": {"name": START[0], "lat": START[1], "lng": START[2]},
           "path": route_ll},
          open("/tmp/groute.json", "w"))
print("wrote /tmp/groute.json")
