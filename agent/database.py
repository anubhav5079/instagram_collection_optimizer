"""
SQLite database — schema creation and CRUD operations.
All data for collections, posts, and enrichment is stored here.
"""

import sqlite3
import json
from pathlib import Path
from typing import Any, Optional

from config import DB_PATH, ensure_dirs
from logger import get_logger

log = get_logger("database")


def get_connection() -> sqlite3.Connection:
    """Get a SQLite connection with WAL mode and foreign keys enabled."""
    ensure_dirs()
    conn = sqlite3.connect(str(DB_PATH))
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA foreign_keys=ON")
    conn.row_factory = sqlite3.Row
    return conn


def init_db() -> None:
    """Create all tables and indexes if they don't exist."""
    conn = get_connection()
    cursor = conn.cursor()

    cursor.executescript("""
        -- Collections
        CREATE TABLE IF NOT EXISTS collections (
            id                  INTEGER PRIMARY KEY AUTOINCREMENT,
            instagram_id        TEXT UNIQUE NOT NULL,
            name                TEXT NOT NULL,
            slug                TEXT UNIQUE NOT NULL,
            cover_image_path    TEXT,
            post_count          INTEGER DEFAULT 0,
            summary             TEXT,
            top_tags            TEXT,
            created_at          DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at          DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        -- Posts
        CREATE TABLE IF NOT EXISTS posts (
            id                  INTEGER PRIMARY KEY AUTOINCREMENT,
            instagram_post_id   TEXT UNIQUE NOT NULL,
            media_type          TEXT NOT NULL,
            caption             TEXT,
            hashtags            TEXT,
            author_handle       TEXT,
            author_name         TEXT,
            permalink           TEXT,
            date_posted         DATETIME,
            date_saved          DATETIME,
            like_count          INTEGER,
            comment_count       INTEGER,
            location            TEXT,
            alt_text            TEXT,
            media_urls          TEXT,              -- JSON array of direct Instagram URLs
            thumbnail_url       TEXT,              -- Direct Instagram thumbnail URL
            video_url           TEXT,              -- Direct Instagram video URL
            transcript          TEXT,
            transcript_source   TEXT,
            category            TEXT,
            keywords            TEXT,
            mood                TEXT,
            ai_summary          TEXT,
            is_duplicate        BOOLEAN DEFAULT 0,
            duplicate_in        TEXT,
            scrape_status       TEXT DEFAULT 'pending',
            enrichment_status   TEXT DEFAULT 'pending',
            error_message       TEXT,
            created_at          DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at          DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        -- Many-to-many: posts ↔ collections
        CREATE TABLE IF NOT EXISTS post_collections (
            post_id             INTEGER NOT NULL,
            collection_id       INTEGER NOT NULL,
            PRIMARY KEY (post_id, collection_id),
            FOREIGN KEY (post_id) REFERENCES posts(id),
            FOREIGN KEY (collection_id) REFERENCES collections(id)
        );

        -- Indexes
        CREATE INDEX IF NOT EXISTS idx_posts_media_type ON posts(media_type);
        CREATE INDEX IF NOT EXISTS idx_posts_category ON posts(category);
        CREATE INDEX IF NOT EXISTS idx_posts_mood ON posts(mood);
        CREATE INDEX IF NOT EXISTS idx_posts_author ON posts(author_handle);
        CREATE INDEX IF NOT EXISTS idx_posts_scrape_status ON posts(scrape_status);
        CREATE INDEX IF NOT EXISTS idx_posts_enrichment_status ON posts(enrichment_status);
    """)

    # FTS5 virtual table for full-text search
    cursor.execute("""
        CREATE VIRTUAL TABLE IF NOT EXISTS posts_fts USING fts5(
            caption, hashtags, author_handle, transcript, keywords, ai_summary,
            content='posts', content_rowid='id'
        )
    """)

    conn.commit()
    conn.close()
    log.info("Database initialized at %s", DB_PATH)


# ══════════════════════════════════════════════════════════════
# Collection CRUD
# ══════════════════════════════════════════════════════════════

def upsert_collection(
    instagram_id: str,
    name: str,
    slug: str,
    cover_image_path: Optional[str] = None,
) -> int:
    """Insert or update a collection. Returns the collection row ID."""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO collections (instagram_id, name, slug, cover_image_path)
        VALUES (?, ?, ?, ?)
        ON CONFLICT(instagram_id) DO UPDATE SET
            name = excluded.name,
            cover_image_path = COALESCE(excluded.cover_image_path, collections.cover_image_path),
            updated_at = CURRENT_TIMESTAMP
    """, (instagram_id, name, slug, cover_image_path))
    conn.commit()

    # Get the row ID
    cursor.execute("SELECT id FROM collections WHERE instagram_id = ?", (instagram_id,))
    row = cursor.fetchone()
    collection_id = row["id"]
    conn.close()
    return collection_id


def update_collection_post_count(collection_id: int) -> None:
    """Recalculate and update the post count for a collection."""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        UPDATE collections SET post_count = (
            SELECT COUNT(*) FROM post_collections WHERE collection_id = ?
        ), updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
    """, (collection_id, collection_id))
    conn.commit()
    conn.close()


