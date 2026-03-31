# Instagram Saved Collections — Personal Website

> **Turn your Instagram saved posts into a beautiful, searchable personal website.**

Scrape your saved collections, process media with AI (transcription + enrichment), and deploy a stunning static site — all for $0/month.

![License](https://img.shields.io/badge/license-personal%20use-blue)
![Cost](https://img.shields.io/badge/monthly%20cost-%240-brightgreen)

---

## ⚠️ Important Disclaimer

This tool uses Instagram's **private/internal API** (not the official Graph API) to access your saved collections. This **may violate Instagram's Terms of Service**. Use this tool:

- **Only for personal use** with your own account
- **Never for commercial purposes** or against other users' accounts
- **At your own risk** — your account could be temporarily or permanently restricted

---

## 🏗️ Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌──────────────────┐
│  Python Agent    │───▶│   SQLite DB +    │───▶│  Next.js Static  │
│  (Scraper +      │    │   Media Files    │    │  Website (Vercel)│
│   AI Enrichment) │    │                  │    │                  │
└─────────────────┘    └──────────────────┘    └──────────────────┘
        │                                              ▲
        ▼                                              │
┌─────────────────┐                          ┌────────────────────┐
│  Whisper (local) │                          │  GitHub Actions    │
│  Ollama (local)  │                          │  (auto-sync cron)  │
└─────────────────┘                          └────────────────────┘
```

## 📦 What's Included

| Component | Technology | Cost |
|-----------|-----------|------|
| Scraping agent | Python + instagrapi | Free |
| Audio transcription | OpenAI Whisper (local CPU) | Free |
| Scene description | Ollama + LLaVA (local) | Free |
| AI enrichment | Ollama + llama3.2 (local) | Free |
| Database | SQLite (file-based) | Free |
| Image/thumbnail storage | Git repo → Vercel CDN | Free |
| Website hosting | Vercel free tier | Free |
| Automation | GitHub Actions (2000 min/mo) | Free |

**Total monthly cost: $0**

---

## 🚀 Quick Start

### Prerequisites

- **Python 3.11+** — [python.org](https://python.org)
- **Node.js 18+** — [nodejs.org](https://nodejs.org)
- **Ollama** (optional, for AI enrichment) — [ollama.ai](https://ollama.ai)
- **yt-dlp** (for video transcription) — `pip install yt-dlp`
- **ffmpeg** (for audio processing) — [ffmpeg.org](https://ffmpeg.org)

### 1. Clone & Setup

```powershell
git clone <your-repo-url>
cd instagram-saved-site
.\scripts\setup.ps1
```

### 2. Get Your Instagram Session ID

1. Open **instagram.com** in Chrome or Firefox
2. Press **F12** to open DevTools
3. Go to **Application** tab → **Cookies** → **https://www.instagram.com**
4. Find the cookie named **`sessionid`**
5. Copy its value
6. Paste it in `.env`:

```env
INSTAGRAM_SESSION_ID=your_session_id_here
INSTAGRAM_USERNAME=your_username_here
```

> ⚠️ Your session ID is equivalent to your login credentials. **Never share it or commit it to git.** The `.env` file is gitignored.

### 3. Run the Scraper

```powershell
python agent/main.py scrape
```

This will:
- Authenticate with Instagram using your session cookie
- Fetch all saved collections and their posts
- Download images to `web/public/media/images/`
- Transcribe video audio with Whisper (if installed)
- Store everything in `web/data/instagram.db`

### 4. Run AI Enrichment (Optional)

Requires [Ollama](https://ollama.ai) running locally:

```powershell
ollama serve                    # Start Ollama server
ollama pull llama3.2            # Download the model (first time)
python agent/main.py enrich     # Run enrichment
```

This adds: categories, keywords, mood tags, and AI summaries to every post.

### 5. Build & Preview the Website

```powershell
cd web
npm run dev     # Development server at http://localhost:3000
# or
npm run build   # Static build for deployment
```

### 6. Full Pipeline (Scrape + Enrich)

```powershell
python agent/main.py sync
```

---

## 🌐 Deploying to Vercel (Free)

1. Push your repo to GitHub
2. Go to [vercel.com](https://vercel.com) → Import Project → Select your repo
3. Set the **Root Directory** to `web`
4. Deploy! 🎉

### Auto-Sync with GitHub Actions

1. Go to your GitHub repo → **Settings** → **Secrets and Variables** → **Actions**
2. Add these secrets:
   - `INSTAGRAM_SESSION_ID` — your session ID
   - `INSTAGRAM_USERNAME` — your username
   - `VERCEL_DEPLOY_HOOK` — create at Vercel Dashboard → Project → Settings → Git → Deploy Hooks
3. The workflow runs automatically every Monday and Thursday (configurable in `.github/workflows/sync.yml`)

---

## 📁 Project Structure

```
instagram-saved-site/
├── agent/                     # Python scraping + AI agent
│   ├── main.py               # CLI entry point
│   ├── scraper.py             # Instagram API scraper
│   ├── media_handler.py       # Image/video processing
│   ├── transcriber.py         # Whisper transcription
│   ├── enrichment.py          # Ollama AI enrichment
│   ├── database.py            # SQLite operations
│   ├── config.py              # Configuration
│   └── logger.py              # Logging
├── web/                       # Next.js website
│   ├── src/app/               # App Router pages
│   ├── src/components/        # React components
│   ├── src/lib/               # DB access + utilities
│   ├── public/media/          # Downloaded images + thumbnails
│   └── data/instagram.db      # SQLite database
├── .github/workflows/         # GitHub Actions automation
├── scripts/setup.ps1          # Setup script
└── .env.example               # Environment template
```

---

## 🎨 Website Features

- **Home dashboard** — all collections with cover images, stats, and top tags
- **Masonry grid** — beautiful responsive layout for browsing posts
- **Post detail view** — full images with download, video transcripts, AI analysis
- **Full-text search** — instant search across captions, transcripts, tags, and authors
- **Insights page** — hashtag charts, author rankings, mood distribution, type breakdown
- **Tag cloud** — browse by hashtag, category, or keyword
- **Dark/light mode** — with smooth transitions and glassmorphism effects

---

## 🔧 Agent Commands

```powershell
python agent/main.py scrape     # Scrape Instagram saved collections
python agent/main.py enrich     # Run AI enrichment
python agent/main.py sync       # Scrape + enrich (full pipeline)
python agent/main.py stats      # Show database statistics
```

---

## 📄 License

This project is for **personal use only**. Not affiliated with or endorsed by Instagram/Meta.
