# Instagram Saved Collections — Personal Website

Build an end-to-end system that scrapes Instagram saved collections, processes media with AI, and surfaces everything as a beautiful personal website.

---

## User Review Required

> [!CAUTION]
> **Instagram ToS Warning**: Scraping Instagram violates their Terms of Service. This tool is for **personal use only** — never distribute, commercialize, or use against other users' accounts. Your account may be temporarily or permanently banned.

> [!IMPORTANT]
> **Architectural Change — Database Strategy**: Research reveals that `better-sqlite3` **cannot write at runtime on Vercel** (ephemeral serverless functions). Two viable approaches:
> 
> **Option A (Recommended): Full Static Export** — SQLite is read at `next build` time only. The scraper commits the updated DB + media to the repo, then triggers a Vercel rebuild. Pages are pure static HTML served from CDN. No ISR, but a deploy hook gives "near-live" updates.
> 
> **Option B: Turso (remote SQLite)** — Use Turso's free tier (9GB storage, 500M row reads/month) as a serverless-compatible SQLite replacement. Enables true ISR with on-demand revalidation. Slightly more complexity, but zero cost.
> 
> **I recommend Option A** — it keeps the $0 cost promise, requires no external database service, and the static approach is perfectly suited for a personal bookmarks site that updates via cron.

> [!IMPORTANT]
> **Scraping Agent Language**: The spec requests TypeScript throughout, but Instagram scraping is far more reliable with Python's `instagrapi` library (mature, actively maintained, handles auth challenges, 2FA, rate limiting). I recommend:
> - **Scraping agent + Whisper transcription + Ollama enrichment**: Python
> - **Website**: TypeScript / Next.js
> 
> This hybrid approach gives us the best tools for each job. The Python agent outputs to SQLite + filesystem, which the Next.js build consumes.

> [!WARNING]
> **Session Cookie Authentication**: The scraper uses your Instagram `sessionid` cookie. This is sensitive — equivalent to your login credentials. It is stored in `.env` (gitignored) and never logged or transmitted. Instructions for safe extraction are included in the README.

---

## Proposed Changes

### Project Structure

```
instagram-saved-site/
├── agent/                          # Python scraping + enrichment agent
│   ├── __init__.py
│   ├── scraper.py                  # Instagram API scraper (instagrapi)
│   ├── media_handler.py            # Image download + video processing
│   ├── transcriber.py              # Whisper audio transcription
│   ├── enrichment.py               # Ollama-based AI enrichment
│   ├── database.py                 # SQLite schema + CRUD operations
│   ├── config.py                   # Configuration + env loading
│   ├── logger.py                   # Structured logging
│   ├── main.py                     # CLI entry point
│   └── requirements.txt            # Python dependencies
├── web/                            # Next.js website
│   ├── src/
│   │   ├── app/
│   │   │   ├── layout.tsx          # Root layout + theme provider
│   │   │   ├── page.tsx            # Home / Dashboard
│   │   │   ├── collections/
│   │   │   │   └── [slug]/
│   │   │   │       └── page.tsx    # Collection detail page
│   │   │   ├── post/
│   │   │   │   └── [id]/
│   │   │   │       └── page.tsx    # Post detail page
│   │   │   ├── search/
│   │   │   │   └── page.tsx        # Full-text search
│   │   │   ├── insights/
│   │   │   │   └── page.tsx        # Analytics / insights dashboard
│   │   │   └── tags/
│   │   │       └── page.tsx        # Tag cloud browser
│   │   ├── components/
│   │   │   ├── Header.tsx
│   │   │   ├── Footer.tsx
│   │   │   ├── ThemeToggle.tsx
│   │   │   ├── CollectionCard.tsx
│   │   │   ├── PostCard.tsx
│   │   │   ├── MasonryGrid.tsx
│   │   │   ├── SearchBar.tsx
│   │   │   ├── TagCloud.tsx
│   │   │   ├── FilterBar.tsx
│   │   │   ├── MoodBadge.tsx
│   │   │   ├── InsightChart.tsx
│   │   │   └── ImageDownloadButton.tsx
│   │   ├── lib/
│   │   │   ├── db.ts               # better-sqlite3 wrapper (build-time only)
│   │   │   ├── queries.ts          # All SQL queries
│   │   │   ├── types.ts            # TypeScript types
│   │   │   └── utils.ts            # Helpers (slugify, format dates, etc.)
│   │   └── styles/
│   │       └── globals.css         # Design system + all styles
│   ├── public/
│   │   └── media/
│   │       ├── images/             # Downloaded post images
│   │       └── thumbnails/         # Video/reel thumbnails
│   ├── data/
│   │   └── instagram.db            # SQLite database (committed to repo)
│   ├── next.config.js
│   ├── package.json
│   └── tsconfig.json
├── .github/
│   └── workflows/
│       └── sync.yml                # GitHub Actions: scrape → enrich → deploy
├── scripts/
│   └── setup.ps1                   # One-command setup (Windows PowerShell)
├── .env.example                    # Template for environment variables
├── .gitignore
└── README.md
```

