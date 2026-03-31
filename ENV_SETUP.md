# Environment Variables Setup Guide

## What Are Environment Variables?

Environment variables are secure settings stored separately from your code. They contain sensitive information like API keys, credentials, and configuration values.

---

## Your Environment Variables

### Root `.env` File (instagram_collection_optimizer/.env)

```env
INSTAGRAM_SESSION_ID=5324502591%3AzhALov3T7YBnM4%3A12%3AAYjRn7XEVPTcx5pJJ5Gofzwv5ENpJ_5x8zJ8aTp_Pg4
INSTAGRAM_USERNAME=script__er
```

**Purpose**: Used by the Python scraper to authenticate with Instagram

**Location**: Root directory (not in web/)

**Keep Secret**: Never share or commit to GitHub

### Web `.env` File (instagram_collection_optimizer/web/.env)

```env
INSTAGRAM_SESSION_ID=5324502591%3AzhALov3T7YBnM4%3A12%3AAYjRn7XEVPTcx5pJJ5Gofzwv5ENpJ_5x8zJ8aTp_Pg4
INSTAGRAM_USERNAME=script__er
```

**Purpose**: Used by the Next.js app to access Instagram data

**Location**: web/ directory

**Keep Secret**: Never share or commit to GitHub

---

## Local Development Setup

### 1. Files Already Exist ✓
Both `.env` files are already created with your credentials.

### 2. Verify Setup
```bash
# Check root env file exists
cat .env

# Check web env file exists  
cat web/.env
```

You should see:
```env
INSTAGRAM_SESSION_ID=...
INSTAGRAM_USERNAME=script__er
```

### 3. Run Locally
```bash
cd web
npm install
npm run dev
```

Open http://localhost:3000 to see your app with demo data.

---

## Deployment to Vercel

### Step 1: Do NOT Push `.env` Files

Make sure git ignores these files:

```bash
# Check .gitignore exists
cat .gitignore

# Should contain:
# .env
# .env.local
# .env.*.local
```

### Step 2: Create `.env.example`

This is a template showing what variables are needed (without the actual values):

```bash
# Create web/.env.example
cat > web/.env.example << EOF
INSTAGRAM_SESSION_ID=your_session_id_here
INSTAGRAM_USERNAME=your_username_here
EOF

# Add to git
git add web/.env.example
git commit -m "Add environment template"
```

### Step 3: Deploy to Vercel

1. Go to **https://vercel.com**
2. Import your GitHub repository
3. Set **Root Directory** to `web`
4. Click **"Environment Variables"**
5. Add these variables:
   ```
   INSTAGRAM_SESSION_ID = 5324502591%3AzhALov3T7YBnM4%3A12%3AAYjRn7XEVPTcx5pJJ5Gofzwv5ENpJ_5x8zJ8aTp_Pg4
   INSTAGRAM_USERNAME = script__er
   ```
6. Click **"Deploy"**

---

## How Variables Work

### Development (Your Computer)
1. You create `.env` files locally
2. Next.js reads from `web/.env`
3. Python scraper reads from root `.env`
4. App starts with these variables loaded

### Production (Vercel)
1. You don't push `.env` files (they're ignored)
2. You set variables in Vercel dashboard
3. Vercel injects them during deployment
4. App starts with Vercel's variables

---

## Security Best Practices

### Do's ✓
- Keep `.env` files in `.gitignore` (already done)
- Add `.env.example` to show the structure
- Store credentials in Vercel dashboard, not in code
- Use strong, unique session IDs
- Rotate credentials if compromised

### Don'ts ✗
- Never commit `.env` files to GitHub
- Never hardcode secrets in code
- Never share your session ID publicly
- Never push credentials in comments or docs
- Never use the same credentials across projects

---

## Updating Credentials

### When to Update
- Instagram session expires
- Need new Instagram account
- Compromised credentials
- Need new scraping rights

### How to Update

**Local Development**:
```bash
# Edit .env file
nano .env

# Update INSTAGRAM_SESSION_ID with new value
# Save and restart your dev server
```

**Vercel Production**:
1. Get new session ID from Instagram
2. Go to Vercel dashboard
3. Project → Settings → Environment Variables
4. Update `INSTAGRAM_SESSION_ID` value
5. Click "Save"
6. Vercel auto-redeploys with new credentials

---

## Troubleshooting

### "INSTAGRAM_SESSION_ID is undefined"
**Problem**: Environment variable not loaded  
**Solution**: 
- Check `web/.env` file exists
- Restart dev server (`npm run dev`)
- For Vercel: Check dashboard → Settings → Environment Variables

### "Session expired" Error
**Problem**: Instagram invalidated your session  
**Solution**:
- Get new session ID from Instagram
- Update in `.env` (local) or Vercel dashboard (production)
- Restart app

### App Shows Demo Data Instead of Real Data
**Problem**: Database can't initialize  
**Solution**:
- This is expected on first deployment
- Run Python scraper: `python agent/main.py scrape`
- Push changes: `git push origin main`
- Vercel auto-redeploys with real data

---

## Environment Variable Reference

| Variable | Purpose | Example |
|----------|---------|---------|
| `INSTAGRAM_SESSION_ID` | Authenticate with Instagram API | `5324502...` |
| `INSTAGRAM_USERNAME` | Account to scrape from | `script__er` |

---

## Next Steps

1. Verify both `.env` files have credentials ✓
2. Test locally: `npm run dev`
3. Push to GitHub: `git push origin main`
4. Deploy to Vercel: Add env vars in dashboard
5. Monitor Vercel build logs

Your environment is ready! 🎉
