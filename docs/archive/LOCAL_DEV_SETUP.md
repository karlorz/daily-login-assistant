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

### 2. Install Playwright Browsers

```bash
# Install Playwright browsers for automation testing
bunx playwright install chromium

# Optional: Install all browsers for comprehensive testing
bunx playwright install
```

### 3. Setup Environment

```bash
# Copy development environment
cp .env.development.example .env.development

# Default .env.development includes integrated webhook listener:
# WEBHOOK_PORT=3001
# NOTIFICATION_URLS="generic://localhost:3001?disabletls=yes&template=json"
```

### 4. Install Dependencies

```bash
# Install all dependencies
bun install

# Verify installation
bun run typecheck
bun run lint
bun run test
```

### 5. Start Development Server

```bash
# Load environment and start dev server with integrated webhook
set -a && source .env.development && set +a && bun run dev
```

### 6. Setup Multi-Profile System (NEW!)

```bash
# Example: Setup AnyRouter profile
bun run profiles setup anyrouter.top user1 https://anyrouter.top/login

# What happens:
# 1. Browser opens to anyrouter.top/login
# 2. You manually login (GitHub OAuth, email, etc.)
# 3. Press ENTER when login complete
# 4. Session saved to profiles/user-guided/anyrouter-user1/

# Daily automation for all profiles
bun run profiles checkin-all

# Check profile status
bun run profiles list
```

## Development Features

### 🔥 Hot Reload
- Uses `bun --watch` for instant code reloading
- Automatically restarts on file changes
- Preserves application state where possible

### 🧪 Comprehensive Testing Framework

#### **Jest Integration Tests**
Our project includes comprehensive browser automation tests with both real and mock scenarios:

```bash
# Run all tests (defaults to headless mode in test environment)
bun run test

# Force headless mode (optimal for CI/CD)
bun run test:headless
HEADLESS=true bun test

# Force headed mode (see browser UI for debugging)
bun run test:headed
HEADLESS=false bun test

# Watch mode for development
bun run test:watch

# Coverage reports
bun run test:coverage
```

#### **Test Scenarios Included:**

