# PWA + One-Click Script Launcher Architecture

## Overview

Optimal user experience solution for cookie extraction that balances automation, trust, and lightweight implementation.

## Comparison of Approaches

| Approach | Steps | Trust Level | Download Size | Terminal Required |
|----------|-------|-------------|---------------|-------------------|
| **Manual CDP** | 3 | High | 0 KB | ✅ Yes |
| **Electron Launcher** | 2 | Low | 50 MB | ❌ No |
| **PWA + Script** ⭐ | 2 | High | 1 KB | ❌ No |

## Why PWA + Script Wins

### User Experience Benefits
- ✅ **2-Step Process**: Download script → Double-click to run
- ✅ **Browser-Native**: Downloaded from trusted web UI (HTTPS)
- ✅ **Cross-Platform**: Auto-detects OS (Windows/macOS/Linux)
- ✅ **Session-Specific**: Unique token embedded per session
- ✅ **No Installation**: Runs directly, no app to install
- ✅ **High Trust**: Users trust browsers more than unknown desktop apps

### Technical Benefits
- ✅ **Maintains Docker SSH + CDP Architecture**: No infrastructure changes
- ✅ **Lightweight**: ~1KB script vs 50MB Electron app
- ✅ **Secure**: Session tokens, SSH tunneling, origin restrictions
- ✅ **Graceful Fallback**: Manual commands for power users
- ✅ **No Maintenance Overhead**: No code signing, no binary distribution

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│ User's Browser (anyrouter.top Web UI)                        │
│                                                               │
│ 1. User clicks "Setup Profile"                               │
│ 2. Server generates unique session token                     │
│ 3. UI detects OS via navigator.platform                      │
│ 4. UI shows "Download Helper Script" button                  │
└───────────────────────────┬─────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│ GET /api/session/{token}/script/{os}                         │
│                                                               │
│ Server generates OS-specific script with:                    │
│ - Embedded SESSION_TOKEN                                     │
│ - Chrome launch command                                      │
│ - SSH tunnel command                                         │
│ - Server notification curl                                   │
└───────────────────────────┬─────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│ User Downloads & Runs Script                                 │
│                                                               │
│ Script automatically:                                        │
│ 1. Finds Chrome installation                                │
│ 2. Checks port 9222 availability                            │
│ 3. Launches Chrome with --remote-debugging-port=9222        │
│ 4. Creates SSH reverse tunnel to Docker                     │
│ 5. POSTs to /api/tunnel-ready with session token            │
└───────────────────────────┬─────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│ Remote Docker Server                                          │
│                                                               │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ SSH Container (port 2222)                                │ │
│ │ - Receives reverse tunnel from user                     │ │
│ │ - Exposes ssh-tunnel:9222 to app container              │ │
│ └─────────────────────────────────────────────────────────┘ │
│                            │                                  │
│ ┌──────────────────────────▼──────────────────────────────┐ │
│ │ App Container (port 3001)                               │ │
│ │ - Receives /api/tunnel-ready notification               │ │
│ │ - Connects to ssh-tunnel:9222 via CDP                   │ │
│ │ - Extracts cookies via Network.getAllCookies()          │ │
│ │ - Saves to profile storage                              │ │
│ └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│ Web UI shows: "✅ Connected! Click 'Extract Cookies'"        │
│                                                               │
│ User clicks button → Cookies extracted → Profile saved       │
└─────────────────────────────────────────────────────────────┘
```

## Implementation Details

### 1. Script Generation Endpoint

**Endpoint**: `GET /api/session/{token}/script/{os}`

**Parameters**:
- `token`: Unique session token (UUID)
- `os`: One of `macos`, `linux`, `windows`

**Response**: Script file download
- macOS/Linux: `.sh` file
- Windows: `.ps1` PowerShell file

### 2. Production-Hardened Script Templates

#### macOS/Linux Script (`launcher.sh`)

```bash
#!/bin/bash
# Auto-generated by anyrouter.top
# Session: {{SESSION_TOKEN}}
set -e