def update_collection_summary(collection_id: int, summary: str, top_tags: list[str]) -> None:
    """Update AI-generated summary and top tags for a collection."""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        UPDATE collections
        SET summary = ?, top_tags = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
    """, (summary, json.dumps(top_tags), collection_id))
    conn.commit()
    conn.close()


def get_all_collections() -> list[dict]:
    """Fetch all collections."""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM collections ORDER BY name")
    rows = [dict(r) for r in cursor.fetchall()]
    conn.close()
    return rows


def get_collection_by_slug(slug: str) -> Optional[dict]:
    """Fetch a single collection by slug."""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM collections WHERE slug = ?", (slug,))
    row = cursor.fetchone()
    conn.close()
    return dict(row) if row else None


# ══════════════════════════════════════════════════════════════
# Post CRUD
# ══════════════════════════════════════════════════════════════

def post_exists(instagram_post_id: str) -> bool:
    """Check if a post has already been scraped."""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute(
        "SELECT 1 FROM posts WHERE instagram_post_id = ? AND scrape_status = 'complete'",
        (instagram_post_id,),
    )
    exists = cursor.fetchone() is not None
    conn.close()
    return exists


def get_post_id_by_instagram_id(instagram_post_id: str) -> Optional[int]:
    """Get internal post ID from Instagram post ID."""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT id FROM posts WHERE instagram_post_id = ?", (instagram_post_id,))
    row = cursor.fetchone()
    conn.close()
    return row["id"] if row else None


def upsert_post(data: dict[str, Any]) -> int:
    """
    Insert or update a post. Returns the post row ID.
    `data` should include all post fields as keys.
    """
    conn = get_connection()
    cursor = conn.cursor()

    # Serialize lists to JSON
    for field in ["hashtags", "media_urls", "keywords", "duplicate_in"]:
        if field in data and isinstance(data[field], list):
            data[field] = json.dumps(data[field])

    cursor.execute("""
        INSERT INTO posts (
            instagram_post_id, media_type, caption, hashtags,
            author_handle, author_name, permalink,
            date_posted, date_saved, like_count, comment_count,
            location, alt_text, media_urls, thumbnail_url, video_url,
            transcript, transcript_source, scrape_status, error_message
        ) VALUES (
            :instagram_post_id, :media_type, :caption, :hashtags,
            :author_handle, :author_name, :permalink,
            :date_posted, :date_saved, :like_count, :comment_count,
            :location, :alt_text, :media_urls, :thumbnail_url, :video_url,
            :transcript, :transcript_source, :scrape_status, :error_message
        )
        ON CONFLICT(instagram_post_id) DO UPDATE SET
            media_type = excluded.media_type,
            caption = COALESCE(excluded.caption, posts.caption),
            hashtags = COALESCE(excluded.hashtags, posts.hashtags),
            author_handle = COALESCE(excluded.author_handle, posts.author_handle),
            author_name = COALESCE(excluded.author_name, posts.author_name),
            permalink = COALESCE(excluded.permalink, posts.permalink),
            date_posted = COALESCE(excluded.date_posted, posts.date_posted),
            like_count = COALESCE(excluded.like_count, posts.like_count),
            comment_count = COALESCE(excluded.comment_count, posts.comment_count),
            location = COALESCE(excluded.location, posts.location),
            alt_text = COALESCE(excluded.alt_text, posts.alt_text),
            media_urls = COALESCE(excluded.media_urls, posts.media_urls),
            thumbnail_url = COALESCE(excluded.thumbnail_url, posts.thumbnail_url),
            video_url = COALESCE(excluded.video_url, posts.video_url),
            transcript = COALESCE(excluded.transcript, posts.transcript),
            transcript_source = COALESCE(excluded.transcript_source, posts.transcript_source),
            scrape_status = excluded.scrape_status,
            error_message = excluded.error_message,
            updated_at = CURRENT_TIMESTAMP
    """, data)
    conn.commit()

    cursor.execute("SELECT id FROM posts WHERE instagram_post_id = ?", (data["instagram_post_id"],))
    row = cursor.fetchone()
    post_id = row["id"]
    conn.close()
    return post_id


def link_post_to_collection(post_id: int, collection_id: int) -> None:
    """Create mapping between a post and a collection."""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        INSERT OR IGNORE INTO post_collections (post_id, collection_id)
        VALUES (?, ?)
    """, (post_id, collection_id))
    conn.commit()
    conn.close()