1. **🏆 Real Public Demo Sites**
   - Practice Test Automation (https://practicetestautomation.com)
   - Fast & reliable for CI/CD pipelines
   - Performance: ~9-10 second complete login flows

2. **🚀 Localhost Mock Servers**
   - Express-based mock login servers
   - Ultra-fast performance: ~700-1200ms
   - Perfect for rapid development iteration

3. **📊 Performance Comparison Tests**
   - Demonstrates speed differences between localhost vs remote
   - Validates automation works across different environments
   - Example results: 4x faster localhost vs remote (3302ms difference)

#### **Manual Testing Script**

For interactive testing with visible browser:

```bash
# Run manual test with Practice Test Automation site
node scripts/test-login.js

# Features:
# - Uses dependency injection container
# - Runs in NON-headless mode for demonstration
# - Shows metrics and success/failure status
# - Credentials: student / Password123
```

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

#### Browser Automation Configuration

Edit `.env.development` for browser behavior:

```bash
# Headless mode (optimal for automated testing)
HEADLESS=true

# Headed mode (see browser UI for debugging)
HEADLESS=false

# Log level for reduced noise during testing
LOG_LEVEL=error
```

#### Notification Configuration

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

# Testing - Browser Automation
bun run test         # Run all tests (headless by default)
bun run test:headless # Force headless mode
bun run test:headed  # Force headed mode (debugging)
bun run test:watch   # Watch mode for development

# Testing - Traditional
bun run test:jest    # Jest tests only
bun run test:coverage # Coverage report
bun run test:all     # Full test suite

# Multi-Profile System (NEW!)
bun run profiles setup <site> <user> <url>  # Setup new profile
bun run profiles list                       # List all profiles
bun run profiles checkin-all               # Daily check-ins for all
bun run profiles test <site> <user> <url>  # Test specific profile
bun run profiles cleanup <site> <user>     # Remove profile

# Quality Assurance
bun run lint         # Linting with oxlint
bun run typecheck    # TypeScript validation
bun run local-ci     # Quick CI validation (recommended)
bun run ci           # Full CI pipeline (slower)
```

## Architecture Overview

### Simplified Design
- **Multi-Profile System**: Unified site + user management (`{site}-{user}` profiles)
- **User-Guided Login**: Manual login once, automated forever (OAuth, 2FA, any auth)
- **Session Persistence**: Chrome profiles with weeks/months session lifetime
- **No Redis**: In-memory task queue for <10 websites
- **Shoutrrr CLI**: Direct notification system
- **Playwright Automation**: Stealth browser automation with anti-detection

### Key Services
- `ProfileManager`: Multi-profile site + user management
- `UserGuidedLoginService`: Manual login with session persistence
- `NotificationService`: Shoutrrr CLI integration
- `PlaywrightBrowserService`: Browser automation with stealth capabilities
- `DevWebhookListener`: Development notification verification

### Browser Automation Features
- ✅ **Multi-Profile Support**: Unlimited site + user combinations
- ✅ **User-Guided Login**: Manual login once, automated daily visits
- ✅ **OAuth Compatible**: GitHub, Discord, Google, any authentication method
- ✅ **Session Persistence**: Chrome profiles maintain login state for weeks/months
- ✅ **Stealth Mode**: Anti-detection capabilities
- ✅ **Batch Operations**: Daily check-ins for all profiles automatically
- ✅ **Error Handling**: Comprehensive retry logic and error reporting
- ✅ **Screenshot Verification**: Audit trail for all daily visits

## Troubleshooting

### Multi-Profile System Issues
```bash
# List all profiles and their status
bun run profiles list

# Clean up expired/invalid profiles
bun run profiles cleanup anyrouter.top user1

# Setup fresh profile after cookie expiration
bun run profiles setup anyrouter.top user1 https://anyrouter.top/login

# Test specific profile session
bun run profiles test anyrouter.top user1 https://anyrouter.top/login

# Check profile storage
ls -la profiles/user-guided/
```

### Playwright Browser Issues
```bash
# Reinstall browsers if automation fails
bunx playwright install chromium

# Check browser installation
bunx playwright install --dry-run

# Test browser launch
HEADLESS=false bun test # Should show browser UI
```

### Jest Test Failures
```bash
# Check headless mode configuration
HEADLESS=true bun test  # Should run without browser UI

# Debug failing tests
bun run test:headed    # See browser interactions

# Check test ports
lsof -i :3333          # Mock server ports
lsof -i :3334
lsof -i :3335
```

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
set -a && source .env.development && env | grep HEADLESS
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
WEBHOOK_PORT=3001
```

## Testing Best Practices

### Development Workflow
1. **Use localhost tests** for rapid iteration (`bun run test:headed`)
2. **Use headless mode** for automated testing (`bun run test:headless`)
3. **Use manual script** for interactive debugging (`node scripts/test-login.js`)
4. **Check real sites** before deployment (Practice Test Automation included)

### CI/CD Integration
```bash
# Full pipeline (runs in headless mode by default)
bun run ci

# Individual steps
bun run lint      # Code quality
bun run typecheck # Type safety
bun run test      # Automated testing (headless)
bun run build     # Production build
```

## Next Steps

After local development is working:
1. **Explore Multi-Profile System**: See [PROFILE_SYSTEM.md](PROFILE_SYSTEM.md) for comprehensive guide
2. Setup multiple users: `bun run profiles setup site user url`
3. Test with real notification services (Discord, Slack, etc.)
4. Configure actual website credentials
5. Deploy with Docker container
6. Set up production monitoring with daily automation

## Production Deployment

Ready to deploy? See:
- `docker/docker-compose.yml` for container setup
- `Dockerfile` for production builds
- `CLAUDE.md` for full documentation