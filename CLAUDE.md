# CLAUDE.md

Working notes for the Canterbury Walking Tour. See `SPEC.md` for the full build
guide and data model; this file captures the things that are easy to get wrong.

## What it is

A static, no-build walking audio guide. A full-screen Leaflet map shows the
route and numbered stops; tapping a stop slides the map aside and opens that
location's card (blurb + George/Lily narration). On phones that card is a bottom
sheet you can collapse to just the title + player (for a bigger map) and restore;
visited stops turn green. Three files plus data: `index.html`, `styles.css`,
`app.js`, and `sites.js` (the `SITES` / `ROUTE` data).

## Live site & deploy

- **Live:** https://vale-phd.github.io/CEMRG_fun_tour/
- Deploys **automatically** via GitHub Pages on every push to the default branch
  **`main`** (workflow `.github/workflows/pages.yml`, which also enables Pages on
  first run). The first build takes ~1–2 minutes.
- To ship a change: merge it into `main` and push.

## Verifying in the Claude Code web sandbox (read before chasing errors)

This environment's network is locked down, so **you cannot confirm the live site
or load the map from here** — and that's expected, not a bug:

- OpenStreetMap tiles are blocked (TLS is intercepted), so the map area is blank
  in any sandbox screenshot. The route line and numbered pins still render.
- `curl` / `WebFetch` to `vale-phd.github.io` and `api.github.com` return **403**
  regardless of the real deploy status. The site is fine in a real browser —
  don't try to "fix" the 403. Hand over the URL and verify there.

To check the UI/interaction logic locally, drive it headlessly instead:

```bash
python3 -m http.server 8137        # serve the repo, then point Playwright at it
```

Playwright is installed (browsers in `/opt/pw-browsers`, module at
`/opt/node22/lib/node_modules/playwright`). Assert behaviour from the DOM
(`#app.detail-open`, `#app.detail-collapsed`, the panel's width/height,
`#detailContent .card`, `.stop-pin__n--visited`) rather than relying on the
(tile-less) screenshots. For the mobile sheet, resize to a phone viewport
(e.g. 390×780) first — the collapse handle, Finish, and instruction-hiding are
all behind the `@media (max-width: 700px)` query.

## Interface map (where things live)

- `index.html` — `#app` wraps the full-screen `#map` and the slide-in `#detail`
  panel; a floating `.map-overlay` holds the title + location status. Inside
  `#detail`: the desktop `#detailClose` ×, the mobile `#detailToggle` collapse
  handle (a circular chevron chip), and `#detailContent`. A `#finishFloat` pill
  lives at body level (shown only on a collapsed mobile sheet).
- `app.js` — `openDetail()` / `closeDetail()` drive the panel: slide the map
  (docked right at ≥701px, bottom sheet at ≤700px), recenter the stop, show the
  persistent card, highlight the active pin, and pause other narrations. Close
  button or Esc reverses it. The geolocation arrival prompt opens the panel; live
  distance shows on the open card.
  - **Mobile sheet collapse:** `setCollapsed()` / `toggleCollapse()` add/remove
    `.detail-collapsed` on `#app`; collapsed shows only the title + audio player
    for a bigger map, and the chevron flips to "restore". `openDetail()` always
    re-expands (`setCollapsed(false)`).
  - **Visited stops:** `markVisited()` records opened stops in the `visited` set
    and adds `.stop-pin__n--visited` (green) to their pins — persists for the
    session, resets on reload (no `localStorage` yet).
  - **Finish & Songs:** every card ends in a `.card__actions` row — a "Finish"
    button plus, when the stop has songs, a "Songs" toggle to its right — shown
    on **both** desktop and mobile (the consistency fix). Finish and the floating
    `#finishFloat` (collapsed mobile sheet only) both call `closeDetail()`.
    `buildSongs()` builds the collapsible song player + style switcher (see
    "Songs" below).
  - Hidden `#trace` / `#poi` authoring tools: see "Hidden authoring tools" below.
- `styles.css` — the panel animates `width` (desktop) / `height` (mobile bottom
  sheet) via the `.detail-open` class; `--panel-w` / `--panel-h` /
  `--panel-h-collapsed` tune the sizes. The `.card__actions` row (Finish + Songs)
  and the `.songs` panel show at **all** widths. The mobile collapse handle, the
  floating Finish, the "hide `.map-overlay` while a stop is open" rule, and the
  collapsed-sheet hiding of `.card__actions` / `.songs` all live in the
  `@media (max-width: 700px)` block — desktop keeps the × and the always-visible
  title pill. The `#detailToggle` chip is `position: fixed` and straddles the
  sheet's top edge so its background is the map, not a white bar.