---

### Phase 1 — Scraping Agent (Python)

#### [NEW] [requirements.txt](file:///C:/Users/kmran/.gemini/antigravity/scratch/instagram-saved-site/agent/requirements.txt)
Dependencies:
- `instagrapi` — Instagram private API client (handles auth, collections, media)
- `yt-dlp` — Audio extraction from video URLs
- `openai-whisper` — Local speech-to-text (CPU mode)
- `Pillow` — Image processing / thumbnail extraction
- `requests` — HTTP downloads
- `python-dotenv` — Environment variable loading

#### [NEW] [config.py](file:///C:/Users/kmran/.gemini/antigravity/scratch/instagram-saved-site/agent/config.py)
- Load `INSTAGRAM_SESSION_ID`, `INSTAGRAM_USERNAME` from `.env`
- Define paths: `MEDIA_IMAGES_DIR`, `MEDIA_THUMBNAILS_DIR`, `DB_PATH`
- Rate limiting config: `MIN_DELAY=2s`, `MAX_DELAY=10s`, `MAX_RETRIES=5`

#### [NEW] [database.py](file:///C:/Users/kmran/.gemini/antigravity/scratch/instagram-saved-site/agent/database.py)
SQLite schema (see full schema below). CRUD operations:
- `upsert_collection()`, `upsert_post()`, `post_exists()`, `mark_post_failed()`
- `get_unenriched_posts()`, `update_enrichment()`
- `get_all_collections()`, `get_posts_by_collection()`

#### [NEW] [scraper.py](file:///C:/Users/kmran/.gemini/antigravity/scratch/instagram-saved-site/agent/scraper.py)
Core scraping logic:
1. Initialize `instagrapi.Client` with session cookie (login via `sessionid`)
2. `get_collections()` → paginate through all saved collections
3. For each collection: `get_collection_medias(collection_id)` → paginate all posts
4. For each post, extract: media type, caption, hashtags, author, permalink, timestamps, engagement metrics, location, alt text
5. Check `post_exists()` before processing (incremental scraping)
6. Route to `media_handler` based on media type
7. Exponential backoff on rate limit (429) responses
8. Comprehensive error handling: private accounts, deleted posts, expired media

#### [NEW] [media_handler.py](file:///C:/Users/kmran/.gemini/antigravity/scratch/instagram-saved-site/agent/media_handler.py)
Media routing logic:
- **Image / Carousel**: Download all images to `/web/public/media/images/{post_id}_{index}.jpg`, store relative paths
- **Video / Reel**: 
  1. Download thumbnail to `/web/public/media/thumbnails/{post_id}_thumb.jpg`
  2. Extract audio via `yt-dlp --extract-audio --audio-format wav`
  3. Pass to `transcriber.py`
  4. Delete temp audio file after transcription
  5. If no audio/transcription fails → generate scene description from thumbnail via Ollama vision

#### [NEW] [transcriber.py](file:///C:/Users/kmran/.gemini/antigravity/scratch/instagram-saved-site/agent/transcriber.py)
- Load Whisper `base` model (good accuracy/speed trade-off on CPU)
- `transcribe(audio_path)` → returns text or `None` if no speech detected
- Handles: empty audio, corrupt files, timeout after 5 minutes per file
- Model loaded once and reused across all transcriptions

