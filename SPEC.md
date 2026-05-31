# Canterbury Walking Tour — Specification

A pocket audio guide for a group walking around Canterbury. You walk up to a
historical site, open the page on your phone, tap the site, and listen to a
short narrated history.

This document is the build guide: it records what exists, why it's built this
way, and exactly how to extend it.

---

## 1. Purpose & context

- **Who:** a group of ~24 people on a self-guided walk around Canterbury, UK.
- **Device:** their own phones (mixed iOS/Android), outdoors, on mobile data.
- **Goal:** zero-friction access to an audio guide per site — no app install,
  no account, no per-person setup. Open a link, listen.

## 2. User flow

1. Someone shares the link (or a QR code) before the walk.
2. On arrival at a site, the visitor opens the page.
3. The page opens to a **full-screen map** with the route and numbered stops.
   The browser asks for location once; a live dot shows where they are and the
   nearest stop within range pops an "arrival" prompt. Location is optional —
   without it they just tap the stop they're standing at.
4. Tapping a numbered stop (or the arrival prompt) **slides the map aside and
   opens that stop's card** — docked to the right on wide screens, a bottom
   sheet on phones. They press play and listen; a voice switcher picks the
   narrator. Once opened, the stop's pin turns **green** so they can see where
   they've been.
5. **On phones** the sheet can be **collapsed** (a chevron handle on its top
   edge) down to just the title + audio player, giving a bigger map while the
   narration keeps playing; the handle flips to restore the full card. A
   **Finish** button (next to the voice buttons when expanded, a floating pill
   when collapsed) returns to the full-screen map and brings back the
   instructions bubble. On wide screens the card stays docked and closes with ×
   or Esc.

## 3. Current status

- **Live at https://vale-phd.github.io/CEMRG_fun_tour/** — a full-screen map
  with **16 narrated stops**, each with two British narrator voices
  (George / Lily).
- Adding more stops is data entry plus an audio-generation step (see §9).

## 4. Architecture & rationale

- **Static site, no backend.** Plain HTML/CSS/JS. Hosted free on GitHub Pages.
  Rationale: 24 strangers' phones must "just work" — a static page over HTTPS is
  the most reliable, cheapest, lowest-maintenance option, and needs no server.
- **No framework / no build step.** The whole app is three small files plus a
  data file. Rationale: "something simple" — nothing to compile, anyone can read
  and edit it.
- **Pre-generated audio.** Narration MP3s are generated once, ahead of time, and
  served as static files. No TTS runs on the visitor's phone. Rationale: this is
  why audio *quality* (not model footprint/speed) is the only thing that matters
  when choosing a TTS — see Decision Log (§13).
- **Online-only (v1).** No offline/PWA caching yet. Canterbury has decent
  coverage. Offline is a documented future step (§12).

## 5. Repository layout

```
/
├── index.html                     # page shell
├── styles.css                     # mobile-first styling
├── app.js                         # map, slide-in detail panel, geolocation, voices
├── sites.js                       # TOUR DATA (the SITES array)  ← edit this
├── content/
│   └── canterbury-cathedral.txt   # narration script (TTS input, 1 per site)
├── assets/
│   ├── audio/                     # generated MP3s (committed)
│   │   ├── canterbury-cathedral.mp3        # default voice (George)
│   │   └── canterbury-cathedral-lily.mp3   # alternate voice (Lily)
│   └── images/
│       └── canterbury-cathedral.jpg        # illustration (1280px JPEG, 1 per site)
├── tools/
│   └── generate_audio.py          # text → MP3 generator (Kokoro)
├── models/                        # Kokoro model files — NOT committed (see §7)
├── SPEC.md / README.md / CREDITS.md
└── .gitignore
```

## 6. Data model — `sites.js`

`sites.js` defines a single global `const SITES = [...]`. It's loaded via a
plain `<script>` before `app.js` (no `fetch`, so it works even from `file://`).

Each site object:

| field    | type   | notes                                                        |
| -------- | ------ | ------------------------------------------------------------ |
| `id`     | string | unique slug; **must match** `content/<id>.txt` and the audio filenames |
| `name`   | string | display name                                                 |
| `lat`    | number | decimal latitude (marker position)                           |
| `lng`    | number | decimal longitude                                            |
| `radius` | number | *optional* — metres; how close triggers the "you're here" arrival prompt (default 40) |
| `blurb`  | string | one-line summary shown on the card                           |
| `image`  | string | *optional* — path to a photo/illustration; omit for a plain title panel |
| `audio`  | array  | *optional* — one or more `{ label, file }`; the **first is the default**. Omit and the card shows "narration coming soon" |

**Order = the numbered walk.** Stops are numbered (1, 2, 3 …) on both the map
pins and the cards in the order they appear in `SITES`. Reorder the array to
renumber the tour.

