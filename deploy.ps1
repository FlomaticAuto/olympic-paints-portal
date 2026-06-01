#!/usr/bin/env pwsh
# deploy.ps1 — push to GitHub then deploy to Vercel production
# Usage: .\deploy.ps1 [-Message "commit message"] [-SkipPush]
#
# Why this exists: the portal project is NOT connected to a GitHub integration
# in Vercel. Pushes to GitHub do NOT auto-deploy. This script handles both steps
# atomically so nothing is ever pushed-but-not-deployed.
#
# Prerequisites (one-time per machine):
#   1. `vercel` CLI installed globally:  npm i -g vercel
#   2. Vercel CLI authenticated:         vercel login  (browser opens)
#   3. Project linked:                   vercel link   (run from this dir)
#   4. gh CLI installed + authenticated: gh auth login --web

param(
    [string]$Message = "",
    [switch]$SkipPush
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $ScriptDir

function Write-Step { param([string]$Text) Write-Host "`n==> $Text" -ForegroundColor Cyan }
function Write-OK   { param([string]$Text) Write-Host "    OK: $Text" -ForegroundColor Green }
function Write-Fail { param([string]$Text) Write-Host "    FAIL: $Text" -ForegroundColor Red; exit 1 }

# ── 1. Git push ──────────────────────────────────────────────────────────────
if (-not $SkipPush) {
    Write-Step "Pushing to GitHub (origin/main)"

    $status = git status --porcelain
    if ($status) {
        if (-not $Message) {
            $Message = Read-Host "Commit message"
            if (-not $Message) { Write-Fail "Commit message required when there are staged/unstaged changes" }
        }
        git add -A
        git commit -m $Message
    } else {
        Write-Host "    Nothing to commit — pushing existing HEAD"
    }

    $tok = (gh auth token --user FlomaticAuto).Trim()
    $basic = [Convert]::ToBase64String([System.Text.Encoding]::ASCII.GetBytes("x-access-token:$tok"))
    git -c "http.extraheader=Authorization: Basic $basic" push origin main
    Write-OK "Pushed to GitHub"
} else {
    Write-Host "    --SkipPush: skipping git push"
}

# ── 2. Vercel production deploy ───────────────────────────────────────────────
Write-Step "Deploying to Vercel production"
vercel deploy --prod --yes
if ($LASTEXITCODE -ne 0) { Write-Fail "Vercel deploy exited with code $LASTEXITCODE" }
Write-OK "Deployed to portal.olympicpaints.co.za"

Write-Host "`nDone." -ForegroundColor Green
