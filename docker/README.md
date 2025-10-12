# Daily Login Assistant - Native Installation Script

## Overview

`dailycheckin.sh` is an auto-deploy script that installs the Daily Login Assistant **natively** on Ubuntu/Debian systems using Node.js 20 runtime (no Docker containers).

## Quick Start

### One-Line Install (Production)

```bash
sudo bash -c "$(curl -fsSL https://httpd.karldigi.dev/docker/dailycheckin.sh)"
```

This will:
- ✅ Install Node.js 20 runtime and system dependencies
- ✅ Install Playwright browsers
- ✅ Clone the repository (main branch by default)
- ✅ Create systemd service
- ✅ Configure SSH and firewall
- ✅ Provide access to PWA UI at `http://YOUR_IP:8001`

## Branch Selection

The script prompts for branch selection:

1. **main** (Production - Recommended) - Stable release
2. **feat/Automation** (Development) - Latest features

## Requirements

- Ubuntu 20.04+ or Debian 11+ (Ubuntu Noble 24.04 recommended)
- Root access (sudo)
- Internet connection

## Installation Details

### What Gets Installed

| Component | Location |
|-----------|----------|
| Application | `/opt/daily-login-assistant` |
| Config Files | `/opt/daily-login-assistant/.env` |
| Runtime | Node.js 20 (JavaScript runtime) |
| Service | `daily-login-assistant.service` (systemd) |
| Browsers | Playwright Chromium |
| Profiles | `/opt/daily-login-assistant/profiles` |
| Logs | `/opt/daily-login-assistant/logs` |

### Ports

| Service | Port | Description |
|---------|------|-------------|
| PWA Web UI | 8001 (configurable) | Browser-based profile setup |
| SSH | 22 | Remote access |

## Complete Ubuntu Server Setup

### Production Deployment on Fresh Ubuntu Server

This section covers deploying Daily Login Assistant on a fresh Ubuntu server with complete systemd service setup.

#### 1. Prerequisites

```bash
# Update system packages
sudo apt update && sudo apt upgrade -y

# Ensure you have sudo access
sudo whoami  # Should return 'root'
```

#### 2. One-Click Installation (Recommended)

```bash
# Install Daily Login Assistant with systemd service
sudo bash -c "$(curl -fsSL https://httpd.karldigi.dev/docker/dailycheckin.sh)"
```

#### 3. Manual Installation (Alternative)

```bash
# Download the script
curl -fsSL https://httpd.karldigi.dev/docker/dailycheckin.sh -o dailycheckin.sh
chmod +x dailycheckin.sh

# Run installation
sudo bash dailycheckin.sh
```

#### 4. Post-Installation Verification

```bash
# Check if service is running
systemctl status daily-login-assistant

# Verify installation
ls -la /opt/daily-login-assistant/

# Check logs
journalctl -u daily-login-assistant.service -f
```

#### 5. Complete Setup Example

```bash
# Step 1: Update system
sudo apt update && sudo apt upgrade -y

# Step 2: Install application
sudo bash -c "$(curl -fsSL https://httpd.karldigi.dev/docker/dailycheckin.sh)"

# Step 3: Verify service is running
systemctl status daily-login-assistant
# Expected output: ● daily-login-assistant.service - Daily Login Assistant
#                  Active: active (running)

# Step 4: Configure environment
sudo nano /opt/daily-login-assistant/.env

# Step 5: Access PWA UI
# Open http://YOUR_SERVER_IP:8001 in browser

# Step 6: Test profiles
cd /opt/daily-login-assistant
npm run profiles list
```

#### 6. Server Setup Checklist

- [ ] **System Updated**: `sudo apt update && sudo apt upgrade -y`
- [ ] **Script Installed**: `sudo bash -c "$(curl -fsSL https://httpd.karldigi.dev/docker/dailycheckin.sh)"`
- [ ] **Service Running**: `systemctl status daily-login-assistant` shows "Active: active (running)"
- [ ] **PWA UI Accessible**: `http://YOUR_SERVER_IP:8001` loads in browser
- [ ] **Environment Configured**: `/opt/daily-login-assistant/.env` edited with credentials
- [ ] **Profiles Created**: At least one login profile created via PWA UI
- [ ] **Test Check-in**: `npm run profiles checkin-all` executes successfully
- [ ] **Notifications Working**: Test notifications are sent to configured channels
- [ ] **Firewall Configured**: Port 8001 and 22 are open
- [ ] **SSH Access**: Can SSH into server for management
- [ ] **Logs Monitoring**: `journalctl -u daily-login-assistant.service -f` shows application logs
- [ ] **Backup Plan**: `/opt/daily-login-assistant/profiles` directory backed up

#### 7. Security Hardening (Recommended)

```bash
# Configure firewall
sudo ufw enable
sudo ufw allow ssh
sudo ufw allow 8001/tcp

# Create dedicated user (optional but recommended)
sudo adduser dailylogin
sudo usermod -aG sudo dailylogin

# Set up SSH key authentication
ssh-keygen -t rsa -b 4096
# Copy public key to server
```

#### 8. Monitoring and Maintenance

```bash
# Set up log rotation
sudo nano /etc/logrotate.d/daily-login-assistant

# Monitor system resources
htop
df -h
free -h

# Check service health
systemctl is-active daily-login-assistant
systemctl is-enabled daily-login-assistant
```

## Testing the Script

### Local Development Testing

#### Option 1: Ubuntu with systemd installation (recommended for testing)

**Quick Test with Automated Script:**
```bash
# Run the automated test script (macOS/Linux)
/Users/karlchow/Desktop/code/daily-login-assistant/docker/test-dailycheckin.sh
```

The `test-dailycheckin.sh` script automatically:
- Cleans up any existing test container
- Starts a new systemd-enabled Ubuntu container
- Mounts the `dailycheckin.sh` script with absolute path (fixes mount issues)
- Provides next steps for testing

**Manual Setup (if you need custom configuration):**
```bash
# 1. Clean up any existing container
docker rm -f ubuntu-systemd-test 2>/dev/null || true

# 2. Start the container with systemd (using jrei/systemd-ubuntu)
docker run -d --name ubuntu-systemd-test \
  --privileged \
  --cgroupns=host \
  --tmpfs /tmp \
  --tmpfs /run \
  --tmpfs /run/lock \
  -v /sys/fs/cgroup:/sys/fs/cgroup:rw \
  -v /Users/karlchow/Desktop/code/daily-login-assistant/docker/dailycheckin.sh:/tmp/dailycheckin.sh:ro \
  jrei/systemd-ubuntu:20.04 /sbin/init

# Note: Key fixes for systemd support:
#   - Use --cgroupns=host for proper cgroup handling
#   - Mount /sys/fs/cgroup as read-write (rw)
#   - Add tmpfs mounts for /tmp, /run, /run/lock
#   - Run /sbin/init as the container command
#   - Use absolute path for volume mount

# 3. Verify systemd is working
docker exec ubuntu-systemd-test systemctl --version

# 4. Run the installation script
docker exec ubuntu-systemd-test bash -c "export TERM=xterm && /tmp/dailycheckin.sh"

# 5. Test service status (after installation completes)
docker exec ubuntu-systemd-test systemctl status daily-login-assistant
```

**Quick Test Scripts:**

**Standard Test (save as test-dailycheckin.sh):**
```bash
#!/bin/bash
# Quick test script for dailycheckin.sh

# Clean up any existing container
docker rm -f ubuntu-systemd-test 2>/dev/null || true

# Start new container
docker run -d --name ubuntu-systemd-test \
  --privileged \
  -v /sys/fs/cgroup:/sys/fs/cgroup:ro \
  -v /Users/karlchow/Desktop/code/daily-login-assistant/docker/dailycheckin.sh:/tmp/dailycheckin.sh:ro \
  jrei/systemd-ubuntu:20.04

echo "✅ Container started successfully!"
echo "📋 Next steps:"
echo "1. docker exec ubuntu-systemd-test systemctl --version"
echo "2. docker exec -it ubuntu-systemd-test bash"
echo "3. Inside container: /tmp/dailycheckin.sh"
echo "4. After install: systemctl status daily-login-assistant"
```

**Fast Test (save as test-fast-install.sh):**
```bash
#!/bin/bash
# Fast test script for optimized dailycheckin.sh

echo "🚀 Starting Fast Daily Login Assistant Test..."

# Clean up any existing container
docker rm -f ubuntu-systemd-test 2>/dev/null || true

# Start new container with optimized script
docker run -d --name ubuntu-systemd-test \
  --privileged \
  -v /sys/fs/cgroup:/sys/fs/cgroup:ro \
  -v /Users/karlchow/Desktop/code/daily-login-assistant/docker/dailycheckin.sh:/tmp/dailycheckin.sh:ro \
  jrei/systemd-ubuntu:20.04

echo "✅ Container started with optimized installation!"
echo ""
echo "📊 Expected improvements:"
echo "  • Bun installation: ~2-3 minutes (was 5-10+ minutes)"
echo "  • Playwright: Skipped in container mode"
echo "  • Total time: ~5-8 minutes (was 10-20+ minutes)"
echo ""
echo "⏱️  To monitor progress: docker logs -f ubuntu-systemd-test"
```

