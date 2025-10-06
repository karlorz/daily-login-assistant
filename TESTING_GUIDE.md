# Testing Guide

## Overview

This guide covers testing procedures for the Daily Login Assistant system.

## Installation Testing

For testing the production installation script (`dailycheckin.sh`):

**See:** [docker/TEST_README.md](docker/TEST_README.md)

Quick test:
```bash
cd /path/to/daily-login-assistant
./docker/test-dailycheckin.sh
```

This simulates a fresh Ubuntu LXC production environment and validates:
- Installation script functionality
- Systemd service configuration
- Application startup
- Port accessibility

## Development Testing

### Unit Tests
```bash
bun run test
```

### Integration Tests  
```bash
bun run test:headless      # Headless browser tests
bun run test:headed        # Headed browser tests (see browser)
```

### Coverage
```bash
bun run test:coverage
```

### All Tests
```bash
bun run test:all
```

## Local Development Testing

### 1. Start Development Server
```bash
bun run dev
```

### 2. Test PWA Interface
Open http://localhost:8001 in your browser

### 3. Profile Management
```bash
# List profiles
bun run profiles list

# Setup new profile (interactive)
bun run profiles setup <site> <user> <url>

# Test check-in
bun run profiles checkin <site> <user> <url>

# Test all profiles
bun run profiles checkin-all
```

## Docker Testing

### Development Docker
```bash
# Build and start
docker-compose up -d

# View logs
docker-compose logs -f

# Stop
docker-compose down
```

### Production Docker Testing
See [DOCKER_DEPLOYMENT.md](DOCKER_DEPLOYMENT.md) for complete Docker deployment testing procedures.

## Session Recovery Testing

See [docs/SESSION_RECOVERY.md](docs/SESSION_RECOVERY.md) for testing session recovery procedures.

## Notification Testing

See [docs/NOTIFICATION_SYSTEM.md](docs/NOTIFICATION_SYSTEM.md) for testing notification functionality.

## Continuous Integration

### Pre-commit Checks
```bash
bun run local-ci   # Runs lint, typecheck, and tests
```

### GitHub Actions
The CI pipeline runs automatically on push:
- Linting (oxlint)
- Type checking (tsc)
- Unit tests
- Integration tests
- Build verification

## Browser Automation Testing

### Test User-Guided Login
```bash
bun run guided-login
```

### Test Saved Sessions
```bash
bun run test-session
```

### Cleanup Test Profiles
```bash
bun run cleanup-profiles
```

## Troubleshooting Tests

### Clear Test Data
```bash
rm -rf profiles/test-*
rm -rf logs/screenshots/test-*
```

### Reset Test Environment
```bash
docker-compose down -v
rm -rf profiles/ logs/
mkdir -p profiles logs
docker-compose up -d
```

### Check Test Container
```bash
# Access test container
docker exec -it ubuntu-systemd-test /bin/bash

# Check service status
systemctl status daily-login-assistant

# View logs
journalctl -u daily-login-assistant -f
```

## Performance Testing

### Monitor Resource Usage
```bash
# CPU and memory
docker stats daily-login-assistant

# Detailed stats
docker exec daily-login-assistant ps aux
```

### Profile Execution Time
Check logs for timing information:
```bash
grep "execution time" logs/app.log
```

## Security Testing

### Check Permissions
```bash
ls -la profiles/
ls -la logs/
```

### Verify Environment Variables
```bash
# Should not expose secrets
docker exec daily-login-assistant env | grep -v PASSWORD
```

### Test Credential Isolation
```bash
# Each profile should have isolated storage
bun run profiles list
```

## Related Documentation

- [Installation Testing](docker/TEST_README.md) - Test production installation script
- [Docker Deployment](DOCKER_DEPLOYMENT.md) - Docker deployment guide
- [Deployment Checklist](DEPLOYMENT_CHECKLIST.md) - Production deployment checklist
- [Profile System](PROFILE_SYSTEM.md) - Profile management guide
- [Session Recovery](docs/SESSION_RECOVERY.md) - Session recovery procedures
- [Notifications](docs/NOTIFICATION_SYSTEM.md) - Notification setup and testing

## Quick Reference

| Test Type | Command | Documentation |
|-----------|---------|---------------|
| Installation | `./docker/test-dailycheckin.sh` | [docker/TEST_README.md](docker/TEST_README.md) |
| Unit Tests | `bun run test` | This guide |
| Integration | `bun run test:headless` | This guide |
| Coverage | `bun run test:coverage` | This guide |
| Local Dev | `bun run dev` | [LOCAL_DEV_SETUP.md](LOCAL_DEV_SETUP.md) |
| Docker | `docker-compose up -d` | [DOCKER_DEPLOYMENT.md](DOCKER_DEPLOYMENT.md) |
| Pre-commit | `bun run local-ci` | This guide |
| Profiles | `bun run profiles list` | [PROFILE_SYSTEM.md](PROFILE_SYSTEM.md) |