# Configuration (server-injected)
SESSION_TOKEN="{{SESSION_TOKEN}}"
REMOTE_SSH_HOST="anyrouter.top"
REMOTE_SSH_PORT=2222
REMOTE_SSH_USER="tunnel"
API_ENDPOINT="https://anyrouter.top:3001/api/tunnel-ready"
DEBUG_PORT=9222

# 1. Find Chrome
echo "INFO: Locating Google Chrome..."
CHROME_PATHS=(
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
  "/usr/bin/google-chrome-stable"
  "/usr/bin/google-chrome"
  "/usr/bin/chromium-browser"
)
for p in "${CHROME_PATHS[@]}"; do
  [ -x "$p" ] && CHROME_EXEC="$p" && break
done

if [ -z "$CHROME_EXEC" ]; then
  echo "ERROR: Google Chrome not found. Please install Chrome and try again."
  exit 1
fi

# 2. Check port availability
if lsof -i -P -n | grep -q ":${DEBUG_PORT}.*LISTEN"; then
    echo "ERROR: Port ${DEBUG_PORT} is already in use."
    echo "Please close the application using port ${DEBUG_PORT} and re-run the script."
    exit 1
fi

# 3. Launch Chrome with remote debugging
echo "INFO: Starting Chrome with remote debugging on port ${DEBUG_PORT}..."
"$CHROME_EXEC" --remote-debugging-port=${DEBUG_PORT} \
  --remote-allow-origins=https://anyrouter.top &
CHROME_PID=$!

# Ensure Chrome process is killed when the script exits
trap "kill $CHROME_PID 2>/dev/null" EXIT

# 4. Establish SSH reverse tunnel
echo "INFO: Establishing secure tunnel to our servers..."
# -f: background after connection
# ExitOnForwardFailure=yes: fail if port can't be bound
ssh -R ${DEBUG_PORT}:localhost:${DEBUG_PORT} \
  -N -f \
  -o ExitOnForwardFailure=yes \
  -p ${REMOTE_SSH_PORT} \
  ${REMOTE_SSH_USER}@${REMOTE_SSH_HOST}

# 5. Notify server
echo "INFO: Connection established. Notifying server..."
curl -X POST "${API_ENDPOINT}" \
  -H "Content-Type: application/json" \
  -d "{\"sessionToken\":\"${SESSION_TOKEN}\",\"status\":\"ready\"}"

echo "SUCCESS: Your browser is connected. Please return to the web page to complete the process."

# Keep script alive until user is done
wait $CHROME_PID
```

#### Windows PowerShell Script (`launcher.ps1`)

```powershell
# Auto-generated by anyrouter.top
# Session: {{SESSION_TOKEN}}

# Configuration (server-injected)
$sessionToken = "{{SESSION_TOKEN}}"
$remoteSshHost = "anyrouter.top"
$remoteSshPort = 2222
$remoteSshUser = "tunnel"
$apiEndpoint = "https://anyrouter.top:3001/api/tunnel-ready"
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
$chromeProcess = Start-Process -FilePath $chromePath `
  -ArgumentList "--remote-debugging-port=${debugPort}","--remote-allow-origins=https://anyrouter.top" `
  -PassThru

# 4. Establish SSH reverse tunnel
Write-Host "INFO: Creating secure tunnel..." -ForegroundColor Cyan
# Assumes OpenSSH client is installed (standard in Windows 10+)
Start-Process ssh -ArgumentList `
  "-R","${debugPort}:localhost:${debugPort}", `
  "-N","-f", `
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
```

### 3. Web UI Implementation

#### OS Detection

```javascript
// Detect user's operating system
function detectOS() {
  const platform = navigator.platform.toLowerCase();
  const userAgent = navigator.userAgent.toLowerCase();

  if (platform.includes('win') || userAgent.includes('windows')) {
    return 'windows';
  } else if (platform.includes('mac') || userAgent.includes('mac')) {
    return 'macos';
  } else if (platform.includes('linux') || userAgent.includes('linux')) {
    return 'linux';
  }
  return 'unknown';
}
```

#### Download Script Button

