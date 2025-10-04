# CDP Remote Debugging Architecture - All Docker Solution

## Overview

Complete Docker-based solution for cookie extraction using Chrome DevTools Protocol (CDP) with SSH reverse tunneling.

**Key Principle**: User runs Chrome locally with debug port, creates SSH tunnel to Docker container, server extracts cookies via CDP.

## Architecture Diagram

```
User's Local Machine              Remote Server (anyrouter.top)
┌──────────────────────────┐     ┌────────────────────────────────────┐
│                          │     │  Docker Compose                    │
│  Chrome Browser          │     │                                    │
│  localhost:9222          │     │  ┌──────────────────────────────┐ │
│       ↑                  │     │  │  SSH Container               │ │
│       │                  │     │  │  - openssh-server            │ │
│       │                  │     │  │  - Port 2222:22              │ │
│  User logs in manually   │     │  │  - User: tunnel              │ │
│                          │     │  │  - Allows reverse tunnels    │ │
│                          │     │  └────────────┬─────────────────┘ │
│                          │     │               │                   │
│  SSH Tunnel:             │     │  ┌────────────▼─────────────────┐ │
│  ssh -R 9222:localhost:  │     │  │  App Container               │ │
│      9222 tunnel@        │ ──> │  │  - daily-login-assistant     │ │
│      anyrouter.top       │     │  │  - Connects to ssh:9222      │ │
│      -p 2222             │     │  │  - Extracts cookies via CDP  │ │
│                          │     │  │  - REST API on port 3001     │ │
│                          │     │  └──────────────────────────────┘ │
│                          │     │               │                   │
│  Web UI:                 │     │  Published Ports:                 │
│  https://anyrouter.top   │ <── │  - 2222:22 (SSH)                  │
│                          │     │  - 3001:3001 (REST API)           │
└──────────────────────────┘     └────────────────────────────────────┘
```

## Docker Compose Configuration

### docker-compose.yml

```yaml
version: '3.8'

services:
  # SSH Tunnel Service
  ssh-tunnel:
    image: lscr.io/linuxserver/openssh-server:latest
    container_name: ssh-tunnel
    environment:
      - PUID=1000
      - PGID=1000
      - TZ=America/New_York
      - USER_NAME=tunnel
      - USER_PASSWORD=changeme  # Change in production!
      - PASSWORD_ACCESS=true
      - GATEWAY_PORTS=true  # Allow reverse tunnels
    ports:
      - "2222:2222"  # SSH on port 2222 (not 22)
    volumes:
      - ./ssh-config:/config
    restart: unless-stopped
    networks:
      - app-network

  # Daily Login Assistant
  daily-login-assistant:
    build: .
    container_name: daily-login-assistant
    environment:
      - NODE_ENV=production
      - NOTIFICATION_URLS=${NOTIFICATION_URLS}
    ports:
      - "3001:3001"  # REST API
    volumes:
      - ./config:/app/config
      - ./profiles:/app/profiles
      - ./logs:/app/logs
      - ./screenshots:/app/screenshots
    depends_on:
      - ssh-tunnel
    networks:
      - app-network
    restart: unless-stopped

networks:
  app-network:
    driver: bridge
```

## Implementation Steps

### 1. Server Setup (Remote)

```bash
# Clone repository
git clone <repo-url>
cd daily-login-assistant

# Create SSH config directory
mkdir -p ssh-config

# Start services
docker-compose up -d

# Verify SSH service
docker logs ssh-tunnel

# Verify app service
docker logs daily-login-assistant
```

### 2. User Setup (Local Machine)

#### Step 1: Start Chrome with Debug Port
```bash
# macOS
/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome \
  --remote-debugging-port=9222 \
  --remote-allow-origins=https://anyrouter.top \
  --user-data-dir=/tmp/chrome-debug

# Linux
google-chrome \
  --remote-debugging-port=9222 \
  --remote-allow-origins=https://anyrouter.top \
  --user-data-dir=/tmp/chrome-debug

# Windows
"C:\Program Files\Google\Chrome\Application\chrome.exe" \
  --remote-debugging-port=9222 \
  --remote-allow-origins=https://anyrouter.top \
  --user-data-dir=C:\temp\chrome-debug
```

