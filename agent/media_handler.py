"""
Media handler — routes image vs video/reel content through different pipelines.

Images/Carousels: Downloaded locally to /public/media/images/
Videos/Reels: Thumbnail saved, audio extracted → Whisper transcribed, temp deleted
"""

import re
import subprocess
from pathlib import Path
from typing import Optional

import requests
from PIL import Image

from config import MEDIA_IMAGES_DIR, MEDIA_THUMBNAILS_DIR, TEMP_DIR, OLLAMA_HOST, OLLAMA_MODEL, ensure_dirs
from logger import get_logger
from transcriber import transcribe, cleanup_audio

log = get_logger("media")


def download_image(url: str, save_path: Path) -> bool:
    """Download an image from URL to local path."""
    try:
        ensure_dirs()
        response = requests.get(url, timeout=30, stream=True)
        response.raise_for_status()

        with open(save_path, "wb") as f:
            for chunk in response.iter_content(chunk_size=8192):
                f.write(chunk)

        # Validate it's actually an image
        try:
            img = Image.open(save_path)
            img.verify()
        except Exception:
            log.warning("Downloaded file is not a valid image: %s", save_path)
            save_path.unlink(missing_ok=True)
            return False

        log.info("Downloaded image: %s", save_path.name)
        return True

    except requests.RequestException as e:
        log.error("Image download failed (%s): %s", save_path.name, str(e))
        return False


def handle_image_post(post_id: str, image_urls: list[str]) -> list[str]:
    """
    Download all images for an image/carousel post.

    Returns list of relative paths (relative to /public/) for storage in DB.
    """
    ensure_dirs()
    saved_paths: list[str] = []

    for idx, url in enumerate(image_urls):
        filename = f"{post_id}_{idx}.jpg"
        save_path = MEDIA_IMAGES_DIR / filename
        relative_path = f"/media/images/{filename}"

        if save_path.exists():
            log.debug("Image already exists, skipping: %s", filename)
            saved_paths.append(relative_path)
            continue

        if download_image(url, save_path):
            saved_paths.append(relative_path)
        else:
            log.warning("Failed to download image %d for post %s", idx, post_id)

    return saved_paths


def handle_video_post(post_id: str, video_url: str, thumbnail_url: Optional[str] = None) -> dict:
    """
    Process a video/reel post:
    1. Download thumbnail
    2. Extract audio via yt-dlp
    3. Transcribe with Whisper
    4. If no speech, generate scene description via Ollama vision
    5. Clean up temp files

    Returns dict with: thumbnail_path, transcript, transcript_source
    """
    ensure_dirs()
    result = {
        "thumbnail_path": None,
        "transcript": None,
        "transcript_source": "none",
    }

    # ── Step 1: Download thumbnail ──────────────────────────
    if thumbnail_url:
        thumb_filename = f"{post_id}_thumb.jpg"
        thumb_path = MEDIA_THUMBNAILS_DIR / thumb_filename
        relative_thumb = f"/media/thumbnails/{thumb_filename}"

        if thumb_path.exists() or download_image(thumbnail_url, thumb_path):
            result["thumbnail_path"] = relative_thumb

    # ── Step 2: Extract audio via yt-dlp ────────────────────
    audio_path = TEMP_DIR / f"{post_id}_audio.wav"

    try:
        log.info("Extracting audio from video: %s", post_id)
        subprocess.run(
            [
                "yt-dlp",
                "--extract-audio",
                "--audio-format", "wav",
                "--output", str(audio_path),
                "--no-playlist",
                "--quiet",
                video_url,
            ],
            timeout=120,
            check=True,
            capture_output=True,
        )
    except FileNotFoundError:
        log.error("yt-dlp not installed. Install with: pip install yt-dlp")
        result["transcript"] = "Video content — no transcript available (yt-dlp not installed)"
        return result
    except subprocess.TimeoutExpired:
        log.warning("Audio extraction timed out for %s", post_id)
        result["transcript"] = "Video content — no transcript available (extraction timeout)"
        return result
    except subprocess.CalledProcessError as e:
        log.warning("Audio extraction failed for %s: %s", post_id, e.stderr.decode() if e.stderr else str(e))
        # Fall through to scene description

    # ── Step 3: Transcribe with Whisper ─────────────────────
    # yt-dlp may add extension, find the actual file
    actual_audio = _find_audio_file(TEMP_DIR, post_id)

    if actual_audio and actual_audio.exists():
        text = transcribe(str(actual_audio))
        cleanup_audio(actual_audio)

        if text:
            result["transcript"] = text
            result["transcript_source"] = "whisper"
            log.info("Transcribed video %s: %d chars", post_id, len(text))
            return result

    # ── Step 4: No speech — try scene description ───────────
    if result["thumbnail_path"]:
        thumb_full_path = MEDIA_THUMBNAILS_DIR / f"{post_id}_thumb.jpg"
        description = generate_scene_description(thumb_full_path)
        if description:
            result["transcript"] = description
            result["transcript_source"] = "vision"
            return result

    # ── Fallback ────────────────────────────────────────────
    result["transcript"] = "Video content — no transcript available"
    result["transcript_source"] = "none"
    return result


def _find_audio_file(directory: Path, post_id: str) -> Optional[Path]:
    """Find the audio file yt-dlp created (it may add extensions)."""
    for ext in [".wav", ".mp3", ".m4a", ".webm", ".opus"]:
        candidate = directory / f"{post_id}_audio{ext}"
        if candidate.exists():
            return candidate
    # Also check with yt-dlp's naming pattern
    for f in directory.iterdir():
        if f.stem.startswith(f"{post_id}_audio"):
            return f
    return None


def generate_scene_description(image_path: Path) -> Optional[str]:
    """
    Generate a scene description from a thumbnail using Ollama's vision model.
    Falls back gracefully if Ollama is not available.
    """
    if not image_path.exists():
        return None

    try:
        import base64
        image_b64 = base64.b64encode(image_path.read_bytes()).decode("utf-8")

        response = requests.post(
            f"{OLLAMA_HOST}/api/generate",
            json={
                "model": OLLAMA_MODEL,
                "prompt": (
                    "Describe this image in 2-3 sentences. Focus on the scene, "
                    "objects, people, and mood. Be concise and descriptive."
                ),
                "images": [image_b64],
                "stream": False,
            },
            timeout=60,
        )
        response.raise_for_status()
        data = response.json()
        description = data.get("response", "").strip()

        if description:
            log.info("Generated scene description (%d chars)", len(description))
            return description

    except requests.ConnectionError:
        log.warning("Ollama not available — skipping scene description")
    except Exception as e:
        log.warning("Scene description failed: %s", str(e))

    return None
