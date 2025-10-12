# PWA Script Launcher - Deployment Guide

## Pre-Deployment Checklist

### 1. Environment Setup
- [ ] Domain name configured (e.g., YOUR_DOCKER_HOST)
- [ ] SSL/TLS certificates installed
- [ ] Firewall rules configured
- [ ] Docker and Docker Compose installed

### 2. Security Configuration
- [ ] Strong SSH tunnel password set
- [ ] API endpoint uses HTTPS
- [ ] CORS origins properly restricted
- [ ] SSH authorized_keys configured (optional)

### 3. Service Verification
- [ ] SSH tunnel container running
- [ ] App container running
- [ ] Network connectivity verified
- [ ] Health endpoints responding

## Step-by-Step Deployment

### Step 1: Server Preparation

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Install Docker Compose
sudo apt install docker-compose-plugin -y

# Verify installation
docker --version
docker compose version
```

### Step 2: Clone Repository

```bash
# Clone repository
git clone <your-repo-url>
cd daily-login-assistant

# Checkout deployment branch
git checkout feat/Automation
```

### Step 3: Configure Environment

```bash
# Copy example environment file
cp .env.example .env

# Edit configuration
nano .env
```

**Required Environment Variables:**

```bash
# SSH Tunnel Configuration
SSH_TUNNEL_PASSWORD=<generate-strong-password>
REMOTE_SSH_HOST=YOUR_DOCKER_HOST
REMOTE_SSH_PORT=2222
REMOTE_SSH_USER=tunnel

# Web API Configuration
WEB_API_PORT=3001
API_ENDPOINT=https://YOUR_DOCKER_HOST:3001/api/tunnel-ready
ALLOWED_ORIGIN=https://YOUR_DOCKER_HOST

# Application Settings
NODE_ENV=production
LOG_LEVEL=info

# Notification URLs (optional)
NOTIFICATION_URLS=discord://token@channel
```

**Generate Strong Password:**
```bash
openssl rand -base64 32
```

### Step 4: Configure Firewall

```bash
# Allow SSH
sudo ufw allow 22/tcp

# Allow SSH tunnel port
sudo ufw allow 2222/tcp

# Allow web API port
sudo ufw allow 3001/tcp

# Enable firewall
sudo ufw enable
sudo ufw status
```

### Step 5: Build and Start Services

```bash
# Build containers
docker compose build

# Start services in detached mode
docker compose up -d

# Verify services are running
docker compose ps
```

Expected output:
```
NAME                      STATUS    PORTS
daily-login-assistant     Up        0.0.0.0:8001->3001/tcp
ssh-tunnel               Up        0.0.0.0:2222->2222/tcp
```

### Step 6: Verify Deployment

```bash
# Check container logs
docker compose logs -f daily-login-assistant
docker compose logs -f ssh-tunnel

# Test health endpoint
curl http://localhost:3001/health