#### [NEW] [enrichment.py](file:///C:/Users/kmran/.gemini/antigravity/scratch/instagram-saved-site/agent/enrichment.py)
AI enrichment pipeline (runs after scraping):
1. **Auto-categorization**: Send caption + hashtags + transcript to Ollama (`llama3.2`), classify into themes (Travel, Food, Design, Tech, Art, Fashion, Fitness, etc.)
2. **Keyword extraction**: Top 5 keywords per post, aggregated per collection and globally
3. **Mood/tone tagging**: Aesthetic tags (minimal, cozy, vibrant, editorial, bold, moody, playful)
4. **Deduplication**: Detect posts saved in multiple collections via `instagram_post_id`, flag in DB
5. **Summary generation**: One-line AI summary per post, one paragraph per collection
6. All results stored back into SQLite

#### [NEW] [main.py](file:///C:/Users/kmran/.gemini/antigravity/scratch/instagram-saved-site/agent/main.py)
CLI entry point:
- `python main.py scrape` — Run scraper only
- `python main.py enrich` — Run enrichment only  
- `python main.py sync` — Scrape + enrich (for automation)
- `python main.py stats` — Print summary of DB contents
- Progress bars, colored console output, final summary

#### [NEW] [logger.py](file:///C:/Users/kmran/.gemini/antigravity/scratch/instagram-saved-site/agent/logger.py)
- Structured logging to console + `agent/logs/scrape.log`
- Log levels: INFO (successes), WARNING (skips, rate limits), ERROR (failures)
- Timestamped entries with post IDs for traceability

---

### Phase 2 — SQLite Schema

```sql
-- Collections
CREATE TABLE collections (
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,
    instagram_id        TEXT UNIQUE NOT NULL,
    name                TEXT NOT NULL,
    slug                TEXT UNIQUE NOT NULL,
    cover_image_path    TEXT,
    post_count          INTEGER DEFAULT 0,
    summary             TEXT,                    -- AI-generated paragraph summary
    top_tags            TEXT,                    -- JSON array of top tags
    created_at          DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at          DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Posts
CREATE TABLE posts (
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,
    instagram_post_id   TEXT UNIQUE NOT NULL,
    collection_id       INTEGER NOT NULL,
    media_type          TEXT NOT NULL,            -- 'image', 'carousel', 'video', 'reel'
    caption             TEXT,
    hashtags            TEXT,                    -- JSON array
    author_handle       TEXT,
    author_name         TEXT,
    permalink           TEXT,
    date_posted         DATETIME,
    date_saved          DATETIME,
    like_count          INTEGER,
    comment_count       INTEGER,
    location            TEXT,
    alt_text            TEXT,
    -- Media paths (relative to /public/)
    media_paths         TEXT,                    -- JSON array of image paths
    thumbnail_path      TEXT,                    -- For video/reel posts
    -- Video-specific
    transcript          TEXT,                    -- Whisper transcription or scene description
    transcript_source   TEXT,                    -- 'whisper', 'vision', 'none'
    -- Enrichment
    category            TEXT,                    -- AI auto-category
    keywords            TEXT,                    -- JSON array
    mood                TEXT,                    -- Aesthetic mood tag
    ai_summary          TEXT,                    -- One-line AI summary
    is_duplicate        BOOLEAN DEFAULT 0,       -- Saved in multiple collections
    duplicate_in        TEXT,                    -- JSON array of other collection IDs
    -- Status
    scrape_status       TEXT DEFAULT 'pending',  -- 'pending', 'complete', 'failed'
    enrichment_status   TEXT DEFAULT 'pending',  -- 'pending', 'complete', 'failed'
    error_message       TEXT,
    created_at          DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at          DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (collection_id) REFERENCES collections(id)
);

-- Post-Collection many-to-many (for deduplication tracking)
CREATE TABLE post_collections (
    post_id             INTEGER NOT NULL,
    collection_id       INTEGER NOT NULL,
    PRIMARY KEY (post_id, collection_id),
    FOREIGN KEY (post_id) REFERENCES posts(id),
    FOREIGN KEY (collection_id) REFERENCES collections(id)
);

-- Full-text search virtual table
CREATE VIRTUAL TABLE posts_fts USING fts5(
    caption, hashtags, author_handle, transcript, keywords, ai_summary,
    content='posts', content_rowid='id'
);

-- Indexes
CREATE INDEX idx_posts_collection ON posts(collection_id);
CREATE INDEX idx_posts_media_type ON posts(media_type);
CREATE INDEX idx_posts_category ON posts(category);
CREATE INDEX idx_posts_mood ON posts(mood);
CREATE INDEX idx_posts_author ON posts(author_handle);
CREATE INDEX idx_posts_scrape_status ON posts(scrape_status);
CREATE INDEX idx_posts_enrichment_status ON posts(enrichment_status);
```

