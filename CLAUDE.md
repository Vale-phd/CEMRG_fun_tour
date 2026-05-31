# CLAUDE.md

Working notes for the Canterbury Walking Tour. See `SPEC.md` for the full build
guide and data model; this file captures the things that are easy to get wrong.

## What it is

A static, no-build walking audio guide. A full-screen Leaflet map shows the
route and numbered stops; tapping a stop slides the map aside and opens that
location's card (blurb + George/Emma narration). Three files plus data:
`index.html`, `styles.css`, `app.js`, and `sites.js` (the `SITES` / `ROUTE`
data).

## Live site & deploy

- **Live:** https://vale-phd.github.io/CEMRG_fun_tour/
- Deploys **automatically** via GitHub Pages on every push to the default branch
  **`claude/canterbury-tour-app-aXkYp`** (workflow `.github/workflows/pages.yml`,
  which also enables Pages on first run). The first build takes ~1–2 minutes.
- To ship a change: merge it into `claude/canterbury-tour-app-aXkYp` and push.

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
  distance shows on the open card. Hidden `#trace` / `#poi` tools are unchanged.
- `styles.css` — the panel animates `width` (desktop) / `height` (mobile bottom
  sheet) via the `.detail-open` class; `--panel-w` / `--panel-h` tune the size.
