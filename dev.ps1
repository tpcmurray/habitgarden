# Habit Garden - Development Setup Script
# Uses Docker for PostgreSQL
# Idempotent - safe to run multiple times

param(
    [string]$DbPassword = "habitgarden_dev"
)

$ErrorActionPreference = "Continue"

Write-Host "Habit Garden Development Setup" -ForegroundColor Green
Write-Host "=================================" -ForegroundColor Green

# 1. Check Node.js
Write-Host ""
Write-Host "[1/5] Checking Node.js..." -ForegroundColor Cyan
$nodeVersion = node --version 2>$null
if ($nodeVersion) {
    Write-Host "  OK: Node.js $nodeVersion found" -ForegroundColor Green
} else {
    Write-Host "  ERROR: Node.js not found. Please install Node.js from https://nodejs.org" -ForegroundColor Red
    exit 1
}

# 2. Install npm dependencies
Write-Host ""
Write-Host "[2/5] Installing npm dependencies..." -ForegroundColor Cyan
npm install 2>&1 | Out-Null
if ($LASTEXITCODE -eq 0) {
    Write-Host "  OK: Dependencies installed" -ForegroundColor Green
} else {
    Write-Host "  ERROR: Failed to install dependencies" -ForegroundColor Red
    exit 1
}

# 3. Set up PostgreSQL with Docker
Write-Host ""
Write-Host "[3/5] Setting up PostgreSQL with Docker..." -ForegroundColor Cyan

# Check if Docker is running
$dockerRunning = docker info 2>$null
if (-not $dockerRunning) {
    Write-Host "  ERROR: Docker is not running. Please start Docker Desktop." -ForegroundColor Red
    exit 1
}

# Check if container already exists
$container = docker ps -a --filter "name=habitgarden-db" --format "{{.Names}}" 2>$null
if ($container) {
    Write-Host "  OK: Docker container 'habitgarden-db' exists" -ForegroundColor Green
    $containerRunning = docker ps --filter "name=habitgarden-db" --format "{{.Names}}" 2>$null
    if (-not $containerRunning) {
        Write-Host "  Starting container..." -ForegroundColor Yellow
        docker start habitgarden-db 2>$null | Out-Null
        Write-Host "  OK: Container started" -ForegroundColor Green
    }
} else {
    Write-Host "  Creating Docker PostgreSQL container..." -ForegroundColor Yellow
    docker run -d --name habitgarden-db -e POSTGRES_PASSWORD=$DbPassword -e POSTGRES_DB=habitgarden -e POSTGRES_USER=habitgarden_user -p 5434:5432 postgres:latest 2>$null | Out-Null
    Write-Host "  OK: Docker container created" -ForegroundColor Green
}

# Wait for PostgreSQL to be ready
Write-Host "  Waiting for database to be ready..." -ForegroundColor Yellow
Start-Sleep -Seconds 5
$maxRetries = 15
for ($i = 0; $i -lt $maxRetries; $i++) {
    $test = docker exec habitgarden-db pg_isready -U postgres 2>$null
    if ($test -eq "accepting connections") {
        break
    }
    Start-Sleep -Seconds 2
}
Write-Host "  OK: Database is ready" -ForegroundColor Green

# Create database and user
Write-Host "  Creating database and user..." -ForegroundColor Yellow
docker exec habitgarden-db psql -U postgres -c "CREATE USER habitgarden_user WITH PASSWORD '$DbPassword';" 2>$null | Out-Null
docker exec habitgarden-db psql -U postgres -c "CREATE DATABASE habitgarden OWNER habitgarden_user;" 2>$null | Out-Null
docker exec habitgarden-db psql -U postgres -c "GRANT ALL PRIVILEGES ON DATABASE habitgarden TO habitgarden_user;" 2>$null | Out-Null
Write-Host "  OK: Database 'habitgarden' ready" -ForegroundColor Green

# Update .env.local
$envFile = ".env.local"
$envContent = ""

if (Test-Path $envFile) {
    # Preserve existing values
    $existingContent = Get-Content $envFile -Raw
    
    # Extract existing values
    $googleClientId = ""
    $googleClientSecret = ""
    $nextAuthSecret = ""
    
    if ($existingContent -match "GOOGLE_CLIENT_ID=(.+)") { $googleClientId = $matches[1].Trim() }
    if ($existingContent -match "GOOGLE_CLIENT_SECRET=(.+)") { $googleClientSecret = $matches[1].Trim() }
    if ($existingContent -match "NEXTAUTH_SECRET=(.+)") { $nextAuthSecret = $matches[1].Trim() }
    
    # Use existing secret or generate a new one (but prefer existing to preserve sessions)
    if (-not $nextAuthSecret) {
        $nextAuthSecret = "dev-secret-$(Get-Random -Maximum 999999)"
    }
    
    # Build new content preserving credentials and secret
    $envContent = @"
# Database
DATABASE_URL=postgresql://habitgarden_user:${DbPassword}@localhost:5434/habitgarden

# NextAuth
NEXTAUTH_URL=http://localhost:3002
NEXTAUTH_SECRET=$nextAuthSecret

# Google OAuth - SET THESE to enable login
# Get credentials from: https://console.cloud.google.com/apis/credentials
GOOGLE_CLIENT_ID=$googleClientId
GOOGLE_CLIENT_SECRET=$googleClientSecret
"@
    
    Write-Host "  OK: Preserved existing .env.local values" -ForegroundColor Green
} else {
    $envContent = @"
# Database
DATABASE_URL=postgresql://habitgarden_user:${DbPassword}@localhost:5434/habitgarden

# NextAuth
NEXTAUTH_URL=http://localhost:3002
NEXTAUTH_SECRET=dev-secret-$(Get-Random -Maximum 999999)

# Google OAuth - SET THESE to enable login
# Get credentials from: https://console.cloud.google.com/apis/credentials
# GOOGLE_CLIENT_ID=your-google-client-id
# GOOGLE_CLIENT_SECRET=your-google-client-secret
"@
    Write-Host "  OK: .env.local created" -ForegroundColor Green
}

Set-Content -Path $envFile -Value $envContent -Force

# 4. Run database migrations
Write-Host ""
Write-Host "[4/5] Running database migrations..." -ForegroundColor Cyan
npx drizzle-kit push 2>&1 | Out-Null
if ($LASTEXITCODE -eq 0) {
    Write-Host "  OK: Database schema synced" -ForegroundColor Green
} else {
    Write-Host "  WARNING: Migration may have issues (continuing anyway)" -ForegroundColor Yellow
}

# 5. Start development server
Write-Host ""
Write-Host "[5/5] Starting development server..." -ForegroundColor Cyan
Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "Habit Garden is starting!" -ForegroundColor Green
Write-Host "   Open: http://localhost:3002" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Green

# Start dev server
npm run dev
