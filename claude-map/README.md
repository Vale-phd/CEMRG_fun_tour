# Claude's map (the no-cheating replication challenge)

A from-scratch replica of the tour's walking map — interactive map only, no
narration/history/songs — built **without looking at `../sites.js`**. Once on
`main` it's served at `…/CEMRG_fun_tour/claude-map/`.

## How the route is computed (v2)

The page no longer trusts the hand trace. On load it sends the 17 destinations
(YHA → stops 1–16 → YHA) to the OpenStreetMap walking router
(`routing.openstreetmap.de`, OSRM **foot** profile — the engine behind
openstreetmap.org directions, which prefers footpaths and penalises big roads)
and draws the geometry it returns, snapped to the real path network — the same
"enter destinations, it calculates" logic as Google Maps. The chip shows
**live-routed** + the computed distance; a *Copy route JSON* button exports the
geometry so it can be frozen into `route-data.js`, and a checkbox overlays the
old hand trace for comparison. If the router is unreachable (e.g. the dev
sandbox) the page falls back to the v1 hand trace and says so.

Cross-check on Google itself (9-waypoint URL limit ⇒ two legs): see the
"Google Maps cross-check" links in the project conversation, built from the
same stop coordinates.

## How the stop pins were placed

1. **Anchors, not copying:** each landmark was fixed from published OS National
   Grid references found by web search — Historic England listing NGRs
   (St Martin's `TR1586557758`, Fyndon's Gate `TR1538557846`, Christ Church
   Gate `TR1498357860`, the Beaney `TR1486257898`, abbey `TR1547857821`,
   Greyfriars `TR146578`), Kent HER (`Westgate TR14595808`), geograph
   (St George's Tower `TR15105765`), britishlistedbuildings (King's Bridge
   `TR147579`) and the LDWA hostel gazetteer (YHA `TR156571`).
2. **Hand-trace on the OS grid:** street corners between anchors were laid out
   in metres from the real street sequence (New Dover Rd → Lower Chantry Ln →
   Longport → Monastery St → Lady Wootton's Green → Broad St → The Borough →
   The Friars → St Radigund's → Pound Ln → St Peter's St → Stour St → High St →
   Butchery Ln → Burgate → Canterbury Ln → St George's St).
3. `build_route.py` converts OSGB36 → WGS84 (pyproj) and emits
   `route-data.js` + `preview.svg`; `index.html` plots it with the vendored
   Leaflet on OpenStreetMap tiles.

Regenerate after edits: `pip install pyproj && python3 build_route.py`.

Known honest limits: pins on 1 m listing NGRs are near-exact; corner points in
between are knowledge-traced (±20–50 m), so the line may cut the odd corner —
that's the hand-trace, not the anchors.