### ⚡ Performance Optimizations

The dailycheckin.sh script has been optimized for faster container testing:

- **🚀 Fast Bun Installation**: Direct binary download instead of curl | bash (5x faster)
- **⏭️  Skip Playwright in Containers**: Browsers not needed for testing
- **🔄 Node.js Fallback**: Automatic fallback if Bun installation fails
- **📦 Optimized Dependencies**: Only install what's needed for container testing

**Installation Time Comparison:**
- **Before**: 10-20+ minutes
- **After**: 5-8 minutes (container mode)
- **Production**: Still full installation with all features

#### Option 2: Manual systemd setup (for development)
```bash
# 1. Create a manual container
docker run -d --name ubuntu-systemd-test \
  --privileged \
  -v /sys/fs/cgroup:/sys/fs/cgroup:rw \
  -e container=docker \
  -v $(pwd)/dailycheckin.sh:/tmp/dailycheckin.sh:ro \
  ubuntu:24.04 tail -f /dev/null

# 2. Install systemd
docker exec ubuntu-systemd-test bash -c "export DEBIAN_FRONTEND=noninteractive && apt-get update && apt-get install -y systemd systemd-sysv iproute2 curl wget && rm -rf /var/lib/apt/lists/*"

# 3. Check if systemd is working
docker exec ubuntu-systemd-test systemctl --version

# 4. Run the installation script
docker exec ubuntu-systemd-test bash -c "export TERM=xterm && /tmp/dailycheckin.sh"
```

### Testing with Published Script

```bash
# Test the published script (simulates bare metal deployment)
curl -fsSL https://httpd.karldigi.dev/docker/dailycheckin.sh | sudo bash
```

## Post-Installation

### 1. Configure Environment

```bash
sudo nano /opt/daily-login-assistant/.env
```

Add your notification URLs and credentials:

```env
NOTIFICATION_URLS=discord://token@channel,slack://token@channel
SITE1_USERNAME=your_username
SITE1_PASSWORD=your_password
```

### 2. Set Up Profiles

Visit `http://YOUR_IP:8001` in your browser and:
- Create login profiles
- Test manual logins
- Extract cookies and localStorage

### 3. Test Check-Ins

```bash
cd /opt/daily-login-assistant

# List profiles
npm run profiles list

# Test single check-in
npm run profiles checkin SITE USER URL

# Test all check-ins
npm run profiles checkin-all
```

### 4. View Logs

```bash
# Real-time logs
journalctl -u daily-login-assistant.service -f

# Application logs
tail -f /opt/daily-login-assistant/logs/app.log

# Service status
systemctl status daily-login-assistant
```

## Management Commands

### Update

```bash
cd /opt/daily-login-assistant
git pull
npm install
npm run build
systemctl restart daily-login-assistant
```

### Restart

```bash
systemctl restart daily-login-assistant
```

### Stop

```bash
systemctl stop daily-login-assistant
```

### Start

```bash
systemctl start daily-login-assistant
```

### Uninstall

```bash
systemctl stop daily-login-assistant
systemctl disable daily-login-assistant
sudo rm -rf /opt/daily-login-assistant
sudo rm -f /etc/systemd/system/daily-login-assistant.service
systemctl daemon-reload
```

## Testing: systemd Container Issues

### Problem: Service Not Created in Container

**Common Issue:**
```bash
# After running /tmp/dailycheckin.sh in container:
systemctl status daily-login-assistant
# Output: Unit daily-login-assistant.service could not be found.
```

**Root Cause:**  
The `dailycheckin.sh` script detects it's running in a container and **intentionally skips systemd service creation** to avoid conflicts. Instead, it creates a startup script and runs the app directly with `nohup`.

**Solution: Force Systemd Mode**

Use the `FORCE_SYSTEMD=true` environment variable to override container detection:

```bash
# Inside container - Force systemd service creation
FORCE_SYSTEMD=true /tmp/dailycheckin.sh

# Or from host
docker exec ubuntu-systemd-test bash -c "export FORCE_SYSTEMD=true && /tmp/dailycheckin.sh"
```

