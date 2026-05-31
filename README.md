# Canterbury Walking Tour

A simple phone-friendly audio guide for a group walk around Canterbury, UK.
Walk up to a site, open the page, tap the site, and listen to a short narrated
history. No app install, no accounts.

A full-screen map shows the route and **16 numbered stops**; tap one to open its
card and listen. Every stop has two British narrator voices — **George** and
**Emma** — and many are voiced in a playful persona (Roman soldier, friar,
theatrical luvvie, …). It's built so adding more sites is mostly data entry —
see [`SPEC.md`](SPEC.md).

## Run it locally

```bash
python3 -m http.server 8000
# open http://localhost:8000
```

## Add a site / regenerate audio

See [`SPEC.md`](SPEC.md) §7 (narration & audio — incl. the **George/Emma voice
table** and per-stop personas) and §9 (adding a site). In short: write
`content/<id>.txt`, run `python3 tools/generate_audio.py <id>`, append an entry
to `SITES` in `sites.js`, and add an image if you have one.

## Layout

- `index.html`, `styles.css`, `app.js` — the page
- `sites.js` — the tour data (edit this to add sites)
- `content/` — narration scripts (TTS input)
- `assets/` — generated audio + images
- `tools/generate_audio.py` — text-to-speech generator
- `SPEC.md` — full design + build guide
