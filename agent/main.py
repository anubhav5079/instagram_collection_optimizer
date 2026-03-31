"""
CLI entry point for the Instagram Saved Collections agent.

Usage:
    python main.py scrape     — Scrape Instagram saved collections
    python main.py enrich     — Run AI enrichment on scraped data
    python main.py sync       — Scrape + enrich (full pipeline)
    python main.py stats      — Show database statistics
"""

import sys
import os

# Ensure agent directory is in path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from config import ensure_dirs, validate_config
from logger import get_logger
from database import init_db, get_db_stats
from scraper import InstagramScraper
from enrichment import enrich_all_posts

log = get_logger("main")

BANNER = """
================================================
  Instagram Saved Collections - Agent
  Personal data scraper + AI enrichment
================================================
"""

def cmd_scrape() -> None:
    """Run the Instagram scraper."""
    errors = validate_config()
    if errors:
        for err in errors:
            log.error(err)
        log.error("Fix the above errors in your .env file and try again.")
        sys.exit(1)

    init_db()
    scraper = InstagramScraper()
    scraper.scrape_all()


def cmd_enrich() -> None:
    """Run AI enrichment on all unenriched posts."""
    init_db()
    enrich_all_posts()


def cmd_sync() -> None:
    """Full pipeline: scrape → enrich."""
    cmd_scrape()
    log.info("")
    log.info("Starting enrichment pass...")
    cmd_enrich()


def cmd_stats() -> None:
    """Print database statistics."""
    init_db()
    stats = get_db_stats()

    print("\n📊 Database Statistics")
    print("─" * 40)
    print(f"  Collections:      {stats['collections']}")
    print(f"  Total posts:      {stats['total_posts']}")
    print(f"    Images:         {stats['images']}")
    print(f"    Carousels:      {stats['carousels']}")
    print(f"    Videos/Reels:   {stats['videos']}")
    print(f"  Transcripts:      {stats['transcripts']}")
    print(f"  Enriched:         {stats['enriched']}")
    print(f"  Failed:           {stats['failed']}")
    print(f"  Duplicates:       {stats['duplicates']}")
    print("─" * 40)


COMMANDS = {
    "scrape": cmd_scrape,
    "enrich": cmd_enrich,
    "sync": cmd_sync,
    "stats": cmd_stats,
}


def main() -> None:
    print(BANNER)
    ensure_dirs()

    if len(sys.argv) < 2 or sys.argv[1] not in COMMANDS:
        print("Usage: python main.py <command>")
        print()
        print("Commands:")
        print("  scrape   Scrape Instagram saved collections")
        print("  enrich   Run AI enrichment on scraped data")
        print("  sync     Full pipeline (scrape + enrich)")
        print("  stats    Show database statistics")
        sys.exit(1)

    command = sys.argv[1]
    COMMANDS[command]()


if __name__ == "__main__":
    main()
