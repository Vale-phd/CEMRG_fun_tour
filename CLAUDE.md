# CLAUDE.md

Working notes for the Canterbury Walking Tour. See `SPEC.md` for the full build
guide and data model; this file captures the things that are easy to get wrong.

## What it is

A static, no-build walking audio guide. A full-screen Leaflet map shows the
route and numbered stops; tapping a stop slides the map aside and opens that
location's card (blurb + George/Lily narration). Three files plus data:
`index.html`, `styles.css`, `app.js`, and `sites.js` (the `SITES` / `ROUTE`
data).

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
(`#app.detail-open`, the panel's width/height, `#detailContent .card`) rather
than relying on the (tile-less) screenshots.

## Interface map (where things live)

- `index.html` — `#app` wraps the full-screen `#map` and the slide-in `#detail`
  panel; a floating `.map-overlay` holds the title + location status.
- `app.js` — `openDetail()` / `closeDetail()` drive the panel: slide the map
  (docked right at ≥701px, bottom sheet at ≤700px), recenter the stop, show the
  persistent card, highlight the active pin, and pause other narrations. Close
  button or Esc reverses it. The geolocation arrival prompt opens the panel; live
  distance shows on the open card. Hidden `#trace` / `#poi` authoring tools: see
"Hidden authoring tools" below.
- `styles.css` — the panel animates `width` (desktop) / `height` (mobile bottom
  sheet) via the `.detail-open` class; `--panel-w` / `--panel-h` tune the size.

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