def mark_post_failed(instagram_post_id: str, error: str) -> None:
    """Mark a post as failed with error message."""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO posts (instagram_post_id, media_type, scrape_status, error_message)
        VALUES (?, 'unknown', 'failed', ?)
        ON CONFLICT(instagram_post_id) DO UPDATE SET
            scrape_status = 'failed',
            error_message = excluded.error_message,
            updated_at = CURRENT_TIMESTAMP
    """, (instagram_post_id, error))
    conn.commit()
    conn.close()


def get_posts_by_collection(collection_id: int) -> list[dict]:
    """Fetch all posts for a collection."""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT p.* FROM posts p
        JOIN post_collections pc ON p.id = pc.post_id
        WHERE pc.collection_id = ?
        ORDER BY p.date_posted DESC
    """, (collection_id,))
    rows = [dict(r) for r in cursor.fetchall()]
    conn.close()
    return rows


def get_unenriched_posts() -> list[dict]:
    """Fetch all posts needing enrichment."""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT * FROM posts
        WHERE scrape_status = 'complete' AND enrichment_status = 'pending'
        ORDER BY id
    """)
    rows = [dict(r) for r in cursor.fetchall()]
    conn.close()
    return rows


def update_enrichment(post_id: int, data: dict[str, Any]) -> None:
    """Update enrichment fields on a post."""
    conn = get_connection()
    cursor = conn.cursor()

    if "keywords" in data and isinstance(data["keywords"], list):
        data["keywords"] = json.dumps(data["keywords"])

    cursor.execute("""
        UPDATE posts SET
            category = ?,
            keywords = ?,
            mood = ?,
            ai_summary = ?,
            enrichment_status = 'complete',
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
    """, (
        data.get("category"),
        data.get("keywords"),
        data.get("mood"),
        data.get("ai_summary"),
        post_id,
    ))
    conn.commit()
    conn.close()


def detect_duplicates() -> None:
    """Find posts saved in multiple collections and flag them."""
    conn = get_connection()
    cursor = conn.cursor()

    # Find posts in more than one collection
    cursor.execute("""
        SELECT post_id, GROUP_CONCAT(collection_id) as collection_ids
        FROM post_collections
        GROUP BY post_id
        HAVING COUNT(collection_id) > 1
    """)
    duplicates = cursor.fetchall()

    for dup in duplicates:
        collection_ids = dup["collection_ids"].split(",")
        cursor.execute("""
            UPDATE posts SET
                is_duplicate = 1,
                duplicate_in = ?,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        """, (json.dumps(collection_ids), dup["post_id"]))

    conn.commit()
    conn.close()
    if duplicates:
        log.info("Flagged %d posts as duplicates (saved in multiple collections)", len(duplicates))


def rebuild_fts() -> None:
    """Rebuild the full-text search index."""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM posts_fts")
    cursor.execute("""
        INSERT INTO posts_fts (rowid, caption, hashtags, author_handle, transcript, keywords, ai_summary)
        SELECT id, caption, hashtags, author_handle, transcript, keywords, ai_summary
        FROM posts
        WHERE scrape_status = 'complete'
    """)
    conn.commit()
    conn.close()
    log.info("FTS index rebuilt")


def get_db_stats() -> dict:
    """Return summary statistics of the database."""
    conn = get_connection()
    cursor = conn.cursor()

    stats: dict[str, Any] = {}
    cursor.execute("SELECT COUNT(*) as n FROM collections")
    stats["collections"] = cursor.fetchone()["n"]

    cursor.execute("SELECT COUNT(*) as n FROM posts WHERE scrape_status = 'complete'")
    stats["total_posts"] = cursor.fetchone()["n"]

    cursor.execute("SELECT COUNT(*) as n FROM posts WHERE media_type = 'image' AND scrape_status = 'complete'")
    stats["images"] = cursor.fetchone()["n"]

    cursor.execute("SELECT COUNT(*) as n FROM posts WHERE media_type = 'carousel' AND scrape_status = 'complete'")
    stats["carousels"] = cursor.fetchone()["n"]

    cursor.execute("SELECT COUNT(*) as n FROM posts WHERE media_type IN ('video', 'reel') AND scrape_status = 'complete'")
    stats["videos"] = cursor.fetchone()["n"]

    cursor.execute("SELECT COUNT(*) as n FROM posts WHERE transcript IS NOT NULL AND transcript != ''")
    stats["transcripts"] = cursor.fetchone()["n"]

    cursor.execute("SELECT COUNT(*) as n FROM posts WHERE enrichment_status = 'complete'")
    stats["enriched"] = cursor.fetchone()["n"]

    cursor.execute("SELECT COUNT(*) as n FROM posts WHERE scrape_status = 'failed'")
    stats["failed"] = cursor.fetchone()["n"]

    cursor.execute("SELECT COUNT(*) as n FROM posts WHERE is_duplicate = 1")
    stats["duplicates"] = cursor.fetchone()["n"]

    conn.close()
    return stats