---

### Phase 3 — Next.js Website

#### Technology Choices
- **Framework**: Next.js 14+ with App Router
- **Build**: Static Export (`output: 'export'` in `next.config.js`)
- **Database**: `better-sqlite3` — read at build time only via `generateStaticParams` + page-level data fetching
- **Styling**: Vanilla CSS with CSS custom properties (design tokens)
- **Fonts**: Inter (body) + Space Grotesk (headings) from Google Fonts
- **Icons**: Lucide React (tree-shakeable)
- **Dark/Light mode**: CSS custom properties toggled via `data-theme` attribute

#### Design System

Color palette (dark mode primary):
- Background: `hsl(225, 15%, 8%)` → `hsl(225, 15%, 12%)`
- Surface: `hsl(225, 15%, 14%)` with glassmorphism (`backdrop-filter: blur`)
- Accent: `hsl(265, 80%, 65%)` (vibrant purple) with gradient to `hsl(200, 80%, 60%)` (electric blue)
- Text: `hsl(225, 10%, 90%)` / `hsl(225, 10%, 60%)`
- Success/Warning/Error semantic colors

Light mode:
- Background: `hsl(225, 20%, 97%)` → `hsl(225, 15%, 94%)`
- Surface: `hsl(0, 0%, 100%)` with subtle shadow
- Accent: same purple-blue gradient
- Text: `hsl(225, 20%, 15%)` / `hsl(225, 10%, 45%)`

Micro-animations:
- Card hover: `transform: translateY(-4px)` + shadow expansion
- Page transitions: fade-in on mount
- Staggered grid load animations
- Smooth theme toggle with `transition: all 0.3s`
- Tag/filter pill hover glow effect

#### [NEW] [globals.css](file:///C:/Users/kmran/.gemini/antigravity/scratch/instagram-saved-site/web/src/styles/globals.css)
Complete design system with:
- CSS custom properties for all tokens (colors, spacing, radii, shadows, typography)
- Dark/light theme definitions
- Base reset + typography
- Layout utilities (container, grid, masonry)
- Component styles (cards, badges, buttons, inputs, pills)
- Animation keyframes (fadeIn, slideUp, stagger, shimmer, glow)
- Responsive breakpoints

#### [NEW] [layout.tsx](file:///C:/Users/kmran/.gemini/antigravity/scratch/instagram-saved-site/web/src/app/layout.tsx)
- Google Fonts import (Inter + Space Grotesk)
- ThemeProvider wrapping `<html>` with `data-theme`
- Header with navigation + search + theme toggle
- Footer with stats summary
- Meta tags for SEO

#### [NEW] [page.tsx](file:///C:/Users/kmran/.gemini/antigravity/scratch/instagram-saved-site/web/src/app/page.tsx) (Home / Dashboard)
- Hero section with total stats (collections, posts, images, transcripts)
- Collection grid: each card shows cover image, name, post count, top 3 tags, mood indicator
- Quick filters: by category, by mood
- Recent additions carousel
- All data fetched at build time from SQLite

#### [NEW] [collections/[slug]/page.tsx](file:///C:/Users/kmran/.gemini/antigravity/scratch/instagram-saved-site/web/src/app/collections/[slug]/page.tsx)
- Collection header: name, AI summary, stats
- Masonry grid of posts (responsive: 1/2/3/4 columns)
- Filter bar: by post type (image/video/reel), mood, keyword
- Each post card: image/thumbnail preview, author, caption snippet, mood badge
- `generateStaticParams` → all collection slugs from DB

