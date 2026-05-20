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
3. The browser asks for location once; the site list reorders so the **nearest
   site floats to the top** and shows roughly how far away it is. If they
   decline location, the full list is shown and they just tap the site they're
   at.
4. They press play and listen. A voice switcher lets them pick a narrator.

## 3. Current status

- **v1 ships one site: Canterbury Cathedral**, with two British narrator voices
  (George / Emma).
- Everything is structured so adding the rest of the walk is data entry plus an
  audio-generation step (see §9).

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
├── app.js                         # rendering, geolocation sort, voice switch
├── sites.js                       # TOUR DATA (the SITES array)  ← edit this
├── content/
│   └── canterbury-cathedral.txt   # narration script (TTS input, 1 per site)
├── assets/
│   ├── audio/                     # generated MP3s (committed)
│   │   ├── canterbury-cathedral.mp3        # default voice (George)
│   │   └── canterbury-cathedral-emma.mp3   # alternate voice (Emma)
│   └── images/
│       └── canterbury-cathedral.svg        # illustration
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

| field   | type     | notes                                                        |
| ------- | -------- | ------------------------------------------------------------ |
| `id`    | string   | unique slug; **must match** `content/<id>.txt` and the audio filenames |
| `name`  | string   | display name                                                 |
| `lat`   | number   | decimal latitude  (for nearest-first sorting)                |
| `lng`   | number   | decimal longitude                                            |
| `blurb` | string   | one-line summary on the card                                 |
| `image` | string   | path to a photo or illustration                             |
| `audio` | array    | one or more `{ label, file }`; the **first is the default** played |

## 7. Audio pipeline

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

**Voices** are configured in the `VOICES` list at the top of the script. Current
British options used: `bm_george` (default) and `bf_emma`. Other British voices
in Kokoro include `bf_alice`, `bf_isabella`, `bf_lily`, `bm_daniel`, `bm_fable`,
`bm_lewis`. Change the list, rerun, update the `audio` array in `sites.js`.

## 8. Images / illustration policy

- v1 uses an **original SVG illustration** of the cathedral
  (`assets/images/canterbury-cathedral.svg`). It is our own artwork, so there
  are no licensing constraints, it's tiny, and it scales crisply.
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
4. Add an image to `assets/images/` (illustration or a properly-licensed photo).
5. Append a block to `SITES` in `sites.js` with the coordinates, blurb, image
   path, and the `audio` array.
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

- Repo: `vale-phd/cemrg_fun_tour`. Development branch:
  `claude/canterbury-tour-app-aXkYp`.
- One-time: in **Settings → Pages**, set the source branch and `/` (root)
  folder. The site then publishes at the URL GitHub shows there.
- Generate a QR code for that URL for easy sharing on the day.
- Note: Pages serves whatever branch you point it at — decide whether to publish
  from the dev branch or merge to `main` first.

## 12. Roadmap / future enhancements

- Add the remaining sites (Christ Church Gate, Fyndon's Gate / St Augustine's
  Abbey, St Martin's Church, Westgate Towers, Eastbridge Hospital, Greyfriars,
  Dane John & city walls, King's School).
- **Transcripts** under each player (accessibility + noisy streets); reuse the
  `content/*.txt` scripts.
- **Offline / PWA:** cache the page + assets so it runs with no signal (handy
  inside the cathedral).
- Real licensed photographs once an image source is reachable.
- Optional simple map view.

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
- **SVG illustration in v1.** Copyright-clean and unblocked by the network
  policy; real photos are an easy later swap.

## 14. Content accuracy

Narration scripts are drafted from well-established history but **should be
fact-checked before the walk**. Edit `content/<id>.txt` and regenerate the audio
to make changes.