This will:
1. ✅ Create `/etc/systemd/system/daily-login-assistant.service`
2. ✅ Run `systemctl daemon-reload`
3. ✅ Enable and start the service with `systemctl enable --now`
4. ✅ Allow testing systemd functionality in containers

### Other systemd Errors

If you encounter systemd errors when testing with Docker:

```bash
# ❌ Common error: "System has not been booted with systemd as init system"
# ❌ Common error: "no such file or directory" on volume mount

# ✅ Solution: Use the automated test script with proper systemd configuration
/Users/karlchow/Desktop/code/daily-login-assistant/docker/test-dailycheckin.sh

# Or manually with these key fixes:
docker run -d --name ubuntu-systemd-test \
  --privileged \
  --cgroupns=host \                        # Fix: Enable host cgroup namespace
  --tmpfs /tmp \                           # Fix: Add tmpfs mounts
  --tmpfs /run \
  --tmpfs /run/lock \
  -v /sys/fs/cgroup:/sys/fs/cgroup:rw \   # Fix: Mount as read-write
  -v /absolute/path/to/dailycheckin.sh:/tmp/dailycheckin.sh:ro \  # Fix: Use absolute path
  jrei/systemd-ubuntu:20.04 /sbin/init    # Fix: Run /sbin/init
```

**Key fixes for systemd in Docker:**
1. Use `--cgroupns=host` for proper cgroup namespace
2. Mount `/sys/fs/cgroup` as **read-write** (`:rw`)
3. Add tmpfs mounts for `/tmp`, `/run`, `/run/lock`
4. Run `/sbin/init` as the container command (not default bash)
5. Use **absolute paths** for volume mounts (relative paths may fail on macOS)
6. Use `FORCE_SYSTEMD=true` to enable systemd service creation in containers

### Script Fails to Download

```bash
# Check connectivity
curl -I https://httpd.karldigi.dev/docker/dailycheckin.sh

# Manual download
wget https://httpd.karldigi.dev/docker/dailycheckin.sh
sudo bash dailycheckin.sh
```

### Service Not Starting

```bash
# Check service status
systemctl status daily-login-assistant

# View service logs
journalctl -u daily-login-assistant.service -f

# Restart service
systemctl restart daily-login-assistant
```

### Node.js Runtime Issues

```bash
# Check Node.js installation
node --version
npm --version

# Reinstall Node.js if needed
curl -fsSL https://deb.nodesource.com/setup_20.x -o /tmp/nodesource_setup.sh
sudo bash /tmp/nodesource_setup.sh
sudo apt-get install -y nodejs
```

### Port Conflicts

If port 8001 is already in use:

```bash
# Check what's using the port
sudo netstat -tlnp | grep :8001

# Reinstall with different port
sudo bash dailycheckin.sh  # and choose different port when prompted
```

### Permission Issues

```bash
# Ensure running as root
sudo bash -c "$(curl -fsSL https://httpd.karldigi.dev/docker/dailycheckin.sh)"

# Check file permissions
ls -la /opt/daily-login-assistant/
```

## Development

### Publishing Script Updates

After modifying `dailycheckin.sh`:

```bash
# 1. Make executable
chmod +x docker/dailycheckin.sh

# 2. Copy to web server
cp docker/dailycheckin.sh /path/to/webserver/public/docker/

# 3. Test with published URL
curl -fsSL https://httpd.karldigi.dev/docker/dailycheckin.sh | bash
```

### Reference

The script is modeled after [filebrowser.sh](scriptexample/filebrowser.sh) from community-scripts.

## Architecture

```
dailycheckin.sh
    ↓
System Update → Install Dependencies → Install Node.js 20 → Install Playwright
    ↓
Clone Repo → npm Install → Build App → Create Systemd Service → Configure Firewall
                                                              ↓
                                            PWA UI (8001) + Native Node.js Runtime
```

## Key Differences from Docker Approach

| Feature | Native Installation | Docker Approach |
|---------|-------------------|-----------------|
| Runtime | Node.js 20 (native) | Docker containers |
| Service Management | systemd | docker compose |
| Resource Usage | Lower | Higher |
| Performance | Better | Good |
| Isolation | System-level | Container-level |
| Setup Complexity | Medium | Low |
| Installation Speed | Faster (via NodeSource) | Slower (image download) |

## Related Documentation

- [Docker Deployment Guide](../DOCKER_DEPLOYMENT.md) - Alternative Docker-based deployment
- [Deployment Checklist](../DEPLOYMENT_CHECKLIST.md)
- [Main Documentation](../CLAUDE.md)
