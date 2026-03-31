# Instagram Saved Site — HLD + LLD & Improvement Plan

---

## 🔷 PART 1: High-Level Design (HLD)

### System Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        YOUR MACHINE (Local)                       │
│                                                                   │
│  ┌────────────────────┐      ┌─────────────────────────────────┐ │
│  │   agent/ (Python)  │      │   Ollama (localhost:11434)      │ │
│  │                    │      │   model: llama3.2               │ │
│  │  scraper.py ───────┼─────▶│   AI enrichment (offline)       │ │
│  │  enrichment.py ────┼─────▶└─────────────────────────────────┘ │
│  │  transcriber.py    │      ┌─────────────────────────────────┐ │
│  │  (Whisper local)   │      │   Whisper (local transcription) │ │
│  │  media_handler.py  │      └─────────────────────────────────┘ │
│  └────────┬───────────┘                                          │
│           │ writes                                               │
│           ▼                                                      │
│  ┌────────────────────┐      ┌────────────────────────────────┐ │
│  │  web/data/          │      │  web/public/media/             │ │
│  │  instagram.db      │      │  images/  thumbnails/          │ │
│  │  (SQLite)          │      │  (downloaded media files)      │ │
│  └────────────────────┘      └────────────────────────────────┘ │
│           │ read-only at build                                   │
│           ▼                                                      │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │            web/ (Next.js 16 — Static Export)             │   │
│  │                                                          │   │
│  │  pages: Home, Collection, Post, Search, Insights, Tags   │   │
│  │  build: npm run build  →  web/out/ (static HTML/JS/CSS)  │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
           │ git push (data + media + out/)
           ▼
┌─────────────────────────────────────────────────────────────────┐
│                           GITHUB                                  │
│                                                                   │
│  .github/workflows/sync.yml                                      │
│    ├── schedule: every Mon + Thu 6 AM UTC                        │
│    ├── python agent/main.py scrape                               │
│    ├── git add web/data/ web/public/media/                       │
│    └── curl VERCEL_DEPLOY_HOOK  ──────────────────────────────┐  │
└───────────────────────────────────────────────────────────────┼──┘
                                                                │
                                                                ▼
                                               ┌───────────────────────┐
                                               │        VERCEL          │
                                               │  npm run build → CDN   │
                                               │  yoursite.vercel.app   │
                                               └───────────────────────┘
```

### Data Flow (Pipeline)

```
Instagram API (instagrapi)
        │
        ▼
   scraper.py          ← authenticates with your SESSION_ID cookie
        │
        ├──▶  Posts metadata → SQLite (posts table)
        ├──▶  Image URLs    → download → web/public/media/images/
        └──▶  Video URLs    → Whisper → transcript → SQLite
                                    └──▶ web/public/media/thumbnails/
        │
        ▼
   enrichment.py       ← reads from SQLite, calls Ollama
        │
        ├──▶  category, mood, keywords, ai_summary → SQLite (posts table)
        └──▶  collection summary, top_tags → SQLite (collections table)
        │
        ▼
   Next.js build        ← reads SQLite at build time (server-side)
        │
        ├──▶  Static HTML pages (one per collection, post, etc.)
        └──▶  JSON search index (embedded in page JS)