`sites.js` also defines `const ROUTE = [[lat, lng], …]` — the ordered points of
the walking route line drawn on the map (see the hidden `#trace` tool in
`CLAUDE.md` for how it's captured).

## 7. Narration & audio pipeline

> **Quick answer — which voice is which:** **George** is Kokoro `bm_george`
> (British **male**, the default `<id>.mp3`); **Lily** is `bf_lily` (British
> **female**, `<id>-lily.mp3`). Full table below.

**Engine:** [Kokoro](https://github.com/thewh1teagle/kokoro-onnx) — an open
(Apache-2.0) neural TTS, run here via the ONNX runtime. Chosen over Piper for
naturalness; see Decision Log (§13).

**Model files (not committed — ~340 MB):** download once into `models/`:

- `https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0/kokoro-v1.0.onnx`
- `https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0/voices-v1.0.bin`

**One-time setup:**

```bash
pip3 install kokoro-onnx soundfile imageio-ffmpeg
mkdir -p models
curl -L -o models/kokoro-v1.0.onnx  <model URL above>
curl -L -o models/voices-v1.0.bin   <voices URL above>
```

**Generate audio:**

```bash
python3 tools/generate_audio.py                      # every script, every voice
python3 tools/generate_audio.py canterbury-cathedral # one site
```

What the script does (`tools/generate_audio.py`):
- reads each `content/<id>.txt`,
- splits it into sentence-sized chunks (Kokoro has a per-call length limit) and
  stitches them with short silences,
- synthesises each configured voice (British English, `lang="en-gb"`),
- encodes mono 24 kHz MP3 at 80 kbps via the bundled `imageio-ffmpeg`,
- writes the default voice to `assets/audio/<id>.mp3` and extras to
  `assets/audio/<id>-<key>.mp3`.

### Voices

Two British narrators are generated for every stop. The default (the bare
`<id>.mp3` the app plays first) is **George**; the alternate is **Lily**.

| App label  | Kokoro voice | Voice          | File              | Default |
| ---------- | ------------ | -------------- | ----------------- | :-----: |
| **George** | `bm_george`  | British male   | `<id>.mp3`        |    ✓    |
| **Lily**   | `bf_lily`    | British female | `<id>-lily.mp3`   |         |

Configured in the `VOICES` list at the top of `tools/generate_audio.py`. Other
British Kokoro voices: `bf_alice`, `bf_emma`, `bf_isabella`, `bm_daniel`,
`bm_fable`, `bm_lewis`. To change a voice: edit the list, rerun the generator,
then update the matching `audio` array(s) in `sites.js`.

### Narration style (unified)

All sixteen stops share **one narrator voice**, modelled on the Canterbury
Cathedral script: warm, informative, and fact-forward, spoken to "you", the
visitor standing on the spot. Earlier drafts gave eleven stops comedic personas
(herald, Roman legionary, friar, the talking tower, …); these were **retired**
in favour of a single guide voice that carries more real history.

House style for every `content/<id>.txt`:

- **Ground it in something visible.** Open or pivot on a physical detail the
  visitor is looking at — the Roman brick in St Martin's walls, the gun-loops on
  the Westgate, the plane tree that has slowly swallowed an iron bench in
  Westgate Gardens — then tell its story.
- **A few true, vivid facts** per stop (fact-checked against public sources, see
  §14), one memorable hook, and a short reflective close.
- **The War Memorial stays dignified**, not jaunty — informative but solemn.

The character of a stop lives entirely in its `content/<id>.txt`; edit the text
and regenerate (above) to retune it.

## 8. Images / illustration policy

- Each stop has its own illustration at `assets/images/<id>.jpg`, shown as the
  card's header image (`object-fit: cover`).
- **Keep them small (this bit us once):** store each at **1280 px on the long
  edge, JPEG quality ~85** (~330–400 KB). That's all the UI can show — the card
  panel is ≤420 px wide on desktop and full-width (≤~430 px) on phones, so 1280 px
  stays crisp even at 3× device-pixel-ratio. The first cut shipped 1536×1024 PNGs
  at ~3.5 MB each (56 MB total), which bloated the repo and dragged on mobile
  data; re-encoding to JPEG cut the set to ~5.6 MB. Don't commit multi-MB PNGs.
  Regenerate with Pillow: open → `.convert("RGB")` → resize long edge to 1280 →
  `.save(path, "JPEG", quality=85, optimize=True, progressive=True)`.
- **Why not a photo?** The build environment's network policy blocks Wikimedia
  (and similar image hosts), so a real Creative-Commons photo couldn't be pulled
  in automatically. Swapping one in later is trivial: drop the file in
  `assets/images/`, point the site's `image` field at it, and record the
  author/licence in `CREDITS.md`.
- **Licensing rule for any real photo:** use only public-domain or
  Creative-Commons images, and attribute them in `CREDITS.md` (and a visible
  credit if the licence requires it, e.g. CC-BY / CC-BY-SA).

## 9. Adding a new site (checklist)

1. Pick a slug, e.g. `westgate-towers`.
2. Write the narration in `content/westgate-towers.txt` (plain text; blank lines
   separate paragraphs and create slightly longer pauses).
3. Run `python3 tools/generate_audio.py westgate-towers` → produces the MP3(s).
4. *(Optional)* add an image to `assets/images/` (illustration or a
   properly-licensed photo); without one the card shows a plain title panel.
5. Append a block to `SITES` in `sites.js` with the coordinates, blurb, the
   `audio` array, and an optional `image`. Position the block where the stop
   falls in the walk — array order sets its number.
6. Serve locally (§10) and check it; commit and push.

## 10. Local development

`sites.js` needs no server, but audio/images load best over HTTP:

```bash
python3 -m http.server 8000
# open http://localhost:8000
```

Geolocation requires a secure context — it works on `localhost` and on the
deployed HTTPS site, but not over plain `http://<LAN-IP>`.

## 11. Deployment (GitHub Pages)

- **Live URL:** https://vale-phd.github.io/CEMRG_fun_tour/
- Deploys **automatically** via GitHub Actions (`.github/workflows/pages.yml`)
  on every push to the default branch `main`. The workflow enables Pages on its
  first run; the first build takes ~1–2 minutes.
- To ship a change: merge it into `main` and push.
- Generate a QR code for the live URL for easy sharing on the day.
- **Note:** you can't open the live URL (or load map tiles) from the Claude Code
  web sandbox — its network is locked down and returns 403/blank regardless of
  the real status. Verify in a real browser, or test the UI headlessly (see
  `CLAUDE.md`).

## 12. Roadmap / future enhancements

- **More sites.** The walk currently has 16 stops; obvious additions include
  Eastbridge Hospital, Dane John Gardens, and King's School.
- **Transcripts** under each player (accessibility + noisy streets); reuse the
  `content/*.txt` scripts.
- **Offline / PWA:** cache the page + assets so it runs with no signal (handy
  inside the cathedral).
- **Persist visited stops** across reloads (e.g. `localStorage`) — currently the
  green visited-pin state is session-only and resets on refresh.
- Real licensed photographs once an image source is reachable — only the
  cathedral has artwork so far; the rest use a plain title panel.

## 13. Decision log

- **TTS = Kokoro, not Piper.** Audio is generated once on a workstation, never
  on the phone, so Piper's tiny-footprint / on-device advantage is irrelevant.
  Quality is the only axis that matters and Kokoro is the more natural narrator.
  (Practical bonus: Kokoro's model is hosted on GitHub releases, which is
  reachable in this environment, whereas Piper's voices live on HuggingFace,
  which is blocked here.)
- **Two voices shipped.** The original ask was to compare TTS *engines*; with
  Piper blocked we instead ship two Kokoro British voices so the narrator can be
  chosen by ear.
- **Data inline in `sites.js`, not fetched JSON.** Avoids `fetch`/CORS issues
  and works from `file://`; simpler for a tiny dataset.
- **Online-only in v1.** Simplicity first; offline is a known future step.
- **Per-stop JPEG illustrations.** Stored at 1280 px / JPEG q85 (~350 KB each) to
  keep the repo light and mobile loads fast (an early single SVG was replaced once
  every stop had artwork). Real photos remain an easy later swap.
- **Map-first interface.** The map is the browser: full-screen, with the
  per-stop cards shown on demand in a slide-in panel (docked right on desktop, a
  bottom sheet on phones) instead of a scrolling list. It reuses the existing
  card + voice-switcher markup; geolocation now drives the live dot, the arrival
  prompt, and the open card's distance rather than reordering a list.
- **Mobile sheet is collapsible, not just open/closed.** On phones a stop is a
  bottom sheet that collapses to title + player (bigger map, audio keeps
  playing) and restores — driven by a graphical chevron chip that floats on the
  sheet's top edge (`position: fixed`, transparent behind it, so no white bar)
  rather than the desktop × (which is hidden on phones). A "Finish" button is
  the explicit way back to the map, and the title/instructions bubble is hidden
  whenever a stop is open on mobile so it doesn't compete with the sheet. All of
  this is mobile-only (`@media (max-width: 700px)`); desktop is unchanged.
- **Visited stops shown green, session-only.** Opening a stop turns its pin
  green so visitors can see progress at a glance. Kept in memory (a `visited`
  set), not `localStorage` — simplest thing that helps during a single walk;
  persisting across reloads is a documented future step (§12).

## 14. Content accuracy

Narration scripts are drafted from well-established history but **should be
fact-checked before the walk**. Edit `content/<id>.txt` and regenerate the audio
to make changes.
