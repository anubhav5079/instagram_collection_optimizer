# Quick Start Guide

Your Instagram Saved Collections project is now set up and ready to use!

## ✅ What's Working

- ✓ Python virtual environment created
- ✓ All Python dependencies installed (instagrapi, whisper, yt-dlp, etc.)
- ✓ Node.js dependencies installed
- ✓ Database initialized with schema
- ✓ Scraper successfully authenticated with Instagram
- ✓ **9 posts already scraped** from 1 collection
- ✓ Website builds successfully with real data

## 🎯 Current Status

The scraper has already collected:
- 1 collection ("All posts")
- 9 posts (1 carousel, 8 videos/reels)
- 8 transcripts (videos without audio extraction)

## ⚠️ Optional Improvements

### 1. Install ffmpeg (for video transcription)

Videos are being scraped but audio extraction needs ffmpeg:

**Windows (using Chocolatey):**
```powershell
choco install ffmpeg
```

**Windows (manual):**
1. Download from https://ffmpeg.org/download.html
2. Extract and add to PATH
3. Restart terminal

### 2. Install Ollama (for AI enrichment)

Download from https://ollama.com/download

After installing:
```powershell
ollama serve
ollama pull llama3.2
```

Then run enrichment:
```powershell
.\venv\Scripts\Activate.ps1
python agent/main.py enrich
```

## 🚀 Usage

### Run the scraper (continue collecting more posts)
```powershell
.\venv\Scripts\Activate.ps1
python agent/main.py scrape
```

### View statistics
```powershell
.\venv\Scripts\Activate.ps1
python agent/main.py stats
```

### Build and preview website
```powershell
cd web
npm run build
npm run dev
```

Then open http://localhost:3000

### Full pipeline (scrape + enrich)
```powershell
.\venv\Scripts\Activate.ps1
python agent/main.py sync
```

## 🐛 Bugs Fixed

1. ✅ Image URL extraction from `image_versions2` (was incomplete)
2. ✅ Collection cover image extraction (was incomplete)
3. ✅ Session ID URL decoding (Instagram cookies are URL-encoded)
4. ✅ GitHub Actions ffmpeg installation
5. ✅ .gitignore updated to track database and media files

## 📁 Project Structure

```
instagram-saved-site/
├── agent/                    # Python scraping agent
│   ├── main.py              # CLI entry point
│   ├── scraper.py           # Instagram scraper
│   ├── database.py          # SQLite operations
│   ├── media_handler.py     # Image/video processing
│   ├── transcriber.py       # Whisper transcription
│   ├── enrichment.py        # AI enrichment
│   └── requirements.txt     # Python dependencies
├── web/                     # Next.js website
│   ├── src/app/            # Pages (home, collections, posts, etc.)
│   ├── src/components/     # React components
│   ├── src/lib/            # Database access + utilities
│   ├── data/               # SQLite database
│   └── public/media/       # Downloaded images + thumbnails
├── .env                    # Your credentials (gitignored)
└── venv/                   # Python virtual environment
```

## 🎨 Website Features

- Home dashboard with collection grid
- Collection detail pages with masonry layout
- Post detail pages with full images/transcripts
- Full-text search across all content
- Insights page with charts and analytics
- Tag cloud browser
- Dark/light mode toggle

## 🔄 Next Steps

1. **Optional:** Install ffmpeg for video transcription
2. **Optional:** Install Ollama for AI enrichment
3. Continue scraping: `python agent/main.py scrape`
4. Build website: `cd web && npm run build`
5. Deploy to Vercel (see README.md for instructions)

## 💡 Tips

- The scraper is incremental — it won't re-download posts that already exist
- Run `python agent/main.py stats` anytime to see what's in the database
- The website works with or without AI enrichment (it just won't have categories/moods)
- You can run the scraper multiple times to get more collections
