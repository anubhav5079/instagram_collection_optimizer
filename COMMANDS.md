# Command Reference

## Deployment Commands

### Push to GitHub
```bash
git add .
git commit -m "Configure environment and deploy to Vercel"
git push origin main
```

That's all you need to do on your end. Vercel handles the rest automatically.

## Local Development

### Install dependencies
```bash
cd web
npm install
```

### Run development server
```bash
npm run dev
```
Visit http://localhost:3000

### Build for production
```bash
npm run build
```

### Initialize database
```bash
npm run setup-db
```

### Start production server
```bash
npm start
```

## Database Operations

### Check database tables
```bash
sqlite3 web/data/instagram.db ".tables"
```

### View database stats
```bash
sqlite3 web/data/instagram.db "SELECT COUNT(*) as collections FROM collections;"
sqlite3 web/data/instagram.db "SELECT COUNT(*) as posts FROM posts;"
```

### Reset database
```bash
rm web/data/instagram.db
npm run setup-db
```

## Python Scraper (Optional)

### Setup Python environment
```bash
python -m venv venv
source venv/bin/activate  # or venv\Scripts\Activate on Windows
```

### Install Python dependencies
```bash
pip install -r agent/requirements.txt
```

### Run scraper
```bash
python agent/main.py scrape
```

### Show statistics
```bash
python agent/main.py stats
```

### Full sync (scrape + enrich)
```bash
python agent/main.py sync
```

## Environment Variables

### View current environment
```bash
cat .env
cat web/.env
```

### Update environment
Edit the `.env` files directly, then:
1. For local development: restart dev server
2. For production: push to GitHub, Vercel auto-redeploys

## Vercel Deployment

### Deploy via CLI
```bash
npm i -g vercel
vercel
```

### View deployment logs
- Go to vercel.com
- Select your project
- Click "Deployments"
- Click on the deployment
- Click "Logs"

### Rollback deployment
- Go to vercel.com
- Select your project
- Click "Deployments"
- Find the previous deployment
- Click "Promote to Production"

## Docker (Optional)

### Build Docker image
```bash
docker build -f web/Dockerfile -t instagram-collections .
```

### Run Docker container
```bash
docker run -p 3000:3000 instagram-collections
```

## Debugging

### Check Next.js errors
```bash
npm run dev
# Look at console output
```

### Check database errors
```bash
npm run setup-db
# Look for [setup-db] messages
```

### Enable verbose logging
```bash
DEBUG=* npm run dev
```

## Quick Status Check

### Is app running?
```bash
curl http://localhost:3000
```

### Are dependencies installed?
```bash
ls -la node_modules
```

### Is database initialized?
```bash
ls -la web/data/instagram.db
```

### Are env vars set?
```bash
env | grep INSTAGRAM
```

## Troubleshooting Commands

### Clear npm cache
```bash
npm cache clean --force
```

### Reinstall dependencies
```bash
rm -rf node_modules package-lock.json
npm install
```

### Rebuild database
```bash
rm -f web/data/instagram.db
npm run setup-db
```

### Check Node version
```bash
node --version
```

### Check npm version
```bash
npm --version
```

---

**Most common flow:**
```bash
git add .
git commit -m "message"
git push origin main
```

That's it! Vercel handles deployment automatically.