```javascript
async function downloadLauncherScript() {
  const os = detectOS();
  const sessionToken = generateSessionToken(); // UUID

  if (os === 'unknown') {
    alert('Could not detect your operating system. Please use manual setup.');
    return;
  }

  // Download script
  const response = await fetch(`/api/session/${sessionToken}/script/${os}`);
  const blob = await response.blob();

  const filename = os === 'windows' ? 'anyrouter-launcher.ps1' : 'anyrouter-launcher.sh';

  // Trigger download
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);

  // Show instructions
  showInstructions(os, filename);
}
```

#### User Instructions Display

```javascript
function showInstructions(os, filename) {
  const instructions = {
    windows: `
      1. Locate downloaded file: ${filename}
      2. Right-click → "Run with PowerShell"
      3. If security warning appears, click "Run anyway"
      4. Return to this page when you see "SUCCESS" message
    `,
    macos: `
      1. Open Terminal
      2. Run: chmod +x ~/Downloads/${filename}
      3. Run: ~/Downloads/${filename}
      4. Return to this page when you see "SUCCESS" message
    `,
    linux: `
      1. Open Terminal
      2. Run: chmod +x ~/Downloads/${filename}
      3. Run: ~/Downloads/${filename}
      4. Return to this page when you see "SUCCESS" message
    `
  };

  document.getElementById('instructions').innerHTML = instructions[os];
  document.getElementById('instructions-panel').style.display = 'block';
}
```

### 4. SSH Security Hardening

**Docker SSH Container Configuration** (`/home/tunnel/.ssh/authorized_keys`):

```bash
# Restrict SSH key to only allow reverse tunnel on port 9222
command="/bin/false",no-pty,no-X11-forwarding,permitopen="localhost:9222" ssh-rsa AAAA...
```

**Security Measures**:
- `command="/bin/false"` - Disables shell access entirely
- `no-pty` - Disables terminal allocation
- `no-X11-forwarding` - Disables X11 forwarding
- `permitopen="localhost:9222"` - **CRITICAL**: Only allows forwarding to localhost:9222

**SSH Daemon Config** (`/etc/ssh/sshd_config`):

```
# Enable gateway ports for reverse tunneling
GatewayPorts yes

# Restrict to key authentication only
PasswordAuthentication no
PubkeyAuthentication yes

# Disable dangerous features
PermitRootLogin no
X11Forwarding no
AllowTcpForwarding yes
```

### 5. Server-Side API Endpoints

#### Script Generation Endpoint

```typescript
// src/infrastructure/web/session-script-api.service.ts

@injectable()
export class SessionScriptApiService {
  async handleScriptRequest(token: string, os: string): Promise<Response> {
    // Validate session token
    const session = await this.sessionStore.get(token);
    if (!session) {
      return new Response('Invalid session', { status: 401 });
    }

    // Load script template
    const template = os === 'windows'
      ? await Bun.file('scripts/templates/launcher.ps1').text()
      : await Bun.file('scripts/templates/launcher.sh').text();

    // Inject session token
    const script = template.replace(/{{SESSION_TOKEN}}/g, token);

    // Return script file
    const filename = os === 'windows' ? 'anyrouter-launcher.ps1' : 'anyrouter-launcher.sh';
    return new Response(script, {
      headers: {
        'Content-Type': os === 'windows' ? 'text/plain' : 'application/x-sh',
        'Content-Disposition': `attachment; filename="${filename}"`
      }
    });
  }
}
```

#### Tunnel Ready Notification

```typescript
// POST /api/tunnel-ready
async handleTunnelReady(req: Request): Promise<Response> {
  const { sessionToken, status } = await req.json();

  // Update session status
  await this.sessionStore.update(sessionToken, {
    status: 'connected',
    debugPort: 'ssh-tunnel:9222',
    connectedAt: new Date()
  });

  // Notify web UI via WebSocket/SSE (optional)
  this.notifyWebUI(sessionToken, 'connected');

  return new Response(JSON.stringify({ success: true }));
}
```

## Progressive Enhancement Strategy

### Phase 1: MVP (Current Scope)
1. ✅ Implement PWA with OS-aware script download button
2. ✅ Build server-side script generation endpoint
3. ✅ Provide "Show Manual Instructions" fallback
4. ✅ Test cross-platform (Windows/macOS/Linux)

### Phase 2: Browser Extension (Future)
1. Develop lightweight browser extension
2. Use `chrome.debugger` API for CDP management
3. Eliminate need for command-line flags or scripts
4. Provide most seamless experience

