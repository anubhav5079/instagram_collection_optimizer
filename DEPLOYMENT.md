# Deployment Guide

## Prerequisites

- Node.js 18+ and npm
- GitHub account with the repository connected
- Vercel account (free tier available)

## Environment Variables

Your project uses the following environment variables:

```env
INSTAGRAM_SESSION_ID=5324502591%3AzhALov3T7YBnM4%3A12%3AAYjRn7XEVPTcx5pJJ5Gofzwv5ENpJ_5x8zJ8aTp_Pg4
INSTAGRAM_USERNAME=script__er
OLLAMA_HOST=http://localhost:11434
OLLAMA_MODEL=llama3.2
WHISPER_MODEL=base
VERCEL_DEPLOY_HOOK=
```

These are already set in `.env` and `web/.env` files.

## Local Development

```bash
cd web
npm install
npm run dev
```

The site will be available at http://localhost:3000

The development script automatically:
1. Initializes the SQLite database
2. Starts the Next.js development server with Turbopack disabled

## Building for Production

```bash
cd web
npm run build
npm start
```

The build process:
1. Sets up the database schema
2. Creates an optimized static export
3. Outputs to the `out/` directory

## Deploying to Vercel

### Option 1: Using Vercel CLI

```bash
npm install -g vercel
cd web
vercel
```

### Option 2: Using GitHub Integration

1. Push your code to GitHub
2. Go to [vercel.com](https://vercel.com)
3. Click "Add New..." → "Project"
4. Import your GitHub repository
5. Set Root Directory to `web`
6. Add environment variables in Settings → Environment Variables
7. Deploy!

### Configuration

The `web/vercel.json` file specifies:
- Build command: `npm run setup-db && npm run build`
- Output directory: `out`
- Framework: Next.js (static export)

## Database Initialization

The database is automatically initialized during build with:
- Collections table
- Posts table  
- Post-Collection junction table
- Indexes for performance

Location: `web/data/instagram.db`

## Scraped Data

Before deploying with actual data:

1. Run the Python scraper on your local machine
2. It will populate `web/data/instagram.db`
3. Download images to `web/public/media/images/`
4. Commit the database and images to git (or use git-lfs)
5. Deploy to Vercel

Alternatively, you can run the scraper in a CI/CD workflow using GitHub Actions.

## Troubleshooting

### Database not found error
The database is created automatically on build. If you see an error:
1. Run `npm run setup-db` manually
2. Check that `web/data/` directory exists

### Build fails
1. Make sure all dependencies are installed: `npm install`
2. Check Node.js version: `node -v` (should be 18+)
3. Clear build cache: `rm -rf .next out node_modules && npm install`

### Images not loading
1. Verify images exist in `web/public/media/`
2. Check image paths in the database are correct
3. Images should be scraped by the Python agent first

## Security Notes

⚠️ **Never commit your actual .env files with credentials!**

- `.env` and `web/.env` should be in `.gitignore`
- Set environment variables in Vercel Dashboard → Settings → Environment Variables
- Your Instagram session ID is sensitive — treat it like a password

## Monitoring

After deployment:
1. Check Vercel deployments dashboard
2. View build logs for errors
3. Monitor performance with Vercel Analytics
4. Check function logs if using serverless features

## Next Steps

After deploying:
1. Run the Python scraper to populate with your actual data
2. Test locally with `npm run dev`
3. Commit and push to trigger automatic Vercel deployment
4. Share your public Instagram Collections site!
