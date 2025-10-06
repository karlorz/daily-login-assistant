# Remote Docker Deployment - Cookie Upload Method

## 🎯 Lightweight Solution (No VNC Required)

Instead of running a browser in Docker with VNC, we use a **simpler cookie upload approach**:

1. User logs in locally with **any browser**
2. User exports cookies using browser extension
3. User uploads cookies to Docker container via web UI
4. Container uses uploaded cookies for automation

**Advantages**:
- ✅ **Zero network overhead** (no VNC streaming)
- ✅ **Works with any browser** (Chrome, Firefox, Safari)
- ✅ **All data stays on remote server**
- ✅ **Simple user experience**

---

## 📋 Step-by-Step Workflow

### **Step 1: Install Cookie Export Extension**

**Chrome/Edge** - [EditThisCookie](https://chrome.google.com/webstore/detail/editthiscookie/fngmhnnpilhplaeedifhccceomclgfbg):
```
1. Install extension
2. Login to your website
3. Click extension icon
4. Click "Export" (exports as JSON)
5. Copy the JSON
```

**Firefox** - [Cookie-Editor](https://addons.mozilla.org/en-US/firefox/addon/cookie-editor/):
```
1. Install extension
2. Login to your website
3. Click extension icon
4. Click "Export" → "JSON"
5. Copy the JSON
```

### **Step 2: Access Web UI**

```bash
# Open browser to your Docker container
http://your-server-ip:3001/

# You'll see the profile manager UI
```

### **Step 3: Upload Cookies**

```
1. Click "Create New Profile"
2. Enter:
   - Site: anyrouter
   - User: user1
   - Login URL: https://anyrouter.top/
3. Paste your exported cookies (JSON format)
4. Click "Upload Cookies"
```

### **Step 4: Test Profile**

```
1. Find your profile in the list
2. Click "Test" button
3. Verify check-in works
```

---

## 🔄 Cookie Format

Your exported cookies should look like this:

```json
[
  {
    "domain": ".anyrouter.top",
    "expirationDate": 1735689600,
    "hostOnly": false,
    "httpOnly": false,
    "name": "session_id",
    "path": "/",
    "sameSite": "no_restriction",
    "secure": true,
    "session": false,
    "storeId": "0",
    "value": "your_session_value_here"
  },
  {
    "domain": ".anyrouter.top",
    "name": "auth_token",
    "value": "your_auth_token_here",
    ...
  }
]
```

---

## 🐳 Docker Setup (Lightweight)

**No Xvfb, No VNC, No noVNC needed!**

```yaml
# docker-compose.yml
services:
  daily-login-assistant:
    build: .
    ports:
      - '3001:3001'  # Web UI only
    volumes:
      - profiles_data:/app/profiles
      - logs_data:/app/logs
    environment:
      NODE_ENV: production
      NOTIFICATION_URLS: discord://token@channel
```

**Dockerfile** (simplified):
```dockerfile
FROM mcr.microsoft.com/playwright:v1.55.1-noble

# Install Bun
RUN curl -fsSL https://bun.sh/install | BUN_INSTALL=/usr/local bash

# Copy application
COPY . /app
WORKDIR /app

# Install dependencies and build
RUN bun install && bun run build

# Expose web UI port only
EXPOSE 3001

# Start application
CMD ["bun", "dist/index.js"]
```

---

## 🔒 Session Persistence

**How long do cookies last?**
- Most sites: 7-30 days
- GitHub: ~30 days
- Discord: ~7 days
- Anyrouter: varies (check cookie expirationDate)

**When session expires:**
1. Receive notification via shoutrrr
2. Login locally again
3. Export new cookies
4. Upload via web UI
5. Done!

---

## ✅ Advantages over VNC Method

| Feature | VNC Method | Cookie Upload |
|---------|------------|---------------|
| **Network Usage** | High (video streaming) | Minimal (JSON upload) |
| **CPU Usage** | High (Xvfb + VNC + noVNC) | Low (just web server) |
| **Memory Usage** | ~500MB+ | ~100MB |
| **Setup Complexity** | Complex (3 services) | Simple (1 web server) |
| **User Experience** | Browser-in-browser | Native browser |
| **Works Offline** | No (needs VNC connection) | Yes (export locally) |

---

## 🧪 Testing Workflow

### Test Locally First

```bash
# 1. Start local development server
bun run dev

# 2. Open web UI
open http://localhost:3001

# 3. Login to anyrouter.top in Chrome
# 4. Export cookies using EditThisCookie
# 5. Upload via web UI
# 6. Test check-in
```

### Deploy to Docker

```bash
# 1. Build image (lightweight, no VNC)
docker-compose build

# 2. Start container
docker-compose up -d

# 3. Access web UI
open http://your-server-ip:3001

# 4. Upload cookies for each profile
# 5. Verify automated check-ins work
```

---

## 📊 Cookie Security Best Practices

### DO:
- ✅ Use HTTPS for cookie upload
- ✅ Validate cookie format before saving
- ✅ Store cookies with restricted permissions (700)
- ✅ Encrypt cookies at rest (optional)

### DON'T:
- ❌ Share cookies between users
- ❌ Commit cookies to git
- ❌ Log cookie values
- ❌ Upload cookies over HTTP

---

## 🔧 Troubleshooting

### "Check-in failed after cookie upload"

**Possible causes:**
1. Cookies expired before upload
2. Missing required cookies (check all domains)
3. Website changed session format

**Solution:**
- Re-login and export fresh cookies
- Verify all cookies from the domain are included
- Check cookie expirationDate is in future

### "Cannot access web UI"

**Check:**
```bash
# Verify container is running
docker-compose ps

# Check port mapping
docker-compose port daily-login-assistant 3001

# Verify firewall allows port 3001
sudo ufw allow 3001/tcp
```

---

## 📝 Next Steps

1. ✅ Remove VNC/Xvfb from Dockerfile
2. ✅ Update web UI to accept cookie upload
3. ✅ Add cookie validation
4. ✅ Test with anyrouter.top
5. ✅ Document recovery process

---

**Last Updated**: 2025-10-04
**Method**: Cookie Upload (Lightweight)
**Resource Usage**: Minimal (~100MB RAM, <1% CPU)
