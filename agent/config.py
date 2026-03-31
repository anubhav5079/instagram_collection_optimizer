"""
Configuration module — loads environment variables and defines paths.
"""

import os
from pathlib import Path
from urllib.parse import unquote
from dotenv import load_dotenv

# Load .env from project root
PROJECT_ROOT = Path(__file__).resolve().parent.parent
load_dotenv(PROJECT_ROOT / ".env")

# ── Instagram Auth ──────────────────────────────────────────
# URL decode session ID (Instagram cookies are often URL-encoded)
INSTAGRAM_SESSION_ID: str = unquote(os.getenv("INSTAGRAM_SESSION_ID", ""))
INSTAGRAM_USERNAME: str = os.getenv("INSTAGRAM_USERNAME", "")

# ── Ollama ──────────────────────────────────────────────────
OLLAMA_HOST: str = os.getenv("OLLAMA_HOST", "http://localhost:11434")
OLLAMA_MODEL: str = os.getenv("OLLAMA_MODEL", "llama3.2")

# ── Whisper ─────────────────────────────────────────────────
WHISPER_MODEL: str = os.getenv("WHISPER_MODEL", "base")

# ── Vercel ──────────────────────────────────────────────────
VERCEL_DEPLOY_HOOK: str = os.getenv("VERCEL_DEPLOY_HOOK", "")

# ── Paths ───────────────────────────────────────────────────
WEB_DIR = PROJECT_ROOT / "web"
PUBLIC_DIR = WEB_DIR / "public"
MEDIA_IMAGES_DIR = PUBLIC_DIR / "media" / "images"
MEDIA_THUMBNAILS_DIR = PUBLIC_DIR / "media" / "thumbnails"
DATA_DIR = WEB_DIR / "data"
DB_PATH = DATA_DIR / "instagram.db"
TEMP_DIR = PROJECT_ROOT / "agent" / "temp"
LOG_DIR = PROJECT_ROOT / "agent" / "logs"

# ── Rate Limiting ───────────────────────────────────────────
MIN_DELAY: float = 2.0          # Minimum seconds between requests
MAX_DELAY: float = 10.0         # Maximum delay for backoff
MAX_RETRIES: int = 5            # Max retries on rate limit
BACKOFF_FACTOR: float = 1.5     # Exponential backoff multiplier

# ── Whisper Settings ────────────────────────────────────────
WHISPER_TIMEOUT: int = 300      # 5 minutes max per transcription

# ── Ensure directories exist ────────────────────────────────
def ensure_dirs() -> None:
    """Create all required directories if they don't exist."""
    for d in [MEDIA_IMAGES_DIR, MEDIA_THUMBNAILS_DIR, DATA_DIR, TEMP_DIR, LOG_DIR]:
        d.mkdir(parents=True, exist_ok=True)

def validate_config() -> list[str]:
    """Validate required configuration. Returns list of error messages."""
    errors: list[str] = []
    if not INSTAGRAM_SESSION_ID:
        errors.append("INSTAGRAM_SESSION_ID is not set in .env")
    if not INSTAGRAM_USERNAME:
        errors.append("INSTAGRAM_USERNAME is not set in .env")
    return errors