#### Step 2: Create SSH Reverse Tunnel
```bash
ssh -R 9222:localhost:9222 \
    -p 2222 \
    tunnel@anyrouter.top
```

**Explanation:**
- `-R 9222:localhost:9222` - Forward remote port 9222 to local port 9222
- `-p 2222` - Connect to Docker SSH on port 2222
- `tunnel@anyrouter.top` - SSH user created in Docker

#### Step 3: Login to Website
1. In the Chrome instance, navigate to `https://anyrouter.top`
2. Login manually (supports OAuth, 2FA, any auth method)
3. Keep browser and SSH tunnel open

#### Step 4: Extract Cookies via Web UI
1. Open web UI: `https://anyrouter.top:3001`
2. Click "Extract Cookies from Debug Browser"
3. System extracts cookies and creates profile
4. Done!

## REST API Implementation

### Endpoint: Create Profile from Debug Browser

**Request:**
```http
POST /api/profiles/create-from-debug
Content-Type: application/json

{
  "site": "anyrouter",
  "user": "user1",
  "loginUrl": "https://anyrouter.top/",
  "debugPort": "ssh-tunnel:9222"
}
```

**Response:**
```json
{
  "success": true,
  "profileId": "anyrouter-user1",
  "cookies": 15,
  "message": "Profile created successfully"
}
```

### Implementation

**File: `src/infrastructure/browser/cdp-cookie-extractor.service.ts`**

