# Local Development Setup Guide

## Prerequisites

- **Bun**: JavaScript runtime and package manager
- **Node.js 20+**: Fallback runtime
- **macOS ARM64**: This guide is for Apple Silicon Macs

## Quick Start

### 1. Install Shoutrrr CLI (nicholas-fedor fork)

```bash
# Download and extract
cd ~/Downloads
curl -L -o shoutrrr_macOS_arm64v8_0.10.0.tar.gz \
  https://github.com/nicholas-fedor/shoutrrr/releases/download/v0.10.0/shoutrrr_macOS_arm64v8_0.10.0.tar.gz
tar -xf shoutrrr_macOS_arm64v8_0.10.0.tar.gz

# Install to local bin
mkdir -p ~/.local/bin
cp shoutrrr ~/.local/bin/shoutrrr
chmod +x ~/.local/bin/shoutrrr

# Add to PATH (add to ~/.zshrc for persistence)
export PATH="$HOME/.local/bin:$PATH"

# Verify installation
shoutrrr --version
```

### 2. Setup Environment

```bash
# Copy development environment
cp .env.development.example .env.development

# Default .env.development includes integrated webhook listener:
# WEBHOOK_PORT=3001
# NOTIFICATION_URLS="generic://localhost:3001?disabletls=yes&template=json"
```

### 3. Install Dependencies

```bash
# Install all dependencies
bun install

# Verify installation
bun run typecheck
bun run lint
bun run test
```

### 4. Start Development Server

```bash
# Load environment and start dev server with integrated webhook
set -a && source .env.development && set +a && bun run dev
```

## Development Features

### 🔥 Hot Reload
- Uses `bun --watch` for instant code reloading
- Automatically restarts on file changes
- Preserves application state where possible

### 📧 Integrated Webhook Notification Verification

The dev server now includes a built-in webhook listener that provides **immediate, visible notification feedback**:

```bash
# When you start the dev server, you'll see:
🔗 Dev webhook listener started on http://localhost:3001
📧 Use: NOTIFICATION_URLS=generic://localhost:3001
📁 Notifications logged to console and /tmp/daily-login-notifications.log

# Every notification appears instantly in console:
📧 Webhook received: Notification - ✅ **Bot Started**
✅ Notification sent successfully to generic
```

### 🎯 **No Separate Testing Required!**

The integrated approach eliminates the need for:
- ❌ Separate notification receiver scripts
- ❌ Manual verification steps
- ❌ System log checking
- ❌ Multiple test commands

**All notifications are visible immediately in the dev server console!**

### 🧪 Manual Testing Script

For manual testing of webhook notifications:

```bash
# Basic test with default message
./scripts/test-webhook.sh

# Custom message
./scripts/test-webhook.sh "Custom test message"

# Custom message and title
./scripts/test-webhook.sh "Custom message" "🎯 Custom Title"
```

The script automatically:
- ✅ Validates shoutrrr is installed
- ✅ Checks webhook listener is running
- ✅ Sends notification with colored output
- ✅ Shows where to verify results

### 📝 Notification Log File

All notifications are automatically logged to `/tmp/daily-login-notifications.log`:

```bash
# View notification history
cat /tmp/daily-login-notifications.log

# Sample output:
[2025-09-27T17:04:54.935Z] Notification: ✅ **Bot Started**
Daily Login Assistant Bot has started successfully 🚀
```

### ⚙️ Configuration Options

Edit `.env.development` for different notification setups:

```bash
# Option 1: Integrated webhook (recommended for development)
NOTIFICATION_URLS="generic://localhost:3001?disabletls=yes&template=json"

# Option 2: System logger (less visible)
NOTIFICATION_URLS="logger://"

# Option 3: Multiple services
NOTIFICATION_URLS="logger://,generic://localhost:3001?disabletls=yes&template=json"

# Configure webhook port
WEBHOOK_PORT=3001
```

### ⏰ Schedule Testing
Edit `config/websites.yaml` to test scheduling:
```yaml
schedule:
  time: "14:30"  # Set to current time + 1 minute
  timezone: "America/New_York"
```

### 🎯 Configuration Files
- **Main config**: `config/websites.yaml`
- **Settings**: `config/settings.yaml`
- **Environment**: `.env.development`

## Available Scripts

```bash
# Development
bun run dev          # Start with hot reload + webhook listener
bun run start        # Start production build

# Building
bun run build        # Optimized Bun build
bun run build:tsc    # TypeScript compilation

# Testing
bun run test         # Bun native tests
bun run test:jest    # Jest tests
bun run test:coverage # Coverage report

# Quality
bun run lint         # Linting with oxlint
bun run typecheck    # TypeScript validation
bun run ci           # Full CI pipeline
```

## Architecture Overview

### Simplified Design
- **No Redis**: In-memory task queue for <10 websites
- **No Prometheus/Grafana**: Simple monitoring service
- **Shoutrrr CLI**: Direct notification system
- **YAML Config**: File-based configuration
- **Dependency Injection**: Clean architecture with InversifyJS
- **Integrated Webhook**: Built-in dev server notification verification

### Key Services
- `ConfigService`: YAML configuration management
- `NotificationService`: Shoutrrr CLI integration
- `MonitoringService`: Simple statistics tracking
- `TaskQueue`: In-memory task management
- `DevWebhookListener`: Development notification verification

## Troubleshooting

### Shoutrrr Permission Issues
```bash
# Give execution permission
chmod +x ~/.local/bin/shoutrrr

# Test with simple command
shoutrrr --version
```

### Environment Variables Not Loading
```bash
# Debug environment loading
set -a && source .env.development && env | grep NOTIFICATION
```

### Hot Reload Not Working
```bash
# Restart dev server
pkill -f "bun.*watch"
bun run dev
```

### Webhook Port Conflicts
```bash
# Check what's using port 3001
lsof -i :3001

# Change port in .env.development
WEBHOOK_PORT=3002
```

## Next Steps

After local development is working:
1. Test with real notification services (Discord, Slack, etc.)
2. Configure actual website credentials
3. Deploy with Docker container
4. Set up production monitoring

## Production Deployment

Ready to deploy? See:
- `docker/docker-compose.yml` for container setup
- `Dockerfile` for production builds
- `CLAUDE.md` for full documentation