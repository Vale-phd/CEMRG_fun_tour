#!/usr/bin/env python3
"""Verify claude-map against the original tour (../sites.js).

Reads the original SITES pins + hand-drawn ROUTE and this folder's
route.geojson, computes pin-by-pin and line-deviation stats in metres
(EPSG:27700), and emits compare.geojson (both maps, colour-coded: original
orange, claude blue) plus compare.svg.
"""
import json
import math
import re

from pyproj import Transformer
from shapely.geometry import LineString, Point

TO_OS = Transformer.from_crs("EPSG:4326", "EPSG:27700", always_xy=True)


def en(lat, lng):
    return TO_OS.transform(lng, lat)


# --- original data out of ../sites.js ---------------------------------------
src = open("../sites.js").read()
orig_stops = [
    {"id": m[0], "lat": float(m[1]), "lng": float(m[2])}
    for m in re.findall(r'id:\s*"([^"]+)"[\s\S]*?lat:\s*([\d.]+),\s*lng:\s*([\d.]+)', src)
]
route_src = src[src.index("const ROUTE") :]
orig_route = [
    (float(a), float(b)) for a, b in re.findall(r"\[([\d.]+),\s*([\d.]+)\]", route_src)
]

# --- claude data -------------------------------------------------------------
gj = json.load(open("route.geojson"))
my_path = my_start = None
my_stops = []
for f in gj["features"]:
    g, props = f["geometry"], f["properties"]
    if g["type"] == "LineString":
        my_path = [(lat, lng) for lng, lat in g["coordinates"]]
    elif "YHA" in props["name"]:
        my_start = (g["coordinates"][1], g["coordinates"][0])
    else:
        n, name = props["name"].split(". ", 1)
        my_stops.append({"n": int(n), "name": name,
                         "lat": g["coordinates"][1], "lng": g["coordinates"][0]})

# --- pin-by-pin --------------------------------------------------------------
PAIR = {  # original id -> claude stop number
    "st-martins-church": 1, "st-augustines-abbey": 2, "fyndons-gate": 3,
    "queen-bertha-king-ethelbert": 4, "city-walls": 5, "marlowe-theatre": 6,
    "sollys-orchard": 7, "westgate-towers": 8, "river-tours": 10,
    "westgate-gardens": 9, "greyfriars-chapel": 11, "the-beaney": 12,
    "canterbury-cathedral": 15, "war-memorial": 14, "roman-museum": 13,
    "st-georges-tower": 16,
}
mine_by_n = {s["n"]: s for s in my_stops}
print("pin deltas (original order):")
deltas = []
for i, o in enumerate(orig_stops, 1):
    m = mine_by_n[PAIR[o["id"]]]
    d = math.dist(en(o["lat"], o["lng"]), en(m["lat"], m["lng"]))
    deltas.append(d)
    print(f"  orig#{i:>2} {o['id']:28s} vs mine#{m['n']:>2}  {d:6.1f} m")
print(f"  median {sorted(deltas)[len(deltas)//2]:.1f} m | "
      f"<=25m: {sum(d <= 25 for d in deltas)}/16 | "
      f"<=60m: {sum(d <= 60 for d in deltas)}/16 | max {max(deltas):.1f} m")
d_start = math.dist(en(*orig_route[0]), en(*my_start))
print(f"  start point (YHA): {d_start:.1f} m apart")

# --- route deviation ---------------------------------------------------------
ls_o = LineString([en(*p) for p in orig_route])
ls_m = LineString([en(*p) for p in my_path])
print(f"\nroute lengths: original {ls_o.length/1000:.2f} km, claude {ls_m.length/1000:.2f} km")


def deviation(a, b, label):
    ds = [b.distance(Point(a.interpolate(t, normalized=True)))
          for t in [i / 700 for i in range(701)]]
    ds.sort()
    print(f"{label}: median {ds[350]:.0f} m, p90 {ds[630]:.0f} m, max {ds[-1]:.0f} m, "
          f"within 25 m {sum(d <= 25 for d in ds)/7:.0f}%, within 50 m {sum(d <= 50 for d in ds)/7:.0f}%")


deviation(ls_m, ls_o, "claude line vs original")
deviation(ls_o, ls_m, "original line vs claude")

# --- combined geojson (full map, both tours) ---------------------------------
out = {"type": "FeatureCollection", "features": [
    {"type": "Feature",
     "properties": {"name": f"CLAUDE route ({ls_m.length/1000:.2f} km)",
                    "stroke": "#1a73e8", "stroke-width": 4},
     "geometry": {"type": "LineString",
                  "coordinates": [[lng, lat] for lat, lng in my_path]}},
    {"type": "Feature",
     "properties": {"name": f"ORIGINAL route ({ls_o.length/1000:.2f} km)",
                    "stroke": "#e8710a", "stroke-width": 4},
     "geometry": {"type": "LineString",
                  "coordinates": [[lng, lat] for lat, lng in orig_route]}},
]}
for s in my_stops:
    out["features"].append({"type": "Feature", "properties": {
        "name": f"CLAUDE {s['n']}. {s['name']}", "marker-color": "#1a73e8", "marker-size": "small"},
        "geometry": {"type": "Point", "coordinates": [s["lng"], s["lat"]]}})
out["features"].append({"type": "Feature", "properties": {
    "name": "CLAUDE S. YHA start", "marker-color": "#188038", "marker-size": "small"},
    "geometry": {"type": "Point", "coordinates": [my_start[1], my_start[0]]}})
for i, o in enumerate(orig_stops, 1):
    out["features"].append({"type": "Feature", "properties": {
        "name": f"ORIGINAL {i}. {o['id']}", "marker-color": "#e8710a", "marker-size": "small"},
        "geometry": {"type": "Point", "coordinates": [o["lng"], o["lat"]]}})
json.dump(out, open("compare.geojson", "w"), indent=1)

# --- overlay svg -------------------------------------------------------------
pts_all = [en(*p) for p in orig_route] + [en(*p) for p in my_path]
xs, ys = zip(*pts_all)
x0, y0, x1, y1 = min(xs) - 60, min(ys) - 60, max(xs) + 60, max(ys) + 60
W = 980
S = W / (x1 - x0)
H = int((y1 - y0) * S)
sx = lambda e: (e - x0) * S
sy = lambda n: H - (n - y0) * S


def poly(latlngs):
    return " ".join(f"{sx(e):.1f},{sy(n):.1f}" for e, n in (en(*p) for p in latlngs))


svg = [f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" font-family="sans-serif">',
       f'<rect width="{W}" height="{H}" fill="#f4f1ea"/>',
       f'<polyline points="{poly(orig_route)}" fill="none" stroke="#e8710a" stroke-width="3.5" stroke-linejoin="round" opacity="0.9"/>',
       f'<polyline points="{poly(my_path)}" fill="none" stroke="#1a73e8" stroke-width="3" stroke-dasharray="1 6" stroke-linecap="round"/>']
for i, o in enumerate(orig_stops, 1):
    e, n = en(o["lat"], o["lng"])
    svg.append(f'<circle cx="{sx(e):.1f}" cy="{sy(n):.1f}" r="8.5" fill="#fff" stroke="#e8710a" stroke-width="2"/>')
    svg.append(f'<text x="{sx(e):.1f}" y="{sy(n)+3.5:.1f}" text-anchor="middle" fill="#e8710a" font-size="10" font-weight="bold">{i}</text>')
for s in my_stops:
    e, n = en(s["lat"], s["lng"])
    svg.append(f'<circle cx="{sx(e):.1f}" cy="{sy(n):.1f}" r="8.5" fill="#1a4f8a" stroke="#fff" stroke-width="1.5"/>')
    svg.append(f'<text x="{sx(e):.1f}" y="{sy(n)+3.5:.1f}" text-anchor="middle" fill="#fff" font-size="10" font-weight="bold">{s["n"]}</text>')
for (lat, lng), col, lbl in [(my_start, "#188038", "S")]:
    e, n = en(lat, lng)
    svg.append(f'<circle cx="{sx(e):.1f}" cy="{sy(n):.1f}" r="8.5" fill="{col}"/>')
    svg.append(f'<text x="{sx(e):.1f}" y="{sy(n)+3.5:.1f}" text-anchor="middle" fill="#fff" font-size="10" font-weight="bold">{lbl}</text>')
svg += [f'<rect x="14" y="{H-78}" width="350" height="64" rx="8" fill="#fff" opacity="0.92"/>',
        f'<line x1="26" y1="{H-58}" x2="66" y2="{H-58}" stroke="#e8710a" stroke-width="3.5"/>',
        f'<text x="74" y="{H-54}" font-size="13" fill="#222">original (hand-drawn), {ls_o.length/1000:.2f} km</text>',
        f'<line x1="26" y1="{H-34}" x2="66" y2="{H-34}" stroke="#1a73e8" stroke-width="3" stroke-dasharray="1 6"/>',
        f'<text x="74" y="{H-30}" font-size="13" fill="#222">claude v1 (independent), {ls_m.length/1000:.2f} km</text>',
        f'<line x1="{W-226}" y1="{H-24}" x2="{W-226+200*S:.1f}" y2="{H-24}" stroke="#222" stroke-width="2"/>',
        f'<text x="{W-226}" y="{H-32}" font-size="11" fill="#222">200 m</text>',
        '</svg>']
open("compare.svg", "w").write("\n".join(svg))
print("\nwrote compare.geojson + compare.svg")
