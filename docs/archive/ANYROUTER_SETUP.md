# 🚀 AnyRouter.top Remote Deployment Guide

## Quick Start for AnyRouter.top

### Step 1: Configure Environment Variables

Create `.env.production` file:

```bash
# Notification URLs (Discord, Slack, email, etc.)
NOTIFICATION_URLS=discord://your-token@channel-id

# Timezone
TZ=Asia/Hong_Kong

# Web API Settings
WEB_API_PORT=3001
NODE_ENV=production
```

### Step 2: Update Config Files

Replace `config/websites.yaml` with anyrouter configuration:

```bash
# Copy anyrouter example to main config
cp config/anyrouter.example.yaml config/websites.yaml

# Or manually edit config/websites.yaml
nano config/websites.yaml
```

**Minimal config/websites.yaml:**

```yaml
websites:
  - id: anyrouter-user1
    name: "AnyRouter User 1"
    url: "https://anyrouter.top/"
    enabled: true
    method: "cookie-based"
    profile: "anyrouter-user1"
    schedule:
      time: "09:00"
      timezone: "Asia/Hong_Kong"
```

### Step 3: Deploy Docker Container

```bash
# Build Docker image
docker-compose build

# Start container
docker-compose up -d

# Verify it's running
docker-compose ps
docker-compose logs -f
```

### Step 4: Create Profile via Web UI

1. **Access Web UI:**
   ```
   http://your-server-ip:3001
   ```

