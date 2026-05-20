#!/usr/bin/env python3
"""Generate narration MP3s for the Canterbury tour from text scripts.

Reads each content/<site-id>.txt script and synthesises speech with Kokoro
(an offline neural TTS), then encodes an MP3 per voice into assets/audio/.

  Default voice  -> assets/audio/<site-id>.mp3
  Extra voices   -> assets/audio/<site-id>-<voice-key>.mp3

Usage:
  python3 tools/generate_audio.py                 # all scripts, all voices
  python3 tools/generate_audio.py canterbury-cathedral
"""
from __future__ import annotations

import re
import subprocess
import sys
import tempfile
from pathlib import Path

import numpy as np
import soundfile as sf
from kokoro_onnx import Kokoro
import imageio_ffmpeg

ROOT = Path(__file__).resolve().parent.parent
CONTENT_DIR = ROOT / "content"
AUDIO_DIR = ROOT / "assets" / "audio"
MODEL = ROOT / "models" / "kokoro-v1.0.onnx"
VOICES_BIN = ROOT / "models" / "voices-v1.0.bin"

# British-English narrators. Mark exactly one as the default; it becomes the
# bare <site-id>.mp3 that the app plays first. Add or remove entries freely.
VOICES = [
    {"key": "george", "kokoro": "bm_george", "label": "George (British male)", "default": True},
    {"key": "emma", "kokoro": "bf_emma", "label": "Emma (British female)", "default": False},
]
LANG = "en-gb"
SAMPLE_RATE = 24000
MAX_CHUNK_CHARS = 380
GAP_SENTENCE = 0.28  # seconds of silence between synthesis chunks
GAP_PARAGRAPH = 0.55  # seconds of silence between paragraphs


def split_text(text: str) -> list[str]:
    """Break text into synthesis-sized chunks, with paragraph markers."""
    chunks: list[str] = []
    for para in (p.strip() for p in re.split(r"\n\s*\n", text) if p.strip()):
        cur = ""
        for sentence in re.split(r"(?<=[.!?])\s+", para):
            if cur and len(cur) + len(sentence) > MAX_CHUNK_CHARS:
                chunks.append(cur.strip())
                cur = sentence
            else:
                cur = f"{cur} {sentence}".strip()
        if cur:
            chunks.append(cur.strip())
        chunks.append("\x00PARA")  # paragraph break marker
    return chunks


def synth_script(kokoro: Kokoro, text: str, voice: str) -> np.ndarray:
    pieces: list[np.ndarray] = []
    for chunk in split_text(text):
        if chunk == "\x00PARA":
            pieces.append(np.zeros(int(SAMPLE_RATE * GAP_PARAGRAPH), dtype=np.float32))
            continue
        samples, sr = kokoro.create(chunk, voice=voice, speed=1.0, lang=LANG)
        assert sr == SAMPLE_RATE, f"unexpected sample rate {sr}"
        pieces.append(samples.astype(np.float32))
        pieces.append(np.zeros(int(SAMPLE_RATE * GAP_SENTENCE), dtype=np.float32))
    return np.concatenate(pieces) if pieces else np.zeros(1, dtype=np.float32)


def to_mp3(samples: np.ndarray, out_path: Path) -> None:
    with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp:
        wav_path = tmp.name
    try:
        sf.write(wav_path, samples, SAMPLE_RATE)
        ffmpeg = imageio_ffmpeg.get_ffmpeg_exe()
        out_path.parent.mkdir(parents=True, exist_ok=True)
        subprocess.run(
            [ffmpeg, "-y", "-loglevel", "error", "-i", wav_path,
             "-ac", "1", "-ar", str(SAMPLE_RATE), "-b:a", "80k", str(out_path)],
            check=True,
        )
    finally:
        Path(wav_path).unlink(missing_ok=True)


def main() -> int:
    if not MODEL.exists() or not VOICES_BIN.exists():
        print(f"Model files missing. Expected:\n  {MODEL}\n  {VOICES_BIN}\n"
              "Download them from the kokoro-onnx v1.0 GitHub release "
              "(see SPEC.md, 'Audio pipeline').", file=sys.stderr)
        return 1

    wanted = sys.argv[1:]
    scripts = sorted(CONTENT_DIR.glob("*.txt"))
    if wanted:
        scripts = [s for s in scripts if s.stem in wanted]
    if not scripts:
        print("No matching scripts found in content/.", file=sys.stderr)
        return 1

    kokoro = Kokoro(str(MODEL), str(VOICES_BIN))
    for script in scripts:
        text = script.read_text(encoding="utf-8").strip()
        for voice in VOICES:
            suffix = "" if voice["default"] else f"-{voice['key']}"
            out = AUDIO_DIR / f"{script.stem}{suffix}.mp3"
            samples = synth_script(kokoro, text, voice["kokoro"])
            to_mp3(samples, out)
            print(f"  {out.relative_to(ROOT)}  ({len(samples) / SAMPLE_RATE:.1f}s)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