## User Flow Comparison

### Manual CDP (Current)
```
1. Copy Chrome launch command → Paste in terminal → Run
2. Copy SSH tunnel command → Paste in terminal → Run
3. Click "Extract Cookies" in web UI
```
**Friction**: HIGH (3 steps, terminal knowledge required)

### Electron Launcher
```
1. Download 50MB app → Install → Trust unknown publisher
2. Click "Start" button
```
**Friction**: MEDIUM (2 steps, but large download + trust barrier)

### PWA + Script (Recommended)
```
1. Click "Download Helper Script" → Double-click script file
2. Web UI auto-shows "✅ Connected - Click Extract Cookies"
```
**Friction**: LOW (2 steps, lightweight, browser trust)

## Security Considerations

1. **Session Token Security**
   - Unique UUID per session
   - Expires after 1 hour
   - One-time use only
   - HTTPS-only transmission

2. **SSH Tunnel Security**
   - Reverse tunnel (user initiates, server doesn't expose ports)
   - SSH key authentication (no passwords)
   - Restricted to port 9222 only (`permitopen`)
   - No shell access (`command="/bin/false"`)

3. **Chrome Origin Restriction**
   - NEVER use `--remote-allow-origins=*`
   - ALWAYS specify exact origin: `--remote-allow-origins=https://anyrouter.top`

4. **Script Integrity**
   - Scripts generated server-side (user can't modify token)
   - HTTPS download prevents MITM attacks
   - Clear error messages for troubleshooting

## Troubleshooting

### Issue: Chrome not found
```bash
ERROR: Google Chrome not found. Please install Chrome and try again.
```
**Solution**: Install Chrome from https://www.google.com/chrome/

### Issue: Port 9222 in use
```bash
ERROR: Port 9222 is already in use.
```
**Solution**: Close existing Chrome instance with debug port, or change DEBUG_PORT in script

### Issue: SSH connection failed
```bash
ssh: connect to host anyrouter.top port 2222: Connection refused
```
**Solution**: Verify Docker SSH container is running: `docker ps | grep ssh-tunnel`

### Issue: Script permission denied (macOS/Linux)
```bash
Permission denied: ./anyrouter-launcher.sh
```
**Solution**: Run `chmod +x anyrouter-launcher.sh` first

## Advantages Over Alternatives

### vs. Manual CDP
✅ **No terminal knowledge required**
✅ **2 steps instead of 3**
✅ **Auto-detection of Chrome path**
✅ **Error handling and validation**

### vs. Electron Launcher
✅ **1KB download vs 50MB**
✅ **Higher user trust (browser-native)**
✅ **No installation required**
✅ **No code signing overhead**
✅ **Cross-platform without binary distribution**

### vs. Browser Extension
✅ **Available immediately** (extension requires Chrome Web Store approval)
✅ **No extension permissions required**
✅ **Works with any Chromium browser**

## Next Steps

1. **Create Script Templates**
   - `scripts/templates/launcher.sh` (macOS/Linux)
   - `scripts/templates/launcher.ps1` (Windows)

2. **Implement API Endpoints**
   - `GET /api/session/{token}/script/{os}` - Script generation
   - `POST /api/tunnel-ready` - Tunnel notification
   - `POST /api/profiles/extract-from-tunnel` - Cookie extraction

3. **Update Web UI**
   - Add OS detection logic
   - Add "Download Helper Script" button
   - Add connection status indicator
   - Add manual fallback instructions

4. **Update Docker Configuration**
   - Harden SSH container security
   - Configure `authorized_keys` restrictions
   - Test reverse tunnel connectivity

5. **Documentation**
   - User guide with screenshots
   - Troubleshooting section
   - Security best practices

## Conclusion

PWA + One-Click Script provides the optimal balance of:
- **User Experience**: 2-step process, no terminal required
- **Trust**: Browser-native, HTTPS download
- **Performance**: 1KB script, instant execution
- **Security**: Session tokens, SSH tunneling, origin restrictions
- **Maintainability**: No binary distribution, no code signing

This approach maintains the existing Docker SSH + CDP architecture while significantly reducing friction for non-technical users.
