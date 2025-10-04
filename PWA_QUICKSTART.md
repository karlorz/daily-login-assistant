# PWA Script Launcher - Quick Start Guide

## Overview

Extract cookies from your local browser to Docker-based automation. No VNC, no streaming - just a 1KB script via secure SSH tunnel.

## Architecture Flow

```
User's Browser (localhost:9222)
    ↓ SSH Reverse Tunnel
Docker SSH Container (ssh-tunnel:9222)
    ↓ CDP Connection
App Container → Extract Cookies → Save Profile
```

---

## 🔧 Development (Local Testing)

### 1. Setup Environment
```bash
# No .env file needed - use .env.development directly
# Verify the development config exists
cat .env.development | grep REMOTE_SSH_HOST
# Should show: REMOTE_SSH_HOST=localhost
```

### 2. Start Services
```bash
# Use --env-file to load .env.development
docker compose --env-file .env.development up -d
docker compose ps  # Verify both containers running
```

### 3. Access Web UI
```
http://localhost:8001
```
**Note**: Internal port 3001 mapped to external port 8001

### 4. Create Profile
1. Fill form:
   - **Site**: `github-oauth`
   - **User**: `user1`
   - **URL**: `https://github.com/login`
2. Click **"Download Launcher Script"**
3. Run script:
   ```bash
   chmod +x ~/Downloads/anyrouter-launcher.sh
   ~/Downloads/anyrouter-launcher.sh
   ```
4. Login in Chrome window that opens
5. Wait for "SUCCESS" - profile created!

---

## 🚀 Production Deployment

### 1. Configure Environment
```bash
# Copy production template to .env
cp .env.production .env

# Edit with your actual values
nano .env
```

**Replace these placeholders:**
```bash
YOUR_DOCKER_HOST → your-server.com (or IP address)
CHANGE_ME_STRONG_PASSWORD → $(openssl rand -base64 32)
```

**Example `.env`:**
```bash
SSH_TUNNEL_PASSWORD=xK9mP2nQ7vL5zR8wT3jH4cF6bY1dN0sA
REMOTE_SSH_HOST=my-vps.com
REMOTE_SSH_PORT=2222
REMOTE_SSH_USER=tunnel
WEB_API_PORT=3001
API_ENDPOINT=https://my-vps.com:8001/api/tunnel-ready
ALLOWED_ORIGIN=https://my-vps.com:8001
NODE_ENV=production
LOG_LEVEL=info
```

### 2. Deploy Services
```bash
# Build and start
docker compose up -d

# Verify
docker compose ps
docker compose logs -f daily-login-assistant
```

### 3. Configure Firewall
```bash
# Allow SSH tunnel
sudo ufw allow 2222/tcp

# Allow Web UI (or use reverse proxy)
sudo ufw allow 8001/tcp
```

### 4. Access Web UI
```
https://your-server.com:8001
```

### 5. Optional: SSL with Nginx
```nginx
server {
    listen 443 ssl http2;
    server_name your-server.com;

    ssl_certificate /etc/letsencrypt/live/your-server.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-server.com/privkey.pem;

    location / {
        proxy_pass http://localhost:8001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

---

## 📋 Usage Guide

### Method 1: One-Click Script (Recommended)

1. **Access UI**: `http://localhost:8001` (dev) or `https://your-server.com:8001` (prod)
2. **Fill Form**:
   - Site Name: `github-oauth`
   - Username: `user1`
   - Login URL: `https://github.com/login`
3. **Download Script** - OS detected automatically
4. **Run Script**:
   - **macOS/Linux**: `chmod +x launcher.sh && ./launcher.sh`
   - **Windows**: Right-click `launcher.ps1` → Run with PowerShell
5. **Login** in Chrome window
6. **Done** - Profile created automatically

### Method 2: Manual Cookie Upload

1. Install [EditThisCookie](https://chrome.google.com/webstore/detail/editthiscookie/fngmhnnpilhplaeedifhccceomclgfbg)
2. Login to website
3. Export cookies (EditThisCookie → Export)
4. Paste JSON into **"Manual Upload"** tab
5. Create profile

---

## 🔍 Troubleshooting

### Port 9222 Already in Use
```bash
# Close existing Chrome instances
pkill -f "remote-debugging-port"

# Or change DEBUG_PORT in script
```

### Cannot Access UI
```bash
# Check port mapping (3001 internal → 8001 external)
docker compose ps

# Should show: 127.0.0.1:8001->3001/tcp
```

### SSH Connection Failed
```bash
# Verify SSH container running
docker compose logs ssh-tunnel

# Test SSH manually
ssh -p 2222 tunnel@localhost  # Dev
ssh -p 2222 tunnel@your-server.com  # Prod
```

### Tunnel Connected but Extraction Fails
```bash
# Check CDP is accessible from container
docker exec daily-login-assistant curl http://ssh-tunnel:9222/json

# Should return Chrome tabs JSON
```

---

## 🔒 Security Notes

### Development
- ✅ localhost only (no external access)
- ✅ Test password (`test123_local_only`)
- ✅ HTTP (no SSL needed)

### Production
- ✅ Strong SSH password (32+ chars)
- ✅ HTTPS via reverse proxy
- ✅ Firewall rules (ports 2222, 8001)
- ✅ Consider SSH key auth (see PWA_DEPLOYMENT.md)

---

## 📊 Quick Reference

| Item | Development | Production |
|------|------------|------------|
| **UI URL** | `http://localhost:8001` | `https://your-server.com:8001` |
| **SSH Host** | `localhost:2222` | `your-server.com:2222` |
| **Env File** | `.env.development` (via `--env-file`) | `.env` (default) |
| **Password** | `test123_local_only` | Strong (32+ chars) |
| **SSL** | Not needed | Required (via nginx) |

---

## 🎯 Next Steps

1. ✅ Test locally with development setup
2. ✅ Verify profile creation works
3. 📖 Read [PWA_DEPLOYMENT.md](./PWA_DEPLOYMENT.md) for production hardening
4. 🔐 Setup SSH key authentication (recommended)
5. 📊 Configure monitoring (optional)

---

**For detailed deployment guide**: See [PWA_DEPLOYMENT.md](./PWA_DEPLOYMENT.md)
**For environment config help**: See [ENV_CONFIG_GUIDE.md](./ENV_CONFIG_GUIDE.md)
**For troubleshooting**: See [PWA_DEPLOYMENT.md#troubleshooting](./PWA_DEPLOYMENT.md#troubleshooting)
