# Docker Deployment Checklist

## ✅ Pre-Deployment (Local Machine with GUI)

### 1. Profile Creation
- [ ] Create profile for each site + user combination
  ```bash
  bun run profiles setup <site> <user> <login-url>
  ```
- [ ] Verify all profiles created
  ```bash
  bun run profiles list
  ```
- [ ] Test all profiles work
  ```bash
  bun run profiles checkin-all
  ```

### 2. Configuration
- [ ] Configure `config/websites.yaml` with all sites
- [ ] Configure `config/settings.yaml` (schedule, notifications)
- [ ] Create `.env.production` with notification URLs
  ```bash
  NOTIFICATION_URLS=discord://token@channel
  TZ=Asia/Hong_Kong
  ```
- [ ] Test notifications work
  ```bash
  bun run test:notifications
  ```

### 3. Docker Setup
- [ ] Verify `docker-compose.yml` uses bind mounts
  ```yaml
  volumes:
    - ./profiles:/app/profiles
    - ./logs:/app/logs
    - ./logs/screenshots:/app/logs/screenshots
  ```
- [ ] Build Docker image
  ```bash
  docker-compose build
  ```
- [ ] Verify image built successfully
  ```bash
  docker images | grep daily-login-assistant
  ```

---

## 🚀 Deployment

### 4. Start Container
- [ ] Start container in background
  ```bash
  docker-compose up -d
  ```
- [ ] Verify container is running
  ```bash
  docker-compose ps
  ```
- [ ] Check logs for startup
  ```bash
  docker-compose logs -f
  ```

### 5. Validation
- [ ] Verify profiles mounted correctly
  ```bash
  docker-compose exec daily-login-assistant ls -la /app/profiles/user-guided/
  ```
- [ ] Test manual check-in
  ```bash
  docker-compose exec daily-login-assistant bun run profiles checkin-all
  ```
- [ ] Wait for first scheduled task
- [ ] Verify notification sent for success/failure

---

## 🔄 Ongoing Operations

### 6. Monitoring
- [ ] Set up log monitoring
  ```bash
  docker-compose logs -f
  ```
- [ ] Monitor notifications for session expiration alerts
- [ ] Check daily summary notifications (configured time)

### 7. Session Recovery (When Expires)
- [ ] Receive session expiration notification
- [ ] Stop container
  ```bash
  docker-compose down
  ```
- [ ] Re-create profile locally
  ```bash
  bun run profiles setup <site> <user> <url>
  ```
- [ ] Verify profile works
  ```bash
  bun run profiles checkin <site>-<user>
  ```
- [ ] Restart container
  ```bash
  docker-compose up -d
  ```
- [ ] Verify check-in works in container

---

## 🐛 Troubleshooting Checklist

### Container Issues
- [ ] Check container is running: `docker-compose ps`
- [ ] Check logs: `docker-compose logs -f`
- [ ] Check resource usage: `docker stats daily-login-assistant`
- [ ] Restart container: `docker-compose restart`

### Profile Issues
- [ ] Verify profiles exist on host: `ls -la profiles/user-guided/`
- [ ] Verify profiles mounted in container: `docker-compose exec daily-login-assistant ls -la /app/profiles/user-guided/`
- [ ] Test profile locally: `bun run profiles checkin <profile-id>`
- [ ] Check profile metadata: `cat profiles/user-guided/<profile-id>/metadata.json`

### Notification Issues
- [ ] Verify `NOTIFICATION_URLS` set in `.env.production`
- [ ] Test shoutrrr manually:
  ```bash
  shoutrrr send --url "$NOTIFICATION_URLS" --title "Test" --message "Test message"
  ```
- [ ] Check shoutrrr installed in container:
  ```bash
  docker-compose exec daily-login-assistant which shoutrrr
  ```
- [ ] Check notification logs in container

### Check-in Issues
- [ ] Verify session not expired: Test locally first
- [ ] Check website URL hasn't changed
- [ ] Verify website didn't change auth flow
- [ ] Check screenshot for debugging: `ls -la logs/screenshots/`
- [ ] Review logs for error details

---

## 📋 Production Deployment Checklist

### Remote Server Deployment
- [ ] Create profiles locally (with GUI)
- [ ] Copy profiles to server
  ```bash
  rsync -avz profiles/ user@server:/app/profiles/
  ```
- [ ] Copy configuration to server
  ```bash
  rsync -avz config/ user@server:/app/config/
  rsync -avz .env.production user@server:/app/
  ```
- [ ] SSH to server
  ```bash
  ssh user@server
  cd /app
  ```
- [ ] Start container on server
  ```bash
  docker-compose up -d
  ```
- [ ] Verify container running
  ```bash
  docker-compose ps
  docker-compose logs -f
  ```

### CI/CD Pipeline
- [ ] Build and push Docker image to registry
- [ ] Deploy image to production
- [ ] Mount profiles volume (pre-created separately)
- [ ] Verify deployment successful
- [ ] Monitor logs and notifications

---

## 🎯 Success Criteria

### Deployment Success
- [x] All profiles created locally
- [x] All profiles tested successfully
- [x] Docker container running
- [x] Profiles mounted correctly
- [x] Manual check-in works in container
- [x] Scheduled tasks running
- [x] Notifications working

### Operational Success (7 days)
- [ ] No unexpected container restarts
- [ ] All scheduled check-ins successful
- [ ] Daily summary notifications received
- [ ] No session expiration (or recovered successfully)
- [ ] Log files not too large (< 100MB)
- [ ] Screenshots cleanup working (if configured)

---

## 📊 Monitoring Dashboard

### Daily Checks
```bash
# Container status
docker-compose ps

# Recent logs
docker-compose logs --tail=100

# Resource usage
docker stats daily-login-assistant --no-stream

# Profile count
ls -1 profiles/user-guided/ | wc -l

# Log size
du -sh logs/

# Screenshot count
ls -1 logs/screenshots/ | wc -l
```

### Weekly Checks
- [ ] Review all logs for errors
- [ ] Verify success rate >95%
- [ ] Check disk usage for logs/screenshots
- [ ] Update profiles if sessions expired
- [ ] Review notification history
- [ ] Check Docker image for updates

---

## 🔒 Security Checklist

### Profile Security
- [ ] Profiles not committed to git (.gitignore)
- [ ] Profiles not included in Docker image
- [ ] Profiles directory has restricted permissions (700)
- [ ] Environment variables not exposed in logs

### Container Security
- [ ] Running as non-root user (pwuser)
- [ ] No unnecessary ports exposed
- [ ] Volumes use bind mounts (not public registries)
- [ ] .env.production not committed to git

---

**Last Updated**: 2025-10-04
**Target Environment**: Docker headless deployment
**Prerequisites**: Profiles created locally with GUI