## Narration (voices & scripts)

- **George** = Kokoro `bm_george` (British male) — the **default** `<id>.mp3`.
  **Lily** = `bf_lily` (British female) — the `<id>-lily.mp3`. Both ship for
  every stop.
- Scripts live in `content/<id>.txt`, one per stop — these are raw TTS input, so
  **no comments or stage directions** (they'd be read aloud). All 16 stops now
  share one informative narrator voice, grounded in a visible detail; a stop's
  character lives in the wording of the script itself.
- To change wording or a voice: edit the script (or the `VOICES` list in
  `tools/generate_audio.py`), rerun `python3 tools/generate_audio.py <id>`, then
  make sure the stop's `audio` array in `sites.js` points at the files.
- **Full reference — voice table + narration house style + the pipeline — is in
  `SPEC.md` §7.** (The earlier comedic per-stop personas have been retired.)

### Regenerating audio in a fresh sandbox

A cold container usually has **no `models/` and no Python deps** (both are
git-ignored / uncommitted). Regen is still doable from here — unlike OSM tiles
and Pages, **PyPI and the Kokoro model release on GitHub *are* reachable**:

```bash
pip install kokoro-onnx soundfile imageio-ffmpeg numpy
mkdir -p models      # git-ignored; never commit the ~340 MB model
curl -L -o models/kokoro-v1.0.onnx https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0/kokoro-v1.0.onnx
curl -L -o models/voices-v1.0.bin  https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0/voices-v1.0.bin
python3 tools/generate_audio.py            # all scripts × all voices, or pass one <id>
```

~340 MB download + a minute or two of synthesis for all 16 stops × 2 voices. A
warm container may already have `models/` and the deps — check before re-fetching.

**Audio gotchas (learned the hard way):**
- **Exotic words can trip the TTS** — e.g. `Durovernum`, `tesserae`, `hypocaust`.
  Audition the clip and respell phonetically if it mangles them.
- **Numbers:** plain 4-digit years read fine (the cathedral script uses `1170`,
  `1538`); the persona scripts spell them out ("fifteen sixty-four") for control.
  Sanity-check any unusual figure or date.
- **Generate the MP3s *before* committing the `sites.js` `audio` refs** — Pages
  404s on a stop pointing at an MP3 that isn't in the repo yet. Commit audio +
  `sites.js` together.
- **Watching a background synth from a script?** Don't `pgrep -f
  generate_audio.py` from a watcher whose own command line contains that string —
  it matches itself and never fires.
- **You can't audition audio in here.** Send the MP3 to the user (or hand over the
  URL) to judge voice quality and whether a persona lands.

## Songs (style remixes)

Per-stop musical remixes behind the card's **Songs** button — full feature write-up
in `SPEC.md` §7. Shipped files: `assets/songs/<id>-<style>.mp3` (committed), listed
in each stop's `songs` array in `sites.js` (`label` = the style).

- **Where to get more (source takes live OUTSIDE the repo):**
  `~/Desktop/CEMRG_fun_tour/songs/` — raw AI-generated takes named
  `NN-<location>-<style>-take{A,B}.mp3` (several styles/takes per location). To
  ship one: copy the chosen take into `assets/songs/` and add a `{ label, file }`
  entry (label = style) to that stop's `songs` array.
- **Coverage:** only 5/16 stops have songs (St Martin's=Lo-fi, St Augustine's=Opera,
  Fyndon's Gate=Folk/K-pop/French, Westgate Towers=EDM, Canterbury Cathedral=Folk)
  — and the takes folder only covers those 5 locations, so the other 11 need
  source music generated first.

## Hidden authoring tools (`#trace`, `#poi`)

Append the hash to the live URL (desktop easiest) to capture map data by tapping;
both dim/relabel the normal UI and suppress the arrival prompt so every tap lands,
and ordinary visitors never see them. Implemented in `setupTrace()` / `setupPoi()`
in `app.js`.

- **`…/#trace`** — tap along the roads to lay down the route; **Copy** emits a
  ready-to-paste `ROUTE = [...]` array for `sites.js`.
- **`…/#poi`** — the toolbar names each stop in turn; tap its spot to drop an
  auto-numbered pin; **Copy** emits a numbered name + coordinate list. (The POI
  name list is the `NAMES` array inside `setupPoi()`.)

Capture on a phone *in situ* for real-world accuracy, or on desktop against the
printed map. Paste the output back into `sites.js` (`ROUTE`, or each stop's
`lat`/`lng`).
