# Docker Deployment Guide

## 🎯 Overview

This guide explains how to deploy the daily login assistant in Docker **headless mode** while maintaining the user-guided login functionality.

## ⚠️ CRITICAL UNDERSTANDING

**User-guided login requires a GUI** to display the browser window. Docker containers run **headless without display**.

**Solution**: Create profiles locally (with GUI), then deploy to Docker (headless).

---

## 📋 Deployment Workflow

### **Step 1: Create Profiles Locally (Required)**

```bash
# On your LOCAL machine with GUI (macOS, Windows, Linux Desktop)
cd /path/to/daily-login-assistant

# Create profile for each site + user combination
bun run profiles setup github user1 https://github.com/login
bun run profiles setup discord user1 https://discord.com/login
bun run profiles setup anyrouter user1 https://anyrouter.com/login

# Browser window will open for manual login
# Login manually, complete OAuth/2FA if needed
# Browser closes automatically after successful login
```

### **Step 2: Verify Profiles Work**

```bash
# List all profiles
bun run profiles list

# Expected output:
# ✅ github-user1 (created: 2025-10-04)
# ✅ discord-user1 (created: 2025-10-04)
# ✅ anyrouter-user1 (created: 2025-10-04)

# Test check-in automation
bun run profiles checkin-all

# Expected output:
# ✅ github-user1: Check-in successful
# ✅ discord-user1: Check-in successful
# ✅ anyrouter-user1: Check-in successful
```

### **Step 3: Configure Docker Environment**

```bash
# Create .env file for Docker
cat > .env.production << 'EOF'
NODE_ENV=production
NOTIFICATION_URLS=discord://your-token@channel-id
TZ=Asia/Hong_Kong

# Optional: Credentials for auto-fill method (not recommended)
# SITE1_USERNAME=username
# SITE1_PASSWORD=password
EOF
```

### **Step 4: Build and Deploy**

```bash
# Build Docker image
docker-compose build

# Start container (runs in background)
docker-compose up -d

# View logs
docker-compose logs -f

# Check status
docker ps
docker-compose ps
```

### **Step 5: Verify Container is Working**

```bash
# Check logs for scheduled tasks
docker-compose logs -f daily-login-assistant

# Expected output:
# [09:00:00] Starting scheduled check-in for github-user1
# [09:00:05] ✅ github-user1: Check-in successful
# [09:05:00] Starting scheduled check-in for discord-user1
# [09:05:03] ✅ discord-user1: Check-in successful

# Manually trigger check-in (for testing)
docker-compose exec daily-login-assistant bun run profiles checkin-all
```

---

## 🔄 Session Expiration & Recovery

### **When Sessions Expire**

**Notification** (via shoutrrr):
```
🔴 Session Expired: github-user1
Please re-authenticate to continue check-ins.
Run: bun run profiles setup github user1 https://github.com/login
```

### **Recovery Steps**

```bash
# 1. Stop Docker container
docker-compose down

# 2. Re-create profile locally (with GUI)
bun run profiles setup github user1 https://github.com/login

# 3. Verify profile works
bun run profiles checkin github-user1

# 4. Restart Docker container
docker-compose up -d

# Profiles are automatically available in container via bind mount
```

---

## 📂 Volume Configuration

### **Current Setup: Bind Mounts (Recommended)**

```yaml
volumes:
  - ./profiles:/app/profiles      # Session storage
  - ./logs:/app/logs              # Application logs
  - ./screenshots:/app/screenshots # Debug screenshots
```

**Advantages**:
- ✅ Easy access to profiles from host
- ✅ Simple recovery (just run `bun run profiles setup` locally)
- ✅ Can inspect logs/screenshots directly
- ✅ Profiles persist even if container is deleted

**Directory Structure**:
```
daily-login-assistant/
├── profiles/
│   └── user-guided/
│       ├── github-user1/          # Chrome profile data
│       ├── discord-user1/
│       └── anyrouter-user1/
├── logs/
│   └── app-2025-10-04.log
└── screenshots/
    └── github-user1-2025-10-04.png
```

### **Alternative: Named Volumes (Production)**

```yaml
volumes:
  - profiles_data:/app/profiles
  - logs_data:/app/logs
  - screenshots_data:/app/screenshots
```

**To use named volumes** (uncomment in docker-compose.yml):
```bash
# Export profiles from bind mount to volume
docker run --rm \
  -v "$(pwd)/profiles:/source" \
  -v daily-login-assistant_profiles_data:/dest \
  alpine sh -c "cp -r /source/* /dest/"

# Import profiles from volume to bind mount
docker run --rm \
  -v daily-login-assistant_profiles_data:/source \
  -v "$(pwd)/profiles:/dest" \
  alpine sh -c "cp -r /source/* /dest/"
```

---

## 🚀 Production Deployment

### **Option 1: Local Docker (Current Setup)**

```bash
# Start container
docker-compose up -d

# Container runs scheduled check-ins automatically
# Profiles persist in ./profiles directory
```

