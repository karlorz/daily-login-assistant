# Auto-generated PWA Script Launcher
# Session: {{SESSION_TOKEN}}

# Configuration (server-injected)
$sessionToken = "{{SESSION_TOKEN}}"
$remoteSshHost = "{{REMOTE_SSH_HOST}}"
$remoteSshPort = {{REMOTE_SSH_PORT}}
$remoteSshUser = "{{REMOTE_SSH_USER}}"
$apiEndpoint = "{{API_ENDPOINT}}"
$debugPort = 9222

# 1. Find Chrome
Write-Host "INFO: Locating Google Chrome..." -ForegroundColor Cyan
$chromePath = (Get-Item "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\App Paths\chrome.exe" -ErrorAction SilentlyContinue).'(default)'

if (-not $chromePath -or -not (Test-Path $chromePath)) {
    Write-Error "Google Chrome not found. Please install Chrome and try again."
    exit 1
}

# 2. Check port availability
Write-Host "INFO: Checking port ${debugPort} availability..." -ForegroundColor Cyan
if (Get-NetTCPConnection -LocalPort $debugPort -ErrorAction SilentlyContinue) {
    Write-Error "Port ${debugPort} is already in use. Please close the application using it."
    exit 1
}

# 3. Launch Chrome with remote debugging
Write-Host "INFO: Starting Chrome with remote debugging..." -ForegroundColor Cyan
# Create temporary user data directory
$tempProfile = Join-Path $env:TEMP ("chrome-debug-" + [System.Guid]::NewGuid().ToString())
New-Item -ItemType Directory -Path $tempProfile -Force | Out-Null

$chromeProcess = Start-Process -FilePath $chromePath `
  -ArgumentList "--remote-debugging-port=${debugPort}","--user-data-dir=$tempProfile","--remote-allow-origins={{ALLOWED_ORIGIN}}" `
  -PassThru

# 4. Establish SSH reverse tunnel
Write-Host "INFO: Creating secure tunnel..." -ForegroundColor Cyan
# Assumes OpenSSH client is installed (standard in Windows 10+)
Start-Process ssh -ArgumentList `
  "-R","${debugPort}:localhost:${debugPort}", `
  "-N","-f", `
  "-o","StrictHostKeyChecking=no", `
  "-o","UserKnownHostsFile=NUL", `
  "-o","ExitOnForwardFailure=yes", `
  "-p","${remoteSshPort}", `
  "${remoteSshUser}@${remoteSshHost}" `
  -NoNewWindow

# 5. Notify server
Write-Host "INFO: Notifying server..." -ForegroundColor Cyan
$body = @{
    sessionToken = $sessionToken
    status = "ready"
} | ConvertTo-Json

Invoke-RestMethod -Uri $apiEndpoint -Method Post -Body $body -ContentType "application/json"

Write-Host "SUCCESS: Your browser is connected. Please return to the web page." -ForegroundColor Green

# Keep script alive
$chromeProcess.WaitForExit()