2. **Install Browser Extension:**
   - Chrome: [EditThisCookie](https://chrome.google.com/webstore/detail/editthiscookie/fngmhnnpilhplaeedifhccceomclgfbg)
   - Firefox: [Cookie-Editor](https://addons.mozilla.org/firefox/addon/cookie-editor/)

3. **Export Cookies:**
   ```
   1. Open https://anyrouter.top in your browser
   2. Login with your credentials
   3. Click EditThisCookie extension → Export
   4. Copy the JSON
   ```

4. **Upload to Docker:**
   ```
   1. Open http://your-server-ip:3001
   2. Fill in form:
      - Site: anyrouter
      - User: user1
      - Login URL: https://anyrouter.top/
      - Cookies: [paste JSON]
   3. Click "Upload & Create Profile"
   4. Click "Test" to verify
   ```

### Step 5: Verify Automation

```bash
# Watch logs for scheduled check-ins
docker-compose logs -f daily-login-assistant

# Expected output:
# [09:00:00] Starting scheduled check-in for anyrouter-user1
# [09:00:05] ✅ anyrouter-user1: Check-in successful
```

---

## Configuration Tips for AnyRouter.top

### Check-in Button Selector (if needed)

If anyrouter.top has a daily check-in button:

```yaml
websites:
  - id: anyrouter-user1
    url: "https://anyrouter.top/"
    selectors:
      checkinButton: ["#checkin", ".daily-checkin", "[data-action='checkin']"]
```

### Multiple Accounts

```yaml
websites:
  # Account 1
  - id: anyrouter-user1
    schedule:
      time: "09:00"

  # Account 2 (stagger time)
  - id: anyrouter-user2
    schedule:
      time: "09:05"

  # Account 3
  - id: anyrouter-user3
    schedule:
      time: "09:10"
```

### Timezone Settings

```yaml
# Hong Kong Time
timezone: "Asia/Hong_Kong"

# Other common timezones:
# timezone: "America/New_York"  # EST/EDT
# timezone: "Europe/London"     # GMT/BST
# timezone: "Asia/Tokyo"        # JST
# timezone: "Australia/Sydney"  # AEST/AEDT
```

### Session Expiration

AnyRouter.top cookies typically last 7-30 days. Configure alerts:

```yaml
settings:
  notifications:
    sessionExpirationWarning: true
    sessionExpirationDays: 7  # Alert 7 days before
```

---

## Docker Compose Configuration

Your `docker-compose.yml` should look like:

```yaml
services:
  daily-login-assistant:
    build: .
    container_name: daily-login-assistant
    ports:
      - '3001:3001'  # Web UI
    volumes:
      # All data stays on server
      - profiles_data:/app/profiles
      - logs_data:/app/logs
      - screenshots_data:/app/screenshots
      - ./config:/app/config:ro  # Read-only config
    environment:
      NODE_ENV: production
      TZ: Asia/Hong_Kong
      NOTIFICATION_URLS: ${NOTIFICATION_URLS}
    restart: unless-stopped

volumes:
  profiles_data:
  logs_data:
  screenshots_data:
```

---

## Monitoring & Maintenance

### Health Check

```bash
# Check if container is running
docker-compose ps

# Check logs
docker-compose logs -f

# Check web UI is accessible
curl http://localhost:3001/health
```

### View Profiles

```bash
# List profiles via web UI
open http://your-server-ip:3001

# Or check directly
docker-compose exec daily-login-assistant ls -la /app/profiles/user-guided/
```

### Session Refresh (when cookies expire)

```bash
# 1. Login to anyrouter.top in your local browser
# 2. Export cookies
# 3. Upload via web UI (replaces old cookies)
# 4. No need to restart container!
```

---

## Troubleshooting

### "Check-in failed" after upload

**Cause**: Cookies expired or incomplete export

**Solution**:
1. Login to anyrouter.top again
2. Export ALL cookies (make sure extension exports all domains)
3. Re-upload via web UI

### Cannot access web UI

**Check**:
```bash
# Verify port mapping
docker-compose port daily-login-assistant 3001

# Check firewall
sudo ufw allow 3001/tcp

# Check container logs
docker-compose logs daily-login-assistant
```

### Profile not persisting

**Check volumes**:
```bash
# List volumes
docker volume ls | grep daily-login

# Inspect volume
docker volume inspect daily-login-assistant_profiles_data
```

---

## Security Recommendations

### 1. Use HTTPS (nginx reverse proxy)

```nginx
# /etc/nginx/sites-available/anyrouter-bot
server {
    listen 443 ssl;
    server_name bot.yourdomain.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    location / {
        proxy_pass http://localhost:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

### 2. Restrict Access (VPN or IP whitelist)

```yaml
# docker-compose.yml
services:
  daily-login-assistant:
    ports:
      - '127.0.0.1:3001:3001'  # Only localhost
```

### 3. Add Basic Authentication

Use nginx basic auth or SSH tunnel:

```bash
# SSH tunnel (access via localhost)
ssh -L 3001:localhost:3001 user@your-server
open http://localhost:3001
```

---

## Example: Complete Setup for AnyRouter.top

```bash
# 1. Clone/upload project to server
scp -r daily-login-assistant/ user@server:/app/

# 2. SSH to server
ssh user@server
cd /app/daily-login-assistant

# 3. Create config
cat > config/websites.yaml << 'EOF'
websites:
  - id: anyrouter-user1
    name: "AnyRouter User 1"
    url: "https://anyrouter.top/"
    enabled: true
    method: "cookie-based"
    profile: "anyrouter-user1"
    schedule:
      time: "09:00"
      timezone: "Asia/Hong_Kong"
EOF

# 4. Create environment
cat > .env.production << 'EOF'
NOTIFICATION_URLS=discord://your-token@channel
TZ=Asia/Hong_Kong
NODE_ENV=production
EOF

# 5. Deploy
docker-compose build
docker-compose up -d

# 6. Check status
docker-compose ps
docker-compose logs -f

# 7. Create profile (from local browser)
# - Install EditThisCookie
# - Login to anyrouter.top
# - Export cookies
# - Open http://server-ip:3001
# - Upload cookies

# 8. Verify automation
docker-compose logs -f | grep "anyrouter-user1"
```

---

## Daily Workflow

**Normal operation**: Zero maintenance!

**When cookies expire** (~7-30 days):
1. Receive notification: "🔴 Session Expired: anyrouter-user1"
2. Login to anyrouter.top (2 minutes)
3. Export & upload cookies (1 minute)
4. Done! ✅

**Total time**: 3 minutes/month

---

**Last Updated**: 2025-10-04
**Target Site**: https://anyrouter.top/
**Method**: Cookie Upload (Lightweight)
**Resource Usage**: ~100MB RAM, <1% CPU
