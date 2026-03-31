"""
Instagram scraper — uses instagrapi to fetch saved collections and posts.
Authenticates via session cookie (sessionid from browser).
"""

import re
import time
import random
from typing import Optional
from datetime import datetime

from instagrapi import Client
from instagrapi.types import Media, Collection
from instagrapi.exceptions import (
    LoginRequired,
    ClientError,
    ClientThrottledError,
    MediaNotFound,
    UserNotFound,
    PrivateError,
)

from config import (
    INSTAGRAM_SESSION_ID,
    INSTAGRAM_USERNAME,
    MIN_DELAY,
    MAX_DELAY,
    MAX_RETRIES,
    BACKOFF_FACTOR,
)
from logger import get_logger
from database import (
    upsert_collection,
    upsert_post,
    post_exists,
    link_post_to_collection,
    mark_post_failed,
    update_collection_post_count,
    get_post_id_by_instagram_id,
)

log = get_logger("scraper")


def slugify(text: str) -> str:
    """Convert text to URL-safe slug."""
    text = text.lower().strip()
    text = re.sub(r"[^\w\s-]", "", text)
    text = re.sub(r"[\s_]+", "-", text)
    text = re.sub(r"-+", "-", text)
    return text.strip("-") or "untitled"


def extract_hashtags(caption: str) -> list[str]:
    """Extract hashtags from caption text."""
    if not caption:
        return []
    return re.findall(r"#(\w+)", caption)


def rate_limit_delay(attempt: int = 0) -> None:
    """Sleep with jitter to avoid rate limiting."""
    base = MIN_DELAY * (BACKOFF_FACTOR ** attempt)
    delay = min(base, MAX_DELAY) + random.uniform(0.5, 2.0)
    log.debug("Sleeping %.1fs (attempt %d)", delay, attempt)
    time.sleep(delay)


