# Instagram Saved Collections — Setup Script (Windows PowerShell)
# Run: .\scripts\setup.ps1

Write-Host ""
Write-Host "╔══════════════════════════════════════════════╗" -ForegroundColor Magenta
Write-Host "║  Instagram Saved Collections — Setup         ║" -ForegroundColor Magenta
Write-Host "╚══════════════════════════════════════════════╝" -ForegroundColor Magenta
Write-Host ""

# ── Check prerequisites ─────────────────────────────────
Write-Host "Checking prerequisites..." -ForegroundColor Cyan

# Python
$python = Get-Command python -ErrorAction SilentlyContinue
if (-not $python) {
    Write-Host "ERROR: Python is not installed. Install Python 3.11+ from python.org" -ForegroundColor Red
    exit 1
}
$pyVersion = python --version 2>&1
Write-Host "  ✓ $pyVersion" -ForegroundColor Green

# Node.js
$node = Get-Command node -ErrorAction SilentlyContinue
if (-not $node) {
    Write-Host "ERROR: Node.js is not installed. Install Node.js 18+ from nodejs.org" -ForegroundColor Red
    exit 1
}
$nodeVersion = node --version 2>&1
Write-Host "  ✓ Node.js $nodeVersion" -ForegroundColor Green

# ── Create .env if it doesn't exist ─────────────────────
$envFile = Join-Path $PSScriptRoot "..\.env"
$envExample = Join-Path $PSScriptRoot "..\.env.example"

if (-not (Test-Path $envFile)) {
    Write-Host ""
    Write-Host "Creating .env file from template..." -ForegroundColor Yellow
    Copy-Item $envExample $envFile

    Write-Host ""
    Write-Host "IMPORTANT: You need to add your Instagram session ID to .env" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "How to get your sessionid:" -ForegroundColor Cyan
    Write-Host "  1. Open instagram.com in Chrome/Firefox"
    Write-Host "  2. Press F12 → Application tab → Cookies → https://www.instagram.com"
    Write-Host "  3. Find 'sessionid' and copy its value"
    Write-Host "  4. Paste it in .env as INSTAGRAM_SESSION_ID=<your_value>"
    Write-Host ""

    $sessionId = Read-Host "Enter your Instagram sessionid (or press Enter to skip)"
    if ($sessionId) {
        (Get-Content $envFile) -replace 'INSTAGRAM_SESSION_ID=your_session_id_here', "INSTAGRAM_SESSION_ID=$sessionId" |
            Set-Content $envFile
    }

    $username = Read-Host "Enter your Instagram username (or press Enter to skip)"
    if ($username) {
        (Get-Content $envFile) -replace 'INSTAGRAM_USERNAME=your_username_here', "INSTAGRAM_USERNAME=$username" |
            Set-Content $envFile
    }
} else {
    Write-Host "  ✓ .env file exists" -ForegroundColor Green
}

# ── Install Python dependencies ─────────────────────────
Write-Host ""
Write-Host "Installing Python dependencies..." -ForegroundColor Cyan
$agentDir = Join-Path $PSScriptRoot "..\agent"
pip install -r (Join-Path $agentDir "requirements.txt") --quiet 2>&1 | Out-Null
Write-Host "  ✓ Python dependencies installed" -ForegroundColor Green

# ── Install Node.js dependencies ────────────────────────
Write-Host ""
Write-Host "Installing Node.js dependencies..." -ForegroundColor Cyan
$webDir = Join-Path $PSScriptRoot "..\web"
Push-Location $webDir
npm install --silent 2>&1 | Out-Null
Pop-Location
Write-Host "  ✓ Node.js dependencies installed" -ForegroundColor Green

# ── Check Ollama ────────────────────────────────────────
Write-Host ""
$ollama = Get-Command ollama -ErrorAction SilentlyContinue
if ($ollama) {
    Write-Host "  ✓ Ollama is installed" -ForegroundColor Green
    Write-Host "  Pulling llama3.2 model (needed for enrichment)..." -ForegroundColor Yellow
    ollama pull llama3.2 2>&1 | Out-Null
    Write-Host "  ✓ Model ready" -ForegroundColor Green
} else {
    Write-Host "  ⚠ Ollama not found — enrichment will be skipped" -ForegroundColor Yellow
    Write-Host "  Install from: https://ollama.ai" -ForegroundColor Yellow
}

# ── Initialize database ────────────────────────────────
Write-Host ""
Write-Host "Initializing database..." -ForegroundColor Cyan
Push-Location (Join-Path $PSScriptRoot "..")
python -c "import sys; sys.path.insert(0, 'agent'); from database import init_db; init_db()"
Pop-Location
Write-Host "  ✓ Database initialized" -ForegroundColor Green

Write-Host ""
Write-Host "═══════════════════════════════════════════════" -ForegroundColor Green
Write-Host "  Setup complete!" -ForegroundColor Green
Write-Host "═══════════════════════════════════════════════" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "  1. Make sure your .env has INSTAGRAM_SESSION_ID set"
Write-Host "  2. Run the scraper:    python agent/main.py scrape"
Write-Host "  3. Run enrichment:     python agent/main.py enrich"
Write-Host "  4. Build the site:     cd web && npm run build"
Write-Host "  5. Or dev server:      cd web && npm run dev"
Write-Host ""