```

---

## 🔶 PART 2: How to Get Your Instagram on the Site (Step-by-Step)

### Prerequisites Checklist

| Requirement | Status | Action |
|-------------|--------|--------|
| Python 3.10+ | ❓ | `python --version` |
| pip packages | ❓ | `pip install -r agent/requirements.txt` |
| Ollama installed | ❓ | [ollama.com/download](https://ollama.com/download) |
| llama3.2 model | ❓ | `ollama pull llama3.2` |
| Instagram session cookie | ❓ | See step below |
| `.env` file configured | ❓ | See step below |

---

### Step 1 — Get Your Instagram Session ID

> [!IMPORTANT]
> This is the **most critical step**. No session ID = no scraping.

1. Open Chrome/Firefox and log into [instagram.com](https://instagram.com)
2. Open DevTools → **Application** tab → **Cookies** → `https://www.instagram.com`
3. Find the cookie named `sessionid`
4. Copy its **Value** (it's a long alphanumeric string like `12345678%3AaBcDeFgH...`)

---

### Step 2 — Configure `.env`

Create a file called `.env` in the project root (`instagram-saved-site/.env`):

```env
# Your Instagram credentials
INSTAGRAM_SESSION_ID=paste_your_sessionid_value_here
INSTAGRAM_USERNAME=your_instagram_username

# AI (local Ollama — optional but recommended)
OLLAMA_HOST=http://localhost:11434
OLLAMA_MODEL=llama3.2

# Whisper model size: tiny, base, small, medium, large
WHISPER_MODEL=base

# Vercel deploy hook (fill in after deploying to Vercel)
VERCEL_DEPLOY_HOOK=
```

---

### Step 3 — Install Python Dependencies

```powershell
cd c:\Users\kmran\.gemini\antigravity\scratch\instagram-saved-site
pip install -r agent/requirements.txt
```

---

### Step 4 — Start Ollama (for AI enrichment)

```powershell
# Terminal 1: keep this running in background
ollama serve

# Terminal 2: pull model (one-time)
ollama pull llama3.2
```

> [!NOTE]
> If you skip Ollama, posts will be scraped but won't have AI categories, mood tags, or summaries. The site will still work with raw captions.

---

### Step 5 — Run the Full Pipeline

```powershell
cd c:\Users\kmran\.gemini\antigravity\scratch\instagram-saved-site\agent

# Option A: Full pipeline (scrape → enrich in one go)
python main.py sync

# Option B: Step by step
python main.py scrape    # downloads posts + media
python main.py enrich    # runs AI enrichment
python main.py stats     # verify what was collected
```

> [!WARNING]
> The scraper uses Instagram's private API via `instagrapi`. Rate limiting is built in but Instagram **may temporarily block** your account if you scrape aggressively. The default delays (2–10s) are conservative. For a large archive (100+ posts), run `scrape` and then wait a day before running `enrich`.

---

### Step 6 — Preview Locally

```powershell
cd web
npm run dev
# Open http://localhost:3000
```

The site auto-detects `web/data/instagram.db` — if it exists, your real data shows. No DB = demo mode.

---

### Step 7 — Deploy to Vercel

```powershell
# One-time: install Vercel CLI
npm install -g vercel

# Link project
cd web
vercel

# Deploy production
vercel --prod
```

After deploying:
1. Copy your Vercel deploy hook URL from **Project Settings → Git → Deploy Hooks**
2. Paste it into `.env` as `VERCEL_DEPLOY_HOOK=https://api.vercel.com/v1/integrations/deploy/...`
3. Add it as a **GitHub Secret**: `Settings → Secrets → VERCEL_DEPLOY_HOOK`

---

### Step 8 — Set Up GitHub Actions (Auto-sync)

Add these as **GitHub Secrets** (repository → Settings → Secrets and variables → Actions):

| Secret Name | Value |
|-------------|-------|
| `INSTAGRAM_SESSION_ID` | Your sessionid cookie |
| `INSTAGRAM_USERNAME` | Your Instagram username |
| `VERCEL_DEPLOY_HOOK` | Your Vercel deploy hook URL |

The workflow at `.github/workflows/sync.yml` runs every **Monday and Thursday** automatically.

> [!CAUTION]
> **Session cookies expire!** Instagram sessions last ~90 days. You'll need to refresh `INSTAGRAM_SESSION_ID` in your GitHub Secrets periodically. The workflow will fail with "LoginRequired" when it expires — that's your signal to update it.

---

## 🔴 PART 3: Bugs & Critical Issues Found

### Bug 1 — `_extract_image_urls` is incomplete (scraper.py)

**Location**: `agent/scraper.py` lines 357–377

**Problem**: The `image_versions2` fallback is stubbed out with `pass`. If `thumbnail_url` is not available (some posts don't have it), the image URL is silently lost and `media_paths` will be empty.

```python
# CURRENT — incomplete:
elif hasattr(resource, "image_versions2"):
    pass  # ← BUG: never extracts from image_versions2
```

**Fix needed**: Parse `image_versions2.candidates[0].url` for highest-res image.

---

### Bug 2 — GitHub Actions won't work out-of-the-box (sync.yml)

**Problem**: The workflow runs `python agent/main.py scrape` but doesn't install `ffmpeg` (required by Whisper for video transcription) or set up the `better-sqlite3` native module. The `enrich` step is missing entirely from CI (it requires Ollama which can't run in GitHub Actions for free).

**Fix**: The workflow needs `apt-get install ffmpeg` for video support. Enrichment must remain local-only.

---

### Bug 3 — Session ID format issue (scraper.py)

**Problem**: Instagram `sessionid` cookies often contain URL-encoded characters (e.g., `%3A`). The `instagrapi` library expects the raw decoded value. If you paste the raw encoded value, login will fail silently.

**Fix needed**: Decode the session ID in `config.py`:
```python
from urllib.parse import unquote
INSTAGRAM_SESSION_ID = unquote(os.getenv("INSTAGRAM_SESSION_ID", ""))
```

---

### Bug 4 — Collection cover image extraction is incomplete (scraper.py)

**Location**: Lines 165–170

**Problem**: The `image_versions2` fallback for collection cover images is also stubbed with `pass`. Collections without `thumbnail_url` will show gradient placeholders forever, even after scraping.

---

### Bug 5 — `web/data/` directory missing from git (data not committed)

**Problem**: `.gitignore` likely excludes `*.db` files. The GitHub Actions workflow tries to `git add web/data/instagram.db` but if git is configured to ignore `.db` files, the data never gets committed and Vercel always gets demo data.

**Fix**: Verify `.gitignore` doesn't exclude `web/data/instagram.db`. Or add to `.gitignore`:
```gitignore
# Allow the Instagram DB but ignore everything else in data/
!web/data/instagram.db
```

---

## 🟡 PART 4: Improvements (Prioritized)

### Priority 1 — Fix the image extraction bug (Critical for real data)

Fix `_extract_image_urls` to properly handle `image_versions2`:

```python
def _extract_image_urls(self, media: Media) -> list[str]:
    urls: list[str] = []

    def best_url_from_versions(m) -> str | None:
        if hasattr(m, "thumbnail_url") and m.thumbnail_url:
            return str(m.thumbnail_url)
        if hasattr(m, "image_versions2") and m.image_versions2:
            candidates = getattr(m.image_versions2, "candidates", [])
            if candidates:
                return str(candidates[0].url)
        return None

    if hasattr(media, "resources") and media.resources:
        for resource in media.resources:
            url = best_url_from_versions(resource)
            if url:
                urls.append(url)

    if not urls:
        url = best_url_from_versions(media)
        if url:
            urls.append(url)

    return urls
```

---

### Priority 2 — Fix session ID URL decoding (Critical for login)

In `agent/config.py`, add URL decoding:

```python
from urllib.parse import unquote
INSTAGRAM_SESSION_ID: str = unquote(os.getenv("INSTAGRAM_SESSION_ID", ""))
```

---

### Priority 3 — Fix GitHub Actions workflow (Important for automation)

Add `ffmpeg` install and fix the workflow:

```yaml
- name: Install system dependencies
  run: sudo apt-get install -y ffmpeg

- name: Install Python dependencies
  run: pip install -r agent/requirements.txt
```

Also add a `VERCEL_DEPLOY_HOOK` env guard:

```yaml
- name: Trigger Vercel deploy
  if: ${{ secrets.VERCEL_DEPLOY_HOOK != '' }}
```

---

### Priority 4 — Add a `--dry-run` flag to scraper (Quality of Life)

Before running the full scrape, allow previewing what would be scraped:

```powershell
python main.py scrape --dry-run
# Output: "Would scrape 3 collections with ~47 posts"
```

---

### Priority 5 — Add collection page image browsing (UX)

Currently, carousel posts only show the first image. The post detail page should show a lightbox/swiper for multi-image carousel posts.

---

### Priority 6 — Search index is empty in demo mode

`buildSearchIndex()` in `db.ts` returns `[]` when no DB exists — so the search page is completely non-functional in demo mode. Should pre-seed the search index with demo posts.

---

### Priority 7 — Session refresh reminder system

Add logic: if the scraper fails with `LoginRequired`, write a special file `agent/session_expired.flag` and update the README with instructions. Also add a GitHub Actions notification (e.g., open an Issue) when the session expires.

---

### Priority 8 — LLD: Scraper architecture improvements

The current scraper opens and closes a new SQLite connection for every single DB operation. Under large archives (500+ posts) this causes unnecessary overhead.

**Better pattern**: Use a context manager for a single long-lived connection per scrape session:

```python
# database.py — add:
from contextlib import contextmanager

@contextmanager
def get_db_session():
    conn = get_connection()
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()
```

---

### Priority 9 — Better error reporting in UI

When scrape_status is 'failed' for a post, the website silently ignores it. Add an admin-only `/status` page (behind a simple hash check) showing:
- Total posts scraped vs failed
- List of failed post IDs with error messages
- Last sync timestamp

---

### Priority 10 — Progressive image loading

Images loaded via `<img loading="lazy">` cause layout shifts. Use a blur-up placeholder technique:
- At scrape time, generate a tiny 10x10 JPEG placeholder (base64)  
- Store it in the DB as `placeholder_blur`
- In `PostCard`, show the blur placeholder while the real image loads

---

## 🟢 PART 5: LLD — Low-Level Design Improvements

### Current DB Schema Issues

| Column | Issue | Fix |
|--------|-------|-----|
| `hashtags` | Stored as JSON string in TEXT column | Add a separate `hashtags` table with full normalization |
| `keywords` | Same issue | Normalize into `keywords` table |
| `media_paths` | JSON array in TEXT | Add `media_files` table (post_id, url, type, order) |
| No `author_avatar_url` | Author avatars are never fetched | Add column + download logic |
| No `collection_order` | Posts in collection have no explicit order | Add `saved_at` timestamp to `post_collections` |

### Proposed Schema Evolution (for v2)

```sql
-- Normalize media files
CREATE TABLE media_files (
    id          INTEGER PRIMARY KEY,
    post_id     INTEGER REFERENCES posts(id),
    local_path  TEXT NOT NULL,
    type        TEXT CHECK(type IN ('image', 'thumbnail', 'video')),
    width       INTEGER,
    height      INTEGER,
    file_size   INTEGER,
    sort_order  INTEGER DEFAULT 0
);

-- Normalize hashtags
CREATE TABLE hashtags (
    id      INTEGER PRIMARY KEY,
    tag     TEXT UNIQUE NOT NULL
);

CREATE TABLE post_hashtags (
    post_id     INTEGER REFERENCES posts(id),
    hashtag_id  INTEGER REFERENCES hashtags(id),
    PRIMARY KEY (post_id, hashtag_id)
);

-- Track when a post was saved to each collection
ALTER TABLE post_collections
    ADD COLUMN saved_at DATETIME DEFAULT CURRENT_TIMESTAMP;
```

### Module Responsibilities (Clean Architecture)

```
agent/
├── config.py          ← Environment config (pure, no side effects)
├── logger.py          ← Structured logging setup
├── database.py        ← Data access layer (DAL) — all SQL here
├── scraper.py         ← Instagram API client + orchestration
├── media_handler.py   ← File I/O: image/video download
├── transcriber.py     ← Whisper integration (audio → text)
├── enrichment.py      ← Ollama integration (text → tags/summary)
└── main.py            ← CLI entry point (thin — calls the above)
```

**Violations in current code**:
- `scraper.py` directly imports from `media_handler` for cover images (coupling)
- `database.py` calls `ensure_dirs()` on every connection (side effect in DAL)
- No unit tests — every change risks silent breakage

---

## 📋 PART 6: Quick Reference

### Commands You'll Use Most

```powershell
# Run from: instagram-saved-site/

# Local development
cd web && npm run dev              # Start website at localhost:3000

# Scraping (replace with your shell)
cd agent
python main.py scrape             # Fetch posts from Instagram
python main.py enrich             # Add AI tags/summaries (needs Ollama)
python main.py sync               # Both in one go
python main.py stats              # Check what's in the DB

# Build static site
cd web && npm run build           # Generate web/out/ for deployment
```

### Files You'll Touch Most

| File | Purpose |
|------|---------|
| `.env` | Your Instagram credentials (NEVER commit this) |
| `agent/requirements.txt` | Python dependencies |
| `web/src/app/globals.css` | All visual styling |
| `web/src/lib/db.ts` | How the website reads the database |
| `.github/workflows/sync.yml` | Auto-sync schedule |

### Environment Variables Reference

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `INSTAGRAM_SESSION_ID` | ✅ Yes | — | Your Instagram session cookie |
| `INSTAGRAM_USERNAME` | ✅ Yes | — | Your @handle (no @) |
| `OLLAMA_HOST` | No | `http://localhost:11434` | Ollama server URL |
| `OLLAMA_MODEL` | No | `llama3.2` | Which Ollama model to use |
| `WHISPER_MODEL` | No | `base` | `tiny`, `base`, `small`, `medium`, `large` |
| `VERCEL_DEPLOY_HOOK` | No | — | Triggers Vercel deploy after sync |