#### [NEW] [post/[id]/page.tsx](file:///C:/Users/kmran/.gemini/antigravity/scratch/instagram-saved-site/web/src/app/post/[id]/page.tsx)
- **Image posts**: Full-size image with `next/image`, download button (anchor with `download` attr), caption, tags, AI summary, link to original
- **Video/Reel posts**: Thumbnail image, transcript/description as formatted text below, tags, AI summary, link to original Instagram post
- Sidebar: author info, engagement stats, category, mood, keywords
- "Also in collections" section (for duplicates)
- `generateStaticParams` → all post IDs from DB

#### [NEW] [search/page.tsx](file:///C:/Users/kmran/.gemini/antigravity/scratch/instagram-saved-site/web/src/app/search/page.tsx)
- Client-side full-text search powered by a pre-built search index (JSON file generated at build time from FTS5 data)
- Search across: captions, transcripts, tags, authors, collection names
- Results displayed as post cards with highlighted matches
- Filter results by type, mood, category

#### [NEW] [insights/page.tsx](file:///C:/Users/kmran/.gemini/antigravity/scratch/instagram-saved-site/web/src/app/insights/page.tsx)
- CSS-only charts (no charting library needed for simple bar/pie):
  - Top hashtags (horizontal bar chart)
  - Most-saved authors (ranked list)
  - Post type breakdown (donut chart via conic-gradient)
  - Mood distribution (pie chart)
  - Timeline of saves (if date_saved available)
- All data pre-computed at build time

#### [NEW] [tags/page.tsx](file:///C:/Users/kmran/.gemini/antigravity/scratch/instagram-saved-site/web/src/app/tags/page.tsx)
- Interactive tag cloud (font size proportional to count)
- Click any tag → filtered post list
- Categories section with post counts
- Mood browser with visual mood cards

#### Key Components

| Component | Purpose |
|-----------|---------|
| `Header` | Nav links, search trigger, theme toggle, glassmorphism effect |
| `CollectionCard` | Cover image, name, count, tags, mood — with hover animation |
| `PostCard` | Thumbnail, type badge, caption snippet, author — masonry-ready |
| `MasonryGrid` | CSS columns masonry layout, responsive |
| `SearchBar` | Expandable search input with instant results |
| `FilterBar` | Type/mood/category pills with active state |
| `TagCloud` | Weighted tag display |
| `MoodBadge` | Colored pill with mood icon |
| `ImageDownloadButton` | Anchor button with download attribute |
| `ThemeToggle` | Animated sun/moon toggle |
| `InsightChart` | CSS-only chart component (bar, donut, timeline) |

---

### Phase 4 — Automation & Deployment

#### [NEW] [.github/workflows/sync.yml](file:///C:/Users/kmran/.gemini/antigravity/scratch/instagram-saved-site/.github/workflows/sync.yml)
```yaml
name: Sync Instagram Saves
on:
  schedule:
    - cron: '0 6 * * 1,4'  # Mon & Thu at 6 AM UTC
  workflow_dispatch: {}      # Manual trigger

jobs:
  sync:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: '3.11'
      - name: Install Python deps
        run: pip install -r agent/requirements.txt
      - name: Run scraper + enrichment
        env:
          INSTAGRAM_SESSION_ID: ${{ secrets.INSTAGRAM_SESSION_ID }}
          INSTAGRAM_USERNAME: ${{ secrets.INSTAGRAM_USERNAME }}
        run: python agent/main.py sync
      - name: Commit changes
        run: |
          git config user.name "Instagram Sync Bot"
          git config user.email "bot@users.noreply.github.com"
          git add web/public/media/ web/data/instagram.db
          git diff --cached --quiet || git commit -m "sync: update saved collections"
          git push
      - name: Trigger Vercel deploy
        run: curl -X POST "${{ secrets.VERCEL_DEPLOY_HOOK }}"
```

