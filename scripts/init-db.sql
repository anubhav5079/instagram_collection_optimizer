-- ═════════════════════════════════════════════════════════════
-- Instagram Saved Collections — Database Schema
-- ═════════════════════════════════════════════════════════════

-- Collections table
CREATE TABLE IF NOT EXISTS collections (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  instagram_id TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  cover_image_path TEXT,
  post_count INTEGER DEFAULT 0,
  summary TEXT,
  top_tags TEXT DEFAULT '[]', -- JSON array
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Posts table
CREATE TABLE IF NOT EXISTS posts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  instagram_post_id TEXT NOT NULL UNIQUE,
  media_type TEXT NOT NULL DEFAULT 'image', -- 'image', 'carousel', 'video', 'reel'
  caption TEXT,
  hashtags TEXT DEFAULT '[]', -- JSON array
  author_handle TEXT,
  author_name TEXT,
  permalink TEXT,
  date_posted TEXT,
  date_saved TEXT,
  like_count INTEGER,
  comment_count INTEGER,
  location TEXT,
  alt_text TEXT,
  media_urls TEXT DEFAULT '[]', -- JSON array
  thumbnail_url TEXT,
  video_url TEXT,
  transcript TEXT,
  transcript_source TEXT, -- 'whisper', 'vision', 'none'
  category TEXT,
  keywords TEXT DEFAULT '[]', -- JSON array
  mood TEXT,
  ai_summary TEXT,
  is_duplicate BOOLEAN DEFAULT 0,
  duplicate_in TEXT DEFAULT '[]', -- JSON array
  scrape_status TEXT DEFAULT 'pending', -- 'pending', 'complete', 'failed'
  enrichment_status TEXT DEFAULT 'pending', -- 'pending', 'complete', 'skipped'
  error_message TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Post-Collection junction table (many-to-many)
CREATE TABLE IF NOT EXISTS post_collections (
  post_id INTEGER NOT NULL,
  collection_id INTEGER NOT NULL,
  added_at TEXT DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (post_id, collection_id),
  FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
  FOREIGN KEY (collection_id) REFERENCES collections(id) ON DELETE CASCADE
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_posts_author ON posts(author_handle);
CREATE INDEX IF NOT EXISTS idx_posts_category ON posts(category);
CREATE INDEX IF NOT EXISTS idx_posts_mood ON posts(mood);
CREATE INDEX IF NOT EXISTS idx_posts_scrape_status ON posts(scrape_status);
CREATE INDEX IF NOT EXISTS idx_collections_slug ON collections(slug);
CREATE INDEX IF NOT EXISTS idx_post_collections_collection ON post_collections(collection_id);