# Test SSH tunnel
ssh -p 2222 tunnel@localhost
# Password: <SSH_TUNNEL_PASSWORD from .env>
```

### Step 7: Configure Reverse Proxy (Optional)

If using nginx for SSL termination:

```nginx
# /etc/nginx/sites-available/daily-login-assistant
server {
    listen 443 ssl http2;
    server_name YOUR_DOCKER_HOST;

    ssl_certificate /etc/letsencrypt/live/YOUR_DOCKER_HOST/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/YOUR_DOCKER_HOST/privkey.pem;

    # Web UI and API
    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

# Redirect HTTP to HTTPS
server {
    listen 80;
    server_name YOUR_DOCKER_HOST;
    return 301 https://$server_name$request_uri;
}
```

```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/daily-login-assistant /etc/nginx/sites-enabled/

# Test configuration
sudo nginx -t

# Reload nginx
sudo systemctl reload nginx
```

## SSH Security Hardening

### Option 1: Password Authentication (Current)
Already configured in docker-compose.yml with `PASSWORD_ACCESS=true`

### Option 2: SSH Key Authentication (Recommended)

```bash
# Generate SSH key pair
ssh-keygen -t ed25519 -f ~/.ssh/anyrouter_tunnel -C "tunnel@YOUR_DOCKER_HOST"

# Copy public key to SSH container
docker cp ~/.ssh/anyrouter_tunnel.pub ssh-tunnel:/config/.ssh/authorized_keys

# Set proper permissions in container
docker exec ssh-tunnel chown -R tunnel:tunnel /config/.ssh
docker exec ssh-tunnel chmod 700 /config/.ssh
docker exec ssh-tunnel chmod 600 /config/.ssh/authorized_keys

# Update docker-compose.yml to disable password auth
# Change: PASSWORD_ACCESS=false

# Restart SSH container
docker compose restart ssh-tunnel
```

### Option 3: Restricted SSH Keys (Most Secure)

Add restrictions to `ssh-config/.ssh/authorized_keys`:

```bash
# Restrict SSH key to only allow reverse tunnel on port 9222
command="/bin/false",no-pty,no-X11-forwarding,permitopen="localhost:9222" ssh-ed25519 AAAA... tunnel@YOUR_DOCKER_HOST
```

This prevents:
- Shell access (`command="/bin/false"`)
- Terminal allocation (`no-pty`)
- X11 forwarding (`no-X11-forwarding`)
- Port forwarding except to localhost:9222 (`permitopen`)

## Testing the Deployment

### 1. Test Web UI

```bash
# Access web UI
open https://YOUR_DOCKER_HOST:3001
```

### 2. Test Session Creation

```bash
# Create session
curl -X POST https://YOUR_DOCKER_HOST:3001/api/session/create

# Sample response:
# {
#   "success": true,
#   "token": "uuid-here",
#   "expiresAt": "2025-10-04T..."
# }
```

### 3. Test Script Download

```bash
# Download launcher script (replace TOKEN)
curl https://YOUR_DOCKER_HOST:3001/api/session/TOKEN/script/macos -o launcher.sh

# Verify script contains correct configuration
cat launcher.sh | grep SESSION_TOKEN
cat launcher.sh | grep REMOTE_SSH_HOST
```

### 4. Test SSH Tunnel (Local)

```bash
# Start Chrome with debug port
chrome --remote-debugging-port=9222 --remote-allow-origins=https://YOUR_DOCKER_HOST

# Create SSH tunnel
ssh -R 9222:localhost:9222 -p 2222 tunnel@YOUR_DOCKER_HOST

# Verify tunnel in another terminal
curl http://localhost:9222/json
```

### 5. Test Cookie Extraction

```bash
# Create session
TOKEN=$(curl -s -X POST https://YOUR_DOCKER_HOST:3001/api/session/create | jq -r '.token')

# After running script and logging in...
curl -X POST https://YOUR_DOCKER_HOST:3001/api/profiles/extract-from-tunnel \
  -H "Content-Type: application/json" \
  -d "{
    \"sessionToken\": \"$TOKEN\",
    \"site\": \"test\",
    \"user\": \"user1\",
    \"loginUrl\": \"https://github.com\"
  }"
```

## Monitoring and Maintenance

### Container Logs

```bash
# Follow all logs
docker compose logs -f

# Follow specific service
docker compose logs -f daily-login-assistant
docker compose logs -f ssh-tunnel

# Last 100 lines
docker compose logs --tail=100
```

### Health Checks

```bash
# Check container status
docker compose ps

# Check health endpoint
curl http://localhost:3001/health

# Check SSH tunnel
netstat -tuln | grep 2222
```

### Automatic Restart

Services are configured with `restart: unless-stopped` in docker-compose.yml

### Backup Profile Data

```bash
# Backup profiles directory
tar -czf profiles-backup-$(date +%Y%m%d).tar.gz profiles/

# Restore profiles
tar -xzf profiles-backup-20251004.tar.gz
```

## Troubleshooting

### Issue: SSH Container Not Starting

```bash
# Check logs
docker compose logs ssh-tunnel

# Common causes:
# - Port 2222 already in use
# - Invalid SSH configuration

# Solution: Check port availability
sudo netstat -tuln | grep 2222
```

### Issue: App Container Cannot Connect to SSH Tunnel

```bash
# Verify network connectivity
docker exec daily-login-assistant ping ssh-tunnel

# Check SSH tunnel is listening
docker exec ssh-tunnel netstat -tuln | grep 2222

# Verify docker network
docker network inspect daily-login-assistant_app-network
```

### Issue: Cookie Extraction Fails

```bash
# Verify Chrome debug port is accessible
curl http://ssh-tunnel:9222/json

# Check if tab exists
curl http://ssh-tunnel:9222/json | jq '.[].url'

# Verify loginUrl matches
# Must match the opened tab URL (use prefix match)
```

### Issue: Script Download Fails

```bash
# Check if templates exist
ls -la scripts/templates/

# Verify file permissions
chmod 644 scripts/templates/*.sh
chmod 644 scripts/templates/*.ps1

# Test locally
curl http://localhost:3001/api/session/create
```

## Update Deployment

```bash
# Pull latest changes
git pull origin feat/Automation

# Rebuild containers
docker compose down
docker compose build --no-cache
docker compose up -d

# Verify services
docker compose ps
docker compose logs -f
```

## Rollback Deployment

```bash
# Stop current deployment
docker compose down

# Checkout previous version
git checkout <previous-commit-hash>

# Rebuild and start
docker compose build
docker compose up -d
```

## Security Best Practices

1. **Use HTTPS**: Always use SSL/TLS for production
2. **Strong Passwords**: Generate random passwords (32+ characters)
3. **SSH Key Auth**: Prefer key-based authentication over passwords
4. **Restrict Origins**: Never use wildcard `*` in CORS or Chrome origins
5. **Firewall Rules**: Only open required ports
6. **Regular Updates**: Keep Docker images and dependencies updated
7. **Monitor Logs**: Regularly check logs for suspicious activity
8. **Backup Data**: Regular backups of profiles and configuration

## Performance Optimization

### Resource Limits

Add to docker-compose.yml:

```yaml
services:
  daily-login-assistant:
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 2G
        reservations:
          cpus: '0.5'
          memory: 512M
```

### Log Rotation

Configure Docker log rotation:

```json
// /etc/docker/daemon.json
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  }
}
```

```bash
sudo systemctl restart docker
```

## Next Steps

1. ✅ Deployment complete
2. ⏳ Test with real users
3. ⏳ Monitor performance and errors
4. ⏳ Gather feedback for improvements
5. ⏳ Scale infrastructure if needed

## Support

For issues or questions:
- Check logs: `docker compose logs`
- Review documentation: `PWA_QUICKSTART.md`
- Check architecture: `PWA_SCRIPT_LAUNCHER.md`