```typescript
import { injectable } from 'inversify';
import type { Cookie } from '../../../core/types';

@injectable()
export class CDPCookieExtractorService {
  /**
   * Extract cookies from Chrome with remote debugging enabled
   */
  async extractCookiesFromDebugPort(
    debugPort: string,
    targetUrl: string
  ): Promise<Cookie[]> {
    try {
      // 1. Fetch available tabs from Chrome
      const response = await fetch(`http://${debugPort}/json`);
      if (!response.ok) {
        throw new Error(
          `Failed to connect to Chrome debug port at ${debugPort}. ` +
          `Is Chrome running with --remote-debugging-port=9222?`
        );
      }

      const tabs = await response.json();

      // 2. Find the tab matching target URL
      const targetTab = tabs.find((tab: any) =>
        tab.url.startsWith(targetUrl)
      );

      if (!targetTab) {
        throw new Error(
          `Could not find an open tab for URL: ${targetUrl}. ` +
          `Please ensure you've logged in to this website in Chrome.`
        );
      }

      // 3. Connect to WebSocket
      const ws = new WebSocket(targetTab.webSocketDebuggerUrl);

      // 4. Send CDP command to get all cookies
      await this.sendCDPCommand(ws, 'Network.getAllCookies', {});

      // 5. Wait for response
      const response = await this.waitForCDPResponse(ws, 1);

      // 6. Close WebSocket
      ws.close();

      return response.result.cookies;
    } catch (error) {
      throw new Error(`Cookie extraction failed: ${error.message}`);
    }
  }

  private async sendCDPCommand(
    ws: WebSocket,
    method: string,
    params: any
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      ws.onopen = () => {
        ws.send(JSON.stringify({
          id: 1,
          method,
          params
        }));
        resolve();
      };

      ws.onerror = (error) => reject(error);
    });
  }

  private async waitForCDPResponse(
    ws: WebSocket,
    id: number
  ): Promise<any> {
    return new Promise((resolve, reject) => {
      ws.onmessage = (event) => {
        const response = JSON.parse(event.data);
        if (response.id === id) {
          resolve(response);
        }
      };

      setTimeout(() => {
        reject(new Error('CDP command timeout'));
      }, 10000);
    });
  }
}
```

**File: `src/infrastructure/web/cookie-web-api.service.ts`**

```typescript
// Add new endpoint
private async handleCreateFromDebug(req: Request): Promise<Response> {
  try {
    const body = await req.json();
    const { site, user, loginUrl, debugPort = 'ssh-tunnel:9222' } = body;

    // Extract cookies from debug browser
    const cookies = await this.cdpExtractor.extractCookiesFromDebugPort(
      debugPort,
      loginUrl
    );

    // Create profile with cookies
    const result = await this.cookieProfileService.createProfileFromCookies(
      site,
      user,
      loginUrl,
      cookies
    );

    return new Response(JSON.stringify({
      success: true,
      profileId: result.profileId,
      cookies: cookies.length,
      message: 'Profile created successfully'
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
```

## Security Considerations

### 1. SSH Authentication
```bash
# Production: Use SSH keys instead of password
ssh-keygen -t ed25519 -f ~/.ssh/anyrouter_tunnel
ssh-copy-id -i ~/.ssh/anyrouter_tunnel.pub -p 2222 tunnel@anyrouter.top

# Connect with key
ssh -R 9222:localhost:9222 \
    -p 2222 \
    -i ~/.ssh/anyrouter_tunnel \
    tunnel@anyrouter.top
```

### 2. Chrome Origin Restriction
```bash
# NEVER use wildcard
❌ --remote-allow-origins=*

# Always specify exact origin
✅ --remote-allow-origins=https://anyrouter.top
```

### 3. Environment Variables
```bash
# .env file
SSH_USER=tunnel
SSH_PASSWORD=your-secure-password-here
ALLOWED_ORIGIN=https://anyrouter.top
```

## Network Flow

```
1. User starts Chrome with debug port 9222 (local only)
   └─> localhost:9222 (user's machine)

2. User creates SSH reverse tunnel to Docker
   └─> ssh -R 9222:localhost:9222 -p 2222 tunnel@anyrouter.top

3. Docker SSH container creates tunnel endpoint
   └─> ssh-tunnel:9222 (inside Docker network)

4. App container connects to ssh-tunnel:9222
   └─> GET http://ssh-tunnel:9222/json
   └─> WebSocket to ws://ssh-tunnel:9222/devtools/...
   └─> CDP command: Network.getAllCookies()

5. Cookies returned to app
   └─> Save to profile storage
   └─> Return success to user
```

## Troubleshooting

### Issue: Cannot connect to SSH
```bash
# Check SSH container is running
docker ps | grep ssh-tunnel

# Check logs
docker logs ssh-tunnel

# Test connection
ssh -p 2222 tunnel@anyrouter.top
```

### Issue: Cannot connect to Chrome debug port
```bash
# Verify Chrome is running with correct flags
curl http://localhost:9222/json

# Verify SSH tunnel is active
ssh -R 9222:localhost:9222 -p 2222 tunnel@anyrouter.top
# In another terminal:
curl http://localhost:9222/json  # Should fail
# On server:
curl http://localhost:9222/json  # Should work via tunnel
```

### Issue: Tab not found
```bash
# Ensure you're logged into the website
# Check Chrome tabs
curl http://localhost:9222/json | jq '.[] | {title, url}'

# Verify loginUrl matches
# Example: If logged in URL is https://anyrouter.top/dashboard
# Then loginUrl should be https://anyrouter.top/
```

## Advantages

✅ **REST API Only** - No WebSocket client-side
✅ **Lightweight Server** - No VNC/Xvfb/streaming
✅ **Universal Auth** - OAuth, 2FA, any login method
✅ **Secure** - SSH tunnel encryption
✅ **All Docker** - Complete containerization
✅ **Flexible Port** - SSH on any port (not just 22)
✅ **Multi-User** - Each user creates their own tunnel

## Alternative: Local Deployment

For simpler setup without SSH tunneling:

```yaml
# docker-compose.local.yml
version: '3.8'

services:
  daily-login-assistant:
    build: .
    network_mode: "host"  # Access host's localhost:9222
    volumes:
      - ./config:/app/config
      - ./profiles:/app/profiles
```

**User flow:**
```bash
# Start app
docker-compose -f docker-compose.local.yml up -d

# Start Chrome
chrome --remote-debugging-port=9222

# Use web UI on localhost:3001
```

## Next Steps

1. ✅ Architecture designed
2. ⏳ Implement `CDPCookieExtractorService`
3. ⏳ Add REST API endpoint `/api/profiles/create-from-debug`
4. ⏳ Update web UI with debug browser instructions
5. ⏳ Test SSH tunnel + cookie extraction
6. ⏳ Document user guide with screenshots