class InstagramScraper:
    """Scrapes saved collections from Instagram using session cookie auth."""

    def __init__(self):
        self.client = Client()
        self.stats = {
            "collections": 0,
            "posts_scraped": 0,
            "posts_skipped": 0,
            "urls_extracted": 0,
            "failures": 0,
            "rate_limits": 0,
        }

    def login(self) -> bool:
        """Authenticate with Instagram using session cookie."""
        if not INSTAGRAM_SESSION_ID:
            log.error("No INSTAGRAM_SESSION_ID found. Set it in .env")
            return False

        try:
            log.info("Authenticating with Instagram as @%s...", INSTAGRAM_USERNAME)

            # Method: Login via session ID cookie
            self.client.login_by_sessionid(INSTAGRAM_SESSION_ID)

            # Verify the session works
            user_info = self.client.account_info()
            log.info("Logged in as @%s (%s)", user_info.username, user_info.full_name)
            return True

        except LoginRequired:
            log.error("Session expired or invalid. Get a fresh sessionid from your browser.")
            return False
        except Exception as e:
            log.error("Login failed: %s", str(e))
            return False

    def scrape_all(self) -> dict:
        """
        Main scraping entrypoint.
        Fetches all saved collections and processes each post.
        Returns stats dict.
        """
        if not self.login():
            return self.stats

        try:
            collections = self._fetch_collections()
            log.info("Found %d saved collections", len(collections))

            for idx, collection in enumerate(collections, 1):
                log.info(
                    "--- Collection %d/%d: %s ---",
                    idx, len(collections), collection.name
                )
                self._process_collection(collection)
                rate_limit_delay()

        except ClientThrottledError:
            log.error("Rate limited by Instagram. Try again later.")
            self.stats["rate_limits"] += 1
        except Exception as e:
            log.error("Scraping aborted: %s", str(e))

        self._print_summary()
        return self.stats

    def _fetch_collections(self) -> list:
        """Fetch all saved collections with retry logic."""
        for attempt in range(MAX_RETRIES):
            try:
                collections = self.client.collections()
                return collections
            except ClientThrottledError:
                self.stats["rate_limits"] += 1
                log.warning("Rate limited fetching collections (attempt %d/%d)", attempt + 1, MAX_RETRIES)
                rate_limit_delay(attempt)
            except Exception as e:
                log.error("Error fetching collections: %s", str(e))
                if attempt < MAX_RETRIES - 1:
                    rate_limit_delay(attempt)
        return []

    def _process_collection(self, collection) -> None:
        """Process a single collection: store metadata + scrape all posts."""
        try:
            collection_name = collection.name or "Untitled"
            collection_ig_id = str(collection.id)

            # Determine cover image URL (store direct Instagram URL)
            cover_image_url = None
            if hasattr(collection, "cover_media") and collection.cover_media:
                media = collection.cover_media
                if hasattr(media, "thumbnail_url") and media.thumbnail_url:
                    cover_image_url = str(media.thumbnail_url)
                elif hasattr(media, "image_versions2") and media.image_versions2:
                    candidates = getattr(media.image_versions2, "candidates", [])
                    if candidates:
                        cover_image_url = str(candidates[0].url)

            # Upsert collection in DB
            slug = slugify(collection_name)
            collection_db_id = upsert_collection(
                instagram_id=collection_ig_id,
                name=collection_name,
                slug=slug,
                cover_image_path=cover_image_url,  # Now stores URL instead of path
            )
            self.stats["collections"] += 1

            # Fetch and process posts in this collection
            self._scrape_collection_posts(collection_ig_id, collection_db_id)

            # Update post count
            update_collection_post_count(collection_db_id)

        except Exception as e:
            log.error("Error processing collection '%s': %s", getattr(collection, 'name', '?'), str(e))

    def _scrape_collection_posts(self, collection_ig_id: str, collection_db_id: int) -> None:
        """Fetch and process all posts in a collection."""
        for attempt in range(MAX_RETRIES):
            try:
                medias = self.client.collection_medias(collection_ig_id)
                break
            except ClientThrottledError:
                self.stats["rate_limits"] += 1
                log.warning("Rate limited on collection medias (attempt %d)", attempt + 1)
                rate_limit_delay(attempt)
            except Exception as e:
                log.error("Error fetching collection medias: %s", str(e))
                return
        else:
            log.error("Failed to fetch medias after %d retries", MAX_RETRIES)
            return

        log.info("  Found %d posts in collection", len(medias))

        for idx, media in enumerate(medias, 1):
            ig_post_id = str(media.pk)

            # Skip already-scraped posts (incremental)
            if post_exists(ig_post_id):
                # Still link to this collection (for dedup tracking)
                existing_id = get_post_id_by_instagram_id(ig_post_id)
                if existing_id:
                    link_post_to_collection(existing_id, collection_db_id)
                self.stats["posts_skipped"] += 1
                log.debug("  Skipping %d/%d (already scraped): %s", idx, len(medias), ig_post_id)
                continue

            log.info("  Processing %d/%d: %s (%s)", idx, len(medias), ig_post_id, media.media_type)
            self._process_post(media, collection_db_id)
            rate_limit_delay()

    def _process_post(self, media: Media, collection_db_id: int) -> None:
        """Process a single post — extract data, handle media, store in DB."""
        ig_post_id = str(media.pk)

        try:
            # ── Extract metadata ────────────────────────────
            caption_text = media.caption_text if hasattr(media, "caption_text") else ""
            if not caption_text and hasattr(media, "caption") and media.caption:
                caption_text = media.caption.text if hasattr(media.caption, "text") else str(media.caption)

            hashtags = extract_hashtags(caption_text)

            author_handle = ""
            author_name = ""
            if hasattr(media, "user") and media.user:
                author_handle = media.user.username or ""
                author_name = media.user.full_name or ""

            permalink = f"https://www.instagram.com/p/{media.code}/" if hasattr(media, "code") and media.code else ""

            date_posted = None
            if hasattr(media, "taken_at") and media.taken_at:
                date_posted = media.taken_at.isoformat() if hasattr(media.taken_at, "isoformat") else str(media.taken_at)

            like_count = getattr(media, "like_count", None)
            comment_count = getattr(media, "comment_count", None)

            location = None
            if hasattr(media, "location") and media.location:
                loc = media.location
                location = getattr(loc, "name", None) or getattr(loc, "address", None)

            alt_text = getattr(media, "accessibility_caption", None)

            # ── Determine media type ───────────────────────
            media_type_raw = str(media.media_type)
            product_type = getattr(media, "product_type", "")

            if product_type == "clips" or media_type_raw == "2":
                media_type = "reel" if product_type == "clips" else "video"
            elif media_type_raw == "8":
                media_type = "carousel"
            else:
                media_type = "image"

            # ── Handle media based on type ──────────────────
            media_urls: list[str] = []
            thumbnail_url = None
            video_url = None
            transcript = None
            transcript_source = None

            if media_type in ("image", "carousel"):
                # Store direct Instagram image URLs
                media_urls = self._extract_image_urls(media)

            elif media_type in ("video", "reel"):
                # Store direct Instagram video and thumbnail URLs
                video_url = str(media.video_url) if hasattr(media, "video_url") and media.video_url else None
                thumbnail_url = str(media.thumbnail_url) if hasattr(media, "thumbnail_url") and media.thumbnail_url else None
                
                # For transcription, we'd still need to download temporarily
                # But for now, just note that video exists
                transcript = "Video content — view on Instagram"
                transcript_source = "none"

            # ── Store in database ───────────────────────────
            post_data = {
                "instagram_post_id": ig_post_id,
                "media_type": media_type,
                "caption": caption_text,
                "hashtags": hashtags,
                "author_handle": author_handle,
                "author_name": author_name,
                "permalink": permalink,
                "date_posted": date_posted,
                "date_saved": None,  # Not reliably available via API
                "like_count": like_count,
                "comment_count": comment_count,
                "location": location,
                "alt_text": alt_text,
                "media_urls": media_urls,
                "thumbnail_url": thumbnail_url,
                "video_url": video_url,
                "transcript": transcript,
                "transcript_source": transcript_source,
                "scrape_status": "complete",
                "error_message": None,
            }

            post_db_id = upsert_post(post_data)
            link_post_to_collection(post_db_id, collection_db_id)
            self.stats["posts_scraped"] += 1
            self.stats["urls_extracted"] += len(media_urls) + (1 if video_url else 0)

        except MediaNotFound:
            log.warning("  Post deleted or unavailable: %s", ig_post_id)
            mark_post_failed(ig_post_id, "Post not found / deleted")
            self.stats["failures"] += 1
        except PrivateError:
            log.warning("  Private account, cannot access: %s", ig_post_id)
            mark_post_failed(ig_post_id, "Private account")
            self.stats["failures"] += 1
        except ClientThrottledError:
            log.warning("  Rate limited processing post: %s", ig_post_id)
            self.stats["rate_limits"] += 1
            rate_limit_delay(3)  # Extra-long delay
        except Exception as e:
            log.error("  Error processing post %s: %s", ig_post_id, str(e))
            mark_post_failed(ig_post_id, str(e))
            self.stats["failures"] += 1

    def _extract_image_urls(self, media: Media) -> list[str]:
        """Extract all image URLs from a media object (handles carousels)."""
        urls: list[str] = []

        def best_url_from_media(m) -> str | None:
            """Extract best quality image URL from a media object."""
            if hasattr(m, "thumbnail_url") and m.thumbnail_url:
                return str(m.thumbnail_url)
            if hasattr(m, "image_versions2") and m.image_versions2:
                candidates = getattr(m.image_versions2, "candidates", [])
                if candidates:
                    # First candidate is usually highest resolution
                    return str(candidates[0].url)
            return None

        # Carousel: iterate through resources
        if hasattr(media, "resources") and media.resources:
            for resource in media.resources:
                url = best_url_from_media(resource)
                if url:
                    urls.append(url)

        # Single image (if no resources found)
        if not urls:
            url = best_url_from_media(media)
            if url:
                urls.append(url)

        return urls

    def _print_summary(self) -> None:
        """Print final scraping summary."""
        s = self.stats
        log.info("=" * 40)
        log.info("  Scraping Complete!")
        log.info("  Collections:      %d", s["collections"])
        log.info("  Posts scraped:     %d", s["posts_scraped"])
        log.info("  Posts skipped:     %d (already in DB)", s["posts_skipped"])
        log.info("  URLs extracted:    %d", s["urls_extracted"])
        log.info("  Failures:          %d", s["failures"])
        log.info("  Rate limit hits:   %d", s["rate_limits"])
        log.info("=" * 40)
