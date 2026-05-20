# Canterbury Walking Tour

A simple phone-friendly audio guide for a group walk around Canterbury, UK.
Walk up to a site, open the page, tap the site, and listen to a short narrated
history. No app install, no accounts.

**v1 covers Canterbury Cathedral** (two British narrator voices). It's built so
adding more sites is mostly data entry — see [`SPEC.md`](SPEC.md).

## Run it locally

```bash
python3 -m http.server 8000
# open http://localhost:8000
```

## Add a site / regenerate audio

See [`SPEC.md`](SPEC.md) §7 (audio pipeline) and §9 (adding a site). In short:
write `content/<id>.txt`, run `python3 tools/generate_audio.py <id>`, add an
image, and append an entry to `SITES` in `sites.js`.

## Layout

- `index.html`, `styles.css`, `app.js` — the page
- `sites.js` — the tour data (edit this to add sites)
- `content/` — narration scripts (TTS input)
- `assets/` — generated audio + images
- `tools/generate_audio.py` — text-to-speech generator
- `SPEC.md` — full design + build guide