#### [NEW] [scripts/setup.ps1](file:///C:/Users/kmran/.gemini/antigravity/scratch/instagram-saved-site/scripts/setup.ps1)
PowerShell setup script:
1. Check prerequisites (Python 3.11+, Node.js 18+, Ollama)
2. Create `.env` from `.env.example`, prompt for session ID
3. `pip install -r agent/requirements.txt`
4. `cd web && npm install`
5. Download Whisper model (`whisper` will auto-download on first run)
6. Pull Ollama model: `ollama pull llama3.2`
7. Run initial scrape: `python agent/main.py sync`
8. Build site: `cd web && npm run build`
9. Launch dev server: `npm run dev`

---

### Phase 5 — Environment & Config

#### [NEW] [.env.example](file:///C:/Users/kmran/.gemini/antigravity/scratch/instagram-saved-site/.env.example)
```bash
# Instagram Auth (REQUIRED)
INSTAGRAM_SESSION_ID=your_session_id_here
INSTAGRAM_USERNAME=your_username_here

# Ollama (optional — defaults to localhost:11434)
OLLAMA_HOST=http://localhost:11434
OLLAMA_MODEL=llama3.2

# Whisper
WHISPER_MODEL=base  # tiny, base, small, medium

# Vercel Deploy Hook (for automation)
VERCEL_DEPLOY_HOOK=https://api.vercel.com/v1/integrations/deploy/...
```

#### [NEW] [.gitignore](file:///C:/Users/kmran/.gemini/antigravity/scratch/instagram-saved-site/.gitignore)
```
.env
node_modules/
agent/__pycache__/
agent/logs/
agent/temp/
.next/
out/
```

---

## Open Questions

> [!IMPORTANT]
> **1. Database Strategy**: Do you prefer **Option A (Full Static Export)** or **Option B (Turso remote SQLite)**? I recommend Option A for simplicity and zero cost.

> [!IMPORTANT]
> **2. Python + TypeScript Hybrid**: Are you okay with the scraping agent being in Python (using `instagrapi`) while the website is in TypeScript/Next.js? The alternative is a pure TypeScript agent using raw HTTP requests to Instagram's private API, which is significantly more fragile and harder to maintain.

> [!IMPORTANT]
> **3. Ollama Dependency**: The enrichment pipeline requires Ollama running locally with a ~4GB model. For the GitHub Actions automation, Ollama won't be available — should we:
> - **(a)** Skip enrichment in CI and only enrich locally (recommended — keeps CI fast and free)
> - **(b)** Use a small cloud API (e.g., Groq free tier) for enrichment in CI
> - **(c)** Ship a pre-enriched DB and only enrich new posts locally before pushing

> [!NOTE]
> **4. Whisper in CI**: Similarly, Whisper requires ~1.5GB RAM and significant CPU time. For GitHub Actions, we could:
> - **(a)** Run Whisper in CI (works but slow — each video ~30-60s on free tier runners)
> - **(b)** Only transcribe locally, push results to repo (recommended)

> [!NOTE]
> **5. Search Implementation**: For static export, client-side search needs a pre-built index. Options:
> - **(a)** Build a JSON search index at build time, use `Fuse.js` on the client (simple, no dependencies)
> - **(b)** Use `pagefind` (Rust-based, generates a compact search index at build time — excellent UX)
> - I recommend **(b) Pagefind** — it's lightweight, fast, and designed for static sites.

---

## Verification Plan

### Automated Tests
1. **Agent tests**: Run scraper in dry-run mode against mock data to verify parsing logic
2. **Database tests**: Verify schema creation, CRUD operations, FTS5 queries
3. **Build test**: `npm run build` in `/web` — must complete without errors
4. **Type check**: `npx tsc --noEmit` — zero TypeScript errors
5. **Lint**: `npx next lint` — zero warnings

### Manual Verification
1. Run agent against a test account with ~5 saved collections
2. Verify images downloaded to correct paths
3. Verify video transcription produces text output
4. Verify enrichment tags are reasonable
5. Open dev server and verify:
   - All collections display with correct covers
   - Masonry grid renders properly at all breakpoints
   - Image posts show full-size images with working download buttons
   - Video posts show thumbnail + transcript text
   - Search returns relevant results
   - Dark/light mode toggle works smoothly
   - Insights page shows accurate charts
6. Test static export deploys to Vercel successfully
