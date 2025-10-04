# ✅ Cookie Upload System - Ready to Test!

## 🎉 Server Status: RUNNING

```
🌐 Cookie Upload Web API: http://localhost:3001/
📊 Health Check: http://localhost:3001/health
✅ Status: Online and ready
```

---

## 🧪 Testing Checklist for AnyRouter.top

### Step 1: Access Web UI ✅
```bash
# Open in your browser:
http://localhost:3001/

# You should see:
# - Cookie export instructions
# - Upload form
# - Profile list (empty initially)
```

### Step 2: Install Browser Extension
- **Chrome**: [EditThisCookie](https://chrome.google.com/webstore/detail/editthiscookie/fngmhnnpilhplaeedifhccceomclgfbg)
- **Firefox**: [Cookie-Editor](https://addons.mozilla.org/firefox/addon/cookie-editor/)

### Step 3: Export Cookies from AnyRouter.top
1. Open https://anyrouter.top/ in your browser
2. Login with your credentials
3. Click EditThisCookie extension → Export
4. Copy the JSON

### Step 4: Upload Cookies
1. Go to http://localhost:3001/
2. Fill in the form:
   - **Site**: `anyrouter`
   - **User**: `user1`
   - **Login URL**: `https://anyrouter.top/`
   - **Cookies**: [paste JSON from step 3]
3. Click "Upload & Create Profile"
4. Wait for success message

### Step 5: Test Profile
1. Find "anyrouter-user1" in the profile list
2. Click "Test" button
3. Should see: ✅ Check-in successful!

---

## 📁 Production Config Files Created

### For Docker Deployment

**Config Files**:
```
config/websites.production.yaml  ✅ AnyRouter.top config
config/settings.production.yaml  ✅ Headless server settings
config/anyrouter.example.yaml    ✅ Multiple users example
```

**Example Deployment**:
```bash
# Copy production config
cp config/websites.production.yaml config/websites.yaml
cp config/settings.production.yaml config/settings.yaml

# Build Docker
docker-compose build

# Deploy
docker-compose up -d

# Access web UI from server
http://your-server-ip:3001/
```

---

## 📋 Config Comparison

| File | Purpose | Status |
|------|---------|--------|
| `websites.yaml` | Development (test sites) | Keep for testing |
| `websites.production.yaml` | Production (anyrouter) | ✅ Ready for Docker |
| `websites.example.yaml` | Reference/examples | Archive |
| `sites-reference.yaml` | Old format | Can delete |
| `settings.yaml` | Development settings | Keep |
| `settings.production.yaml` | Production settings | ✅ Ready for Docker |
| `anyrouter.example.yaml` | Multi-user example | Reference |

---

## 🚀 Quick Deploy to Docker

```bash
# 1. Prepare configs
cp config/websites.production.yaml config/websites.yaml
cp config/settings.production.yaml config/settings.yaml

# 2. Create environment file
cat > .env.production << 'EOF'
NOTIFICATION_URLS=discord://your-token@channel-id
TZ=Asia/Hong_Kong
NODE_ENV=production
EOF

# 3. Build and start
docker-compose build
docker-compose up -d

# 4. Upload anyrouter.top cookies via web UI
# http://your-server-ip:3001/

# 5. Verify automation
docker-compose logs -f
```

---

## 🎯 Next Steps

**Immediate** (< 5 minutes):
1. ✅ Server running at http://localhost:3001
2. 🔲 Install EditThisCookie extension
3. 🔲 Login to anyrouter.top
4. 🔲 Export cookies
5. 🔲 Upload via web UI
6. 🔲 Test profile

**After Testing** (when ready for production):
1. 🔲 Copy production configs
2. 🔲 Deploy to Docker
3. 🔲 Create profiles for all users
4. 🔲 Verify scheduled automation
5. 🔲 Set up notifications

---

## 📊 Resource Usage

**Current (Development)**:
- RAM: ~150MB (with UI)
- CPU: < 1%
- Ports: 3001

**Docker (Production)**:
- RAM: ~100MB (headless)
- CPU: < 1%
- Ports: 3001
- Disk: ~50MB + profile data

---

## 🆘 Troubleshooting

### Cannot access http://localhost:3001

**Check server status**:
```bash
# See if server is running
lsof -i:3001

# Check logs
tail -f logs/app-*.log
```

**Restart server**:
```bash
# Stop
killall -9 bun

# Start
bun dist/index.js
```

### Cookie upload fails

**Common issues**:
1. **Invalid JSON**: Make sure you copied the entire JSON array from extension
2. **Expired cookies**: Login again and re-export
3. **Missing cookies**: Export ALL cookies from anyrouter.top domain

### Test check-in fails

**Solutions**:
1. Verify anyrouter.top is accessible
2. Re-upload fresh cookies
3. Check screenshot in `screenshots/` folder
4. Review logs for error details

---

## ✅ System Ready

Everything is set up and ready to test! The web UI is running at:

**http://localhost:3001/**

Open it now and follow Step 2-5 above to test with anyrouter.top! 🚀

---

**Last Updated**: 2025-10-04
**Server Status**: ✅ Online
**Port**: 3001
**Method**: Cookie Upload (Lightweight)