### **Option 2: Remote Server Deployment**

```bash
# 1. Create profiles locally (with GUI)
bun run profiles setup site1 user1 https://site1.com/login

# 2. Copy profiles to remote server
rsync -avz profiles/ user@server:/app/profiles/

# 3. Deploy on remote server (headless)
ssh user@server
cd /app
docker-compose up -d
```

### **Option 3: CI/CD Pipeline**

```yaml
# .github/workflows/deploy.yml
- name: Build and push Docker image
  run: |
    docker build -t your-registry/daily-login-assistant:latest .
    docker push your-registry/daily-login-assistant:latest

# Note: Profiles must be created manually and mounted separately
# Profiles are NOT included in Docker image (security best practice)
```

---

## 🔒 Security Best Practices

### **Profile Storage**

```bash
# Profiles contain sensitive session data
# DO NOT commit to git
# DO NOT include in Docker image

# .gitignore (already configured)
/profiles/
/logs/
/screenshots/
```

### **Docker Image**

```bash
# Image contains application code only
# Profiles mounted at runtime via volumes
# Environment variables for notifications

# DO commit:
# - Dockerfile
# - docker-compose.yml
# - config/

# DO NOT commit:
# - profiles/
# - .env.production
# - logs/
```

---

## 🧪 Testing Deployment

### **Test Checklist**

```bash
# 1. Profile creation works locally
✅ bun run profiles setup test user1 https://example.com

# 2. Profile persists after restart
✅ docker-compose restart
✅ docker-compose logs # Check profile still works

# 3. Scheduled tasks run automatically
✅ Wait for scheduled time
✅ Check logs for execution

# 4. Notifications work
✅ Session expiration triggers notification
✅ Daily summary sent at configured time

# 5. Recovery works
✅ Delete profile
✅ Re-create profile locally
✅ Container picks up new profile automatically
```

---

## ❓ FAQ

### **Q: Can I create profiles directly in Docker?**

**A: No.** User-guided login requires GUI. Options:
1. **Recommended**: Create profiles locally, mount into container
2. **Advanced**: Use VNC server in Docker (complex, not recommended)
3. **Alternative**: Use remote browser debugging (complex)

### **Q: How often do sessions expire?**

**A**: Varies by website:
- GitHub: ~30 days
- Discord: ~7 days
- Most sites: 7-30 days

Notifications alert you when re-authentication needed.

### **Q: Can I run this on a headless server?**

**A: Yes!** Workflow:
1. Create profiles on local machine (with GUI)
2. Copy profiles to server: `rsync -avz profiles/ user@server:/app/profiles/`
3. Deploy container on server (headless)
4. When sessions expire, re-create profiles locally and rsync again

### **Q: What happens if I delete the container?**

**A**: Profiles persist because they're stored in bind mounts (host filesystem).

```bash
docker-compose down  # Container deleted
docker-compose up -d # New container uses existing profiles
```

### **Q: Can I share profiles between machines?**

**A: Not recommended.** Chrome profiles contain machine-specific data. Create separate profiles per deployment.

---

## 🐛 Troubleshooting

### **Container starts but check-ins fail**

```bash
# Check if profiles exist in container
docker-compose exec daily-login-assistant ls -la /app/profiles/user-guided/

# If empty, profiles not mounted correctly
# Verify docker-compose.yml volume configuration
```

### **Session expired in container**

```bash
# 1. Check notification
# Expected: "🔴 Session Expired: github-user1"

# 2. Re-create profile locally
bun run profiles setup github user1 https://github.com/login

# 3. Restart container (picks up new profile)
docker-compose restart
```

### **Profiles not persisting**

```bash
# Check volume mounts
docker inspect daily-login-assistant | grep -A 10 Mounts

# Expected output:
# "Source": "/Users/you/daily-login-assistant/profiles",
# "Destination": "/app/profiles",
```

---

## 📊 Monitoring

### **Health Checks**

```bash
# Check container status
docker-compose ps

# View logs
docker-compose logs -f

# Check resource usage
docker stats daily-login-assistant
```

### **Notification Alerts**

Configure in `config/settings.yaml`:
```yaml
settings:
  notifications:
    sendOnSuccess: true     # Daily summary
    sendOnFailure: true     # Immediate alerts
    sendDailySummary: true  # Daily report
    summaryTime: "20:00"    # 8:00 PM
```

---

## 🎯 Next Steps

1. ✅ Create profiles locally for all your sites
2. ✅ Test profiles work (`bun run profiles checkin-all`)
3. ✅ Deploy to Docker (`docker-compose up -d`)
4. ✅ Monitor logs for first scheduled run
5. ✅ Set up notifications for session expiration alerts
6. ✅ Document your recovery process

---

**Last Updated**: 2025-10-04
**Docker Image**: `mcr.microsoft.com/playwright:v1.55.1-noble`
**Bun Version**: Latest (installed in Dockerfile)
