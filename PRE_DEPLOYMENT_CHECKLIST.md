# Pre-Deployment Checklist

Use this checklist to verify everything is ready before deploying to Vercel.

## Environment Configuration

- [ ] `.env` file exists in project root
- [ ] `.env` contains `INSTAGRAM_SESSION_ID`
- [ ] `.env` contains `INSTAGRAM_USERNAME`
- [ ] `web/.env` file exists
- [ ] `web/.env` contains Instagram credentials
- [ ] Credentials are not in any `.tsx` or `.js` files

## Database Setup

- [ ] `scripts/init-db.sql` exists with schema
- [ ] `web/scripts/setup-db.js` exists and is executable
- [ ] `web/data/` directory exists
- [ ] Database auto-init is in package.json scripts

## Application Code

- [ ] `web/src/lib/db.ts` has error handling with fallback
- [ ] `web/src/app/page.tsx` loads collections correctly
- [ ] All page components exist:
  - [ ] `web/src/app/page.tsx` (home)
  - [ ] `web/src/app/search/page.tsx` (search)
  - [ ] `web/src/app/insights/page.tsx` (analytics)
  - [ ] `web/src/app/tags/page.tsx` (tag browser)
  - [ ] `web/src/app/collections/[slug]/page.tsx` (collection detail)
  - [ ] `web/src/app/post/[id]/page.tsx` (post detail)

## Styling & Assets

- [ ] `web/src/app/globals.css` contains all styles
- [ ] `web/src/app/layout.tsx` exists
- [ ] Dark/light mode CSS variables are defined
- [ ] Mobile responsive styles present

## Dependencies

- [ ] `web/package.json` contains all required packages
- [ ] `better-sqlite3` is listed as dependency
- [ ] `next` version is 16.x or higher
- [ ] `react` version is 19.x or higher
- [ ] `cross-env` is in devDependencies (for Windows compatibility)

## Build Configuration

- [ ] `web/next.config.ts` exists
- [ ] `web/vercel.json` exists with correct settings
- [ ] `buildCommand` in vercel.json includes database setup
- [ ] `outputDirectory` is set to `out`
- [ ] Environment variables listed in vercel.json:
  - [ ] `INSTAGRAM_SESSION_ID`
  - [ ] `INSTAGRAM_USERNAME`
  - [ ] `OLLAMA_HOST` (optional)
  - [ ] `OLLAMA_MODEL` (optional)
  - [ ] `WHISPER_MODEL` (optional)

## Package Scripts

In `web/package.json`, verify scripts:
```json
{
  "setup-db": "node scripts/setup-db.js",
  "dev": "npm run setup-db && cross-env TURBOPACK=0 next dev",
  "build": "npm run setup-db && next build",
  "start": "next start",
  "lint": "eslint"
}
```

- [ ] ✅ `setup-db` script exists
- [ ] ✅ `dev` includes setup-db
- [ ] ✅ `build` includes setup-db

## Git & GitHub

- [ ] Repository is on GitHub: `anubhav5079/instagram_collection_optimizer`
- [ ] Main branch is default
- [ ] `.gitignore` exists and includes:
  - [ ] `node_modules/`
  - [ ] `.env` (don't commit!)
  - [ ] `web/.env` (don't commit!)
  - [ ] `.next/`
  - [ ] `out/`
  - [ ] `web/data/` (optional - database)
- [ ] `.gitignore` correctly formatted

## Local Testing (Optional but Recommended)

- [ ] Run `npm install` in `web/` directory successfully
- [ ] Run `npm run dev` starts without errors
- [ ] Home page loads at `http://localhost:3000`
- [ ] Can navigate to different pages
- [ ] Demo data displays correctly
- [ ] Search functionality works
- [ ] Dark/light mode toggle works
- [ ] Mobile responsive (test in browser DevTools)

## Documentation

- [ ] `DEPLOY_NOW.md` exists with deployment steps
- [ ] `README_DEPLOYMENT.md` exists with overview
- [ ] `COMPLETION_REPORT.md` exists with status
- [ ] `COMMANDS.md` exists with command reference
- [ ] `.env` file has helpful comments

## Vercel Account

- [ ] Have a Vercel account (free tier OK)
- [ ] Can access Vercel dashboard
- [ ] Have GitHub connected to Vercel
- [ ] Know your GitHub token/permissions

## Final Verification

### Environment Variables Check
```bash
# Verify credentials are set
cat .env
cat web/.env

# Should show:
# INSTAGRAM_SESSION_ID=...
# INSTAGRAM_USERNAME=...
```

### File Structure Check
```bash
# Verify all files exist
ls scripts/init-db.sql
ls web/scripts/setup-db.js
ls web/vercel.json
ls web/package.json
ls web/next.config.ts
```

### Git Status Check
```bash
# Verify ready to push
git status

# Should show changes to be committed:
# - Modified: .env
# - Modified: web/.env
# - Created/Modified: various documentation files
```

## Pre-Deployment Sign-Off

When all items above are checked:

- [ ] I have verified environment variables are set correctly
- [ ] I have verified all required files exist
- [ ] I have verified git status is clean (ready to push)
- [ ] I am ready to deploy to Vercel
- [ ] I understand the deployment process

## Deployment Checklist

### Before Pushing to GitHub
- [ ] Run `git status` and verify correct files
- [ ] Run `git add .` to stage all changes
- [ ] Run `git commit -m "..."` with descriptive message
- [ ] Do NOT commit `.env` files (they're already in .gitignore)

### When Pushing to GitHub
- [ ] Run `git push origin main`
- [ ] Verify push succeeds without errors
- [ ] Check GitHub to confirm changes pushed

### When Deploying to Vercel
- [ ] Visit https://vercel.com
- [ ] Click "Add New" → "Project"
- [ ] Select GitHub repository
- [ ] Confirm Root Directory is `web`
- [ ] Add environment variables:
  - [ ] `INSTAGRAM_SESSION_ID` = (from .env)
  - [ ] `INSTAGRAM_USERNAME` = (from .env)
- [ ] Click "Deploy"
- [ ] Wait for build to complete (~2-3 minutes)
- [ ] Visit generated URL to verify site loads

### After Deployment
- [ ] Site loads successfully
- [ ] Home page displays demo data
- [ ] Can navigate between pages
- [ ] Search works
- [ ] Dark/light mode works
- [ ] Mobile view is responsive

## Common Issues & Solutions

| Issue | Solution |
|-------|----------|
| "Could not locate bindings file" | Normal! App falls back to demo data. No action needed. |
| "Module not found: better-sqlite3" | Check npm install completed successfully |
| "INSTAGRAM_SESSION_ID not set" | Verify env var in Vercel project settings |
| Build fails at setup-db | Check database schema in scripts/init-db.sql |
| Page shows error instead of demo data | Check browser console for specific error |
| Deployment timeout | Increase timeout in Vercel settings, or reduce build size |

## Success Indicators

When deployment succeeds, you should see:

1. ✅ Green checkmark in Vercel dashboard
2. ✅ Site accessible via Vercel URL
3. ✅ Home page loads with demo data
4. ✅ All navigation works
5. ✅ No console errors in browser
6. ✅ Dark mode toggles work

---

## Ready to Deploy?

When all items above are checked ✅, you're ready!

**Next step:** See `DEPLOY_NOW.md` for the 3-step deployment process

---

**Created:** As part of project finalization
**Status:** Ready for production deployment
**Last Updated:** 2026-03-31
