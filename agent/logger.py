"""
Structured logging for the scraping agent.
Logs to both console (colored) and file.
"""

import logging
import sys
from pathlib import Path
from datetime import datetime

from config import LOG_DIR, ensure_dirs


class ColorFormatter(logging.Formatter):
    """Console formatter with ANSI colors."""

    COLORS = {
        logging.DEBUG:    "\033[90m",     # Gray
        logging.INFO:     "\033[92m",     # Green
        logging.WARNING:  "\033[93m",     # Yellow
        logging.ERROR:    "\033[91m",     # Red
        logging.CRITICAL: "\033[95m",     # Magenta
    }
    RESET = "\033[0m"
    BOLD = "\033[1m"

    def format(self, record: logging.LogRecord) -> str:
        color = self.COLORS.get(record.levelno, self.RESET)
        # Simple icons for quick visual scanning (ASCII-safe)
        icons = {
            logging.DEBUG:    ".",
            logging.INFO:     "+",
            logging.WARNING:  "!",
            logging.ERROR:    "X",
            logging.CRITICAL: "!!",
        }
        icon = icons.get(record.levelno, " ")
        timestamp = datetime.fromtimestamp(record.created).strftime("%H:%M:%S")
        msg = f"{color}{self.BOLD}{icon}{self.RESET} {color}{timestamp}{self.RESET}  {record.getMessage()}"
        return msg


def get_logger(name: str = "agent") -> logging.Logger:
    """
    Create and return a configured logger.
    Logs to console with colors and to a file with full timestamps.
    """
    ensure_dirs()

    logger = logging.getLogger(name)

    # Avoid duplicate handlers on repeated calls
    if logger.handlers:
        return logger

    logger.setLevel(logging.DEBUG)

    # ── Console handler (colored, INFO+) ────────────────────
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setLevel(logging.INFO)
    console_handler.setFormatter(ColorFormatter())
    logger.addHandler(console_handler)

    # ── File handler (full detail, DEBUG+) ──────────────────
    log_file = LOG_DIR / f"scrape_{datetime.now().strftime('%Y%m%d')}.log"
    file_handler = logging.FileHandler(log_file, encoding="utf-8")
    file_handler.setLevel(logging.DEBUG)
    file_formatter = logging.Formatter(
        "%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
    )
    file_handler.setFormatter(file_formatter)
    logger.addHandler(file_handler)

    return logger
