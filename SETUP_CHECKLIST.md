# Setup & Deployment Checklist

## ✅ Project Status

This document tracks the current state of the Instagram Saved Collections project.

## Environment Setup

- [x] `.env` file created with Instagram credentials
- [x] `web/.env` file created with Instagram credentials
- [x] Environment variables documented
- [x] `.gitignore` configured to exclude `.env` files

## Database Setup

- [x] Database schema created (`scripts/init-db.sql`)
- [x] Database setup script created (`web/scripts/setup-db.js`)
- [x] Data directory created (`web/data/`)
- [x] Database initialization added to build process

## Frontend Application

- [x] Layout and styling complete (`web/src/app/layout.tsx`, `globals.css`)
- [x] Pages implemented:
  - [x] Home/Collections (`web/src/app/page.tsx`)
  - [x] Search (`web/src/app/search/page.tsx`)
  - [x] Insights (`web/src/app/insights/page.tsx`)
  - [x] Tags (`web/src/app/tags/page.tsx`)
  - [x] Collection Detail (`web/src/app/collections/[slug]/page.tsx`)
  - [x] Post Detail (`web/src/app/post/[id]/page.tsx`)
- [x] Components implemented:
  - [x] Header with navigation (`web/src/components/Header.tsx`)
  - [x] Footer (`web/src/components/Footer.tsx`)
  - [x] Theme toggle (`web/src/components/ThemeToggle.tsx`)
  - [x] Search client (`web/src/components/SearchClient.tsx`)
  - [x] Collection grid (`web/src/components/CollectionGrid.tsx`)
- [x] Utilities and types:
  - [x] Type definitions (`web/src/lib/types.ts`)
  - [x] Database access layer (`web/src/lib/db.ts`)
  - [x] Utility functions (`web/src/lib/utils.ts`)
- [x] Styling with CSS custom properties (design tokens)
- [x] Dark/Light theme support
- [x] Mobile responsive design
- [x] Accessibility features

## Build Configuration

- [x] TypeScript configured (`web/tsconfig.json`)
- [x] Next.js configured for static export (`web/next.config.ts`)
- [x] Vercel deployment config (`web/vercel.json`)
- [x] Package.json build scripts updated
- [x] Database setup integrated into build

## Dependencies

Required packages are already in `package.json`:
- [x] Next.js 16.2.1
- [x] React 19.2.4
- [x] better-sqlite3 (for database)
- [x] lucide-react (for icons)
- [x] TypeScript

## Before Local Testing

1. Install dependencies:
   ```bash
   cd web
   npm install
   ```

2. Run development server:
   ```bash
   npm run dev
   ```

3. Open http://localhost:3000 in browser

## Before Production Deployment

1. **Verify credentials** - Ensure `.env` contains valid Instagram session ID
2. **Test locally** - Run `npm run dev` and verify all pages load
3. **Build production** - Run `npm run build` to check for build errors
4. **Check database** - Verify `web/data/instagram.db` is created
5. **Clear cache** - Run `npm run build` with fresh dependencies if needed

## Deploying to Vercel

1. **Connect GitHub repo** to Vercel
2. **Set root directory** to `web`
3. **Add environment variables** in Vercel Settings:
   - INSTAGRAM_SESSION_ID
   - INSTAGRAM_USERNAME
   - OLLAMA_HOST (optional)
   - OLLAMA_MODEL (optional)
   - WHISPER_MODEL (optional)
4. **Deploy** - Click "Deploy" button

## Post-Deployment

1. **Test the live site** - Open the Vercel URL
2. **Run scraper** - Use Python agent to populate database:
   ```bash
   python agent/main.py sync
   ```
3. **Commit data** - Push database and images to git
4. **Redeploy** - Vercel will automatically rebuild

## Troubleshooting Checklist

- [ ] Node version is 18+ (`node -v`)
- [ ] npm dependencies installed (`npm install`)
- [ ] No TypeScript errors (`npm run lint`)
- [ ] Database initializes on build (`npm run build`)
- [ ] All pages render locally (`npm run dev`)
- [ ] Styling looks correct in both themes
- [ ] Mobile layout responsive
- [ ] No console errors in browser DevTools
- [ ] All images load correctly
- [ ] Links between pages work
- [ ] Search functionality works
- [ ] Filters apply correctly

## Files & Directories

```
web/
├── src/
│   ├── app/                    # Page routes
│   │   ├── layout.tsx         # Root layout
│   │   ├── page.tsx           # Home page
│   │   ├── globals.css        # Global styles
│   │   ├── collections/[slug]/
│   │   ├── post/[id]/
│   │   ├── search/
│   │   ├── insights/
│   │   └── tags/
│   ├── components/            # React components
│   │   ├── Header.tsx
│   │   ├── Footer.tsx
│   │   ├── ThemeToggle.tsx
│   │   ├── SearchClient.tsx
│   │   └── CollectionGrid.tsx
│   └── lib/                   # Utilities & database
│       ├── db.ts             # Database access
│       ├── types.ts          # TypeScript types
│       └── utils.ts          # Utility functions
├── data/                      # SQLite database location
│   └── instagram.db          # Created on build
├── public/                    # Static assets
│   └── media/                # Images & thumbnails
├── scripts/
│   └── setup-db.js           # Database initialization
├── package.json
├── tsconfig.json
├── next.config.ts
└── vercel.json
```

## Next Phase: Data Population

After deployment, run the Python scraper:

1. Install Python dependencies
2. Get your Instagram session ID
3. Run: `python agent/main.py sync`
4. Wait for scraping and enrichment
5. Commit and push changes
6. Vercel redeploys automatically

---

**Status**: ✅ Ready for deployment
**Last Updated**: 2026-03-31
**Environment**: Production-ready with demo data
