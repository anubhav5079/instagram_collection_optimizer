"""
Whisper-based audio transcription for video/reel posts.
Uses OpenAI Whisper locally on CPU — zero API cost.
"""

import os
from pathlib import Path
from typing import Optional

from logger import get_logger
from config import WHISPER_MODEL, WHISPER_TIMEOUT

log = get_logger("transcriber")

# Lazy-load whisper to avoid slow import at startup
_whisper_model = None


def _load_model():
    """Load Whisper model once and cache it."""
    global _whisper_model
    if _whisper_model is None:
        log.info("Loading Whisper '%s' model (this may take a moment on first run)...", WHISPER_MODEL)
        import whisper
        _whisper_model = whisper.load_model(WHISPER_MODEL)
        log.info("Whisper model loaded successfully")
    return _whisper_model


def transcribe(audio_path: str | Path) -> Optional[str]:
    """
    Transcribe an audio file using Whisper.

    Args:
        audio_path: Path to the audio file (WAV, MP3, etc.)

    Returns:
        Transcribed text, or None if no speech detected or error occurred.
    """
    audio_path = Path(audio_path)

    if not audio_path.exists():
        log.error("Audio file not found: %s", audio_path)
        return None

    # Skip very small files (likely silent/corrupt)
    if audio_path.stat().st_size < 1024:
        log.warning("Audio file too small, likely empty: %s", audio_path)
        return None

    try:
        model = _load_model()

        log.info("Transcribing: %s", audio_path.name)
        result = model.transcribe(
            str(audio_path),
            fp16=False,  # CPU mode — no GPU
            language=None,  # Auto-detect language
            verbose=False,
        )

        text = result.get("text", "").strip()

        if not text or len(text) < 5:
            log.warning("No meaningful speech detected in %s", audio_path.name)
            return None

        log.info("Transcribed %d characters from %s", len(text), audio_path.name)
        return text

    except Exception as e:
        log.error("Transcription failed for %s: %s", audio_path.name, str(e))
        return None


def cleanup_audio(audio_path: str | Path) -> None:
    """Delete temporary audio file after transcription."""
    audio_path = Path(audio_path)
    try:
        if audio_path.exists():
            os.remove(audio_path)
            log.debug("Cleaned up temp audio: %s", audio_path.name)
    except OSError as e:
        log.warning("Failed to clean up %s: %s", audio_path.name, str(e))
