# CLAUDE.md — navigation notes (for Claude)

Static, no-build audio walking-tour web app for Canterbury. Full design lives in
**SPEC.md**; this file is only the non-obvious, hard-won bits. Keep it terse.

## Run / verify
- Serve: `python3 -m http.server 8000` from repo root → http://localhost:8000
- The list of 16 stops renders immediately (no geolocation needed). The route line
  and numbered pins are drawn client-side; only the map *tiles* are remote.
- Hidden modes via URL hash: `#poi` (place stops) and `#trace` (draw the route).

## This sandbox blocks a lot — don't re-discover it
Network policy returns **403** for:
- `tile.openstreetmap.org` → map tiles are blank in the local preview (fine on real
  phones / on Pages).
- `*.github.io` → can't load or verify the live Pages site from inside the container.
- Playwright's browser CDN → no chromium, can't download one → **no headless
  screenshots possible here**. matplotlib / Pillow also not installed.

So to "show" the app: just run the server and hand the user the port-8000 preview
or the Pages link. Don't burn time trying to screenshot it.

## Branches (the confusing part — verified 2026-05)
- **Default branch = `claude/canterbury-tour-app-aXkYp`** (NOT `main`). It holds the
  current 16-stop tour (`c1aa15b`). Pages deploys from it.
- `claude/generate-poi-songs-3Oie6` is **diverged** (merge-base `40a551e`): one
  unmerged commit adding "per-site theme songs (ACE-Step lyrics + player)", and it
  lacks the whole tour buildout. Not integrated in either direction — a real merge
  decision is pending.
- Per-task working branches (e.g. `claude/clever-fermi-tMCAK`) are local-only until
  pushed. Push to the assigned task branch; don't touch the others without the OK.

## Public link / Pages
- `.github/workflows/pages.yml` triggers **only** on push to
  `claude/canterbury-tour-app-aXkYp` (or manual `workflow_dispatch`).
- Live URL if enabled: https://vale-phd.github.io/CEMRG_fun_tour/
- New work only goes live once it lands on that default branch.

## Audio regen needs setup
Kokoro model files (~340 MB) are **not** committed — download into `models/` first
(SPEC §7); needs network to GitHub releases. No regen without that step.
