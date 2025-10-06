# Test Script for Production Setup

## Purpose
Test the `dailycheckin.sh` installation script by simulating a fresh Ubuntu LXC production environment using Docker on macOS.

## Usage

```bash
cd /Users/karlchow/Desktop/code/daily-login-assistant
./docker/test-dailycheckin.sh
```

## What It Tests

1. ✅ Fresh Ubuntu 20.04 with systemd (simulates production LXC)
2. ✅ Installation script execution with `FORCE_SYSTEMD=true`
3. ✅ Systemd service creation and activation
4. ✅ Application accessibility on port 8001
5. ✅ Service logs and status

## Expected Output

```
🚀 Testing dailycheckin.sh installation script
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🧹 Cleaning up existing test container...
🐳 Starting fresh Ubuntu 20.04 container with systemd...
✅ Container started
⏳ Waiting for systemd to initialize...

📋 Verifying systemd...
systemd 245 (245.4-4ubuntu3.24)

📦 Running dailycheckin.sh installation...
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[Installation output...]

📋 Checking service status...
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[Service status...]

📋 Testing application...
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ Application is accessible on port 8001

📋 Recent logs...
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[Recent journal logs...]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ Test complete!
```

## Debugging

### Access the test container
```bash
docker exec -it ubuntu-systemd-test /bin/bash
```

### Check service status
```bash
docker exec ubuntu-systemd-test systemctl status daily-login-assistant
```

### View logs
```bash
docker exec ubuntu-systemd-test journalctl -u daily-login-assistant -f
```

### Test application manually
```bash
docker exec ubuntu-systemd-test curl http://localhost:8001
# Or from host (if port is mapped)
curl http://localhost:8001
```

### Check service file
```bash
docker exec ubuntu-systemd-test cat /etc/systemd/system/daily-login-assistant.service
```

## Cleanup

```bash
docker rm -f ubuntu-systemd-test
```

## Known Issues

### Application fails to start with "Cannot find module"
**Symptom:**
```
Error [ERR_MODULE_NOT_FOUND]: Cannot find module '/opt/daily-login-assistant/dist/core/container'
```

**Cause:** Remote repository has old code with Inversify container that was removed in local changes.

**Solution:** Commit and push local changes to remote repository, or test with local repository.

**This is NOT a systemd or installation script issue.** The installation script works correctly.

## What Gets Tested

### ✅ Installation Script (dailycheckin.sh)
- System package installation
- Node.js 20 installation
- Repository cloning
- Application build
- Directory creation
- Environment configuration
- Systemd service creation

### ✅ Systemd Service
- Service file created correctly
- No `ExecStartPre` (fixed read-only filesystem issue)
- Service enabled and started
- Restart policy configured

### ✅ System Configuration
- Correct paths and permissions
- Environment variables
- Port configuration (8001)
- Service dependencies

## Simulates Production

This test script simulates:
- Fresh Ubuntu 20.04 LXC container
- Systemd service management
- Production environment variables
- Network port configuration
- Service lifecycle (start, status, logs)

Perfect for validating the installation script before deploying to actual production Ubuntu LXC containers.

## Files

- `docker/test-dailycheckin.sh` - This test script
- `docker/dailycheckin.sh` - Installation script being tested
- `docker/daily-login-assistant.service` - Systemd service template

## Documentation

- [FORCE_SYSTEMD_IMPLEMENTATION.md](../FORCE_SYSTEMD_IMPLEMENTATION.md) - FORCE_SYSTEMD feature
- [TEST_DEBUG_IMPROVEMENTS.md](../TEST_DEBUG_IMPROVEMENTS.md) - All improvements
- [SYSTEMD_NODE_FIX.md](../SYSTEMD_NODE_FIX.md) - Read-only filesystem fix
