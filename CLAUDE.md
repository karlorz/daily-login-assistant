# Daily Login Assistant Bot - Simplified Edition

## ⚠️ CRITICAL NOTE: Git Worktrees
**DO NOT REMOVE `worktrees/` DIRECTORY** - This contains git worktree sources:
- `worktrees/docs/` is actively used for documentation creation in separate sessions
- All content under `worktrees/` must be preserved as it's linked to git worktrees

## Project Overview
Streamlined automated daily login assistant bot for small-scale operations (< 10 websites). Features simple in-memory task management, file-based configuration, and notification alerts via shoutrrr CLI.

## Tech Stack
- **Package Manager**: Bun's built-in package manager (3x faster than npm)
- **Runtime**: Bun JavaScript & TypeScript runtime (Node.js compatible)
- **Bundler**: Built-in bundler for production builds
- **Test Runner**: Built-in Jest-compatible test runner
- **Browser Automation**: Playwright with stealth capabilities
- **Task Management**: In-memory arrays for simple task queuing
- **Notifications**: Shoutrrr CLI for Discord, Slack, email, etc.
- **Configuration**: YAML files with hot-reloading
- **Storage**: File system for profiles and logs
- **Container**: Simple Docker container
- **Architecture**: Clean architecture with minimal dependency injection

## Key Features
- ✅ **Multi-Profile System**: Unified site + user management (`bun run profiles`)
- ✅ **User-Guided Login**: Manual login once, automated forever (PRIMARY METHOD)
- ✅ **PWA Remote Server**: Extract cookies + localStorage via SSH tunnel for remote deployment
- ✅ **OAuth Support**: GitHub, Discord, LinuxDO, any authentication method (via PWA)
- ✅ **Session Persistence**: Chrome profiles with weeks/months session lifetime
- ✅ **localStorage Extraction**: Captures OAuth user data for remote sessions
- ✅ **Batch Operations**: Daily check-ins for unlimited profiles
- ✅ **Smart Notifications**: Real-time alerts via shoutrrr (Discord, Slack, email, etc.)
- ✅ **Browser Automation**: Stealth Playwright with anti-detection
- ✅ **Clean Logging**: Screenshots and structured logging
- 🔒 **Auto-Fill Credentials**: Available but not maintained (legacy/reference only)

## Simplified Architecture
```
daily-login-assistant/
├── src/
│   ├── core/                      # Business logic & interfaces
│   ├── infrastructure/            # Browser, config, notifications, storage
│   ├── application/               # Login engine & scheduler services
│   └── config/                    # Configuration schemas
├── config/                        # YAML configuration files
├── profiles/                      # Chrome profile storage
├── logs/                          # Application logs
├── docker/                        # Simple Docker setup
└── tests/                         # Test suites
```

## Development Commands
```bash
# Install Bun (first time setup)
curl -fsSL https://bun.sh/install | bash

# Install dependencies
bun install

# Start development environment with hot reload
bun run dev

# Run comprehensive tests
bun run test:all

# Build for production
bun run build

# Git workflow with conventional commits
git add .
bun run commit              # Interactive commit wizard
git push origin main       # Triggers CI/CD pipeline

# Quality checks
bun run lint               # oxlint (replaced ESLint)
bun run typecheck          # TypeScript validation
bun run local-ci           # Quick CI validation
bun run test               # Run tests
bun run test:coverage      # Coverage report

# Multi-Profile System
bun run profiles setup site user url  # Setup new profile (CLI-guided method)
bun run profiles list                  # List all profiles
bun run profiles checkin-all          # Daily check-ins for all

# PWA Remote Server Method (Production)
# IMPORTANT: Run these commands in Docker to match production environment
docker compose up -d                                    # Start services
# Visit http://localhost:8001 to create profiles via PWA UI
docker exec daily-login-assistant bun run profiles list              # List profiles
docker exec daily-login-assistant bun run profiles checkin site user url  # Test check-in
docker exec daily-login-assistant bun run profiles checkin-all       # Test batch check-ins

# Docker linting
docker run --rm -i hadolint/hadolint < Dockerfile          # Dockerfile best practices
docker run -t --rm -v ${PWD}:/app zavoloklom/dclint .      # Docker Compose linting

# Build and deployment
docker build -t daily-login-assistant .
docker run -d daily-login-assistant

# Set up notifications
export NOTIFICATION_URLS="discord://token@channel,slack://token@channel"
```

## Development Workflow

### Recommended Git Flow

1. **Create Feature Branch**
   ```bash
   git checkout -b feat/your-feature-name
   ```

2. **Make Changes & Commit**
   ```bash
   # Run quality checks before committing
   bun run local-ci           # Runs lint, typecheck, and tests

   # Stage and commit with conventional commits
   git add .
   bun run commit             # Interactive commit wizard
   ```

3. **Push & Create PR**
   ```bash
   git push origin feat/your-feature-name

   # Create PR using GitHub CLI
   gh pr create --title "feat: your feature description" --fill

   # Or via web: https://github.com/your-repo/compare
   ```

4. **Keep PR Updated**
   ```bash
   # Sync with main branch
   git fetch origin
   git rebase origin/main     # Or: git merge origin/main

   # Push updates (use --force-with-lease for rebase)
   git push origin feat/your-feature-name --force-with-lease
   ```

5. **Merge PR**
   ```bash
   # After approval, squash and merge via GitHub UI
   # Or via CLI:
   gh pr merge --squash --delete-branch
   ```

### Best Practices

- ✅ **Always work on feature branches** (never directly on `main`)
- ✅ **Use conventional commits** for automatic versioning
- ✅ **Run `bun run local-ci`** before pushing
- ✅ **Keep PRs focused** on a single feature/fix
- ✅ **Update PR description** if scope changes
- ✅ **Sync with main regularly** to avoid conflicts
- ✅ **Use PR template** for consistency

### Quick Reference

```bash
# Start new feature
git checkout -b feat/feature-name

# Daily workflow
bun run local-ci && git add . && bun run commit && git push

# Update from main
git fetch origin && git rebase origin/main

# Create/update PR
gh pr create --fill
gh pr view --web
```

## CI/CD Pipeline

### Automated Releases with semantic-release

The project uses **semantic-release** for automated versioning and publishing:

- **Conventional Commits**: Automatic version bumping based on commit messages
- **GitHub Actions**: CI/CD pipeline with quality checks
- **Automatic Publishing**: GitHub releases and NPM package publishing
- **Changelog Generation**: Automatic CHANGELOG.md updates

### Commit Guidelines

Use conventional commit format to trigger releases:

```bash
feat: add new feature          # Minor release
fix: resolve bug              # Patch release
docs: update documentation    # No version bump
perf: improve performance     # Patch release
feat(api)!: breaking change   # Major release
```

### Required Repository Secrets

- `GITHUB_TOKEN`: Automatically provided by GitHub Actions
- `NPM_TOKEN`: NPM automation token for package publishing

## Configuration

### Website Configuration (config/websites.yaml)
```yaml
websites:
  - id: website1
    name: "Example Site 1"
    url: "https://example1.com/login"
    enabled: true
    schedule:
      time: "09:00"
      timezone: "America/New_York"
    credentials:
      username_env: "SITE1_USERNAME"
      password_env: "SITE1_PASSWORD"
    selectors:
      username: ["#username", "[name='email']"]
      password: ["#password", "[name='password']"]
      loginButton: ["#login", ".login-btn"]
    automation:
      waitForNetworkIdle: true
      typingDelay: 100
      navigationTimeout: 30000
      retryAttempts: 3
```

### Application Settings (config/settings.yaml)
```yaml
settings:
  global:
    defaultTimeout: 30000
    maxConcurrentTasks: 2
    logLevel: "info"
  notifications:
    sendOnSuccess: true
    sendOnFailure: true
    sendDailySummary: true
    summaryTime: "20:00"
  browser:
    headless: true
    userDataDir: "./profiles"
```

## Environment Variables
```bash
# Notification URLs (comma-separated)
NOTIFICATION_URLS="discord://token@channel,slack://token@channel,smtp://user:pass@host:587/?from=bot@example.com&to=admin@example.com"

# Website credentials
SITE1_USERNAME="your_username"
SITE1_PASSWORD="your_password"
SITE2_USERNAME="your_username"
SITE2_PASSWORD="your_password"

# Application settings
NODE_ENV="production"
LOG_LEVEL="info"
```

## Shoutrrr Notifications

### Supported Services
- **Discord**: `discord://token@channel`
- **Slack**: `slack://token@channel`
- **Email**: `smtp://user:pass@host:587/?from=bot@example.com&to=admin@example.com`
- **Telegram**: `telegram://token@chat_id`
- **Teams**: `teams://webhook_url`

### Installation
```bash
# Install shoutrrr CLI (Linux/macOS) - Using nicholas-fedor fork
wget -O shoutrrr https://github.com/nicholas-fedor/shoutrrr/releases/latest/download/shoutrrr_linux_amd64
chmod +x shoutrrr
sudo mv shoutrrr /usr/local/bin/

# Or via Go (nicholas-fedor fork)
go install github.com/nicholas-fedor/shoutrrr@latest
```

## Docker Setup
```bash
# Build image
docker build -t daily-login-assistant .

# Run container
docker run -d \
  --name daily-login-bot \
  -v $(pwd)/config:/app/config \
  -v $(pwd)/profiles:/app/profiles \
  -v $(pwd)/logs:/app/logs \
  -e NOTIFICATION_URLS="your_notification_urls" \
  -e SITE1_USERNAME="username" \
  -e SITE1_PASSWORD="password" \
  daily-login-assistant
```

## Implementation Status
- [x] **Deep Technical Analysis Complete**
- [x] **Simplified Architecture Designed**
- [x] **Final Solution Documentation**
- [x] **Migrated to Bun for improved performance**
- [x] **CI Pipeline with oxlint (replaced ESLint)**
- [x] **PWA Remote Server Method**: SSH tunnel + CDP for cookie + localStorage extraction
- [x] **OAuth Support**: Tested with GitHub, LinuxDO, Discord OAuth flows
- [x] **Session Persistence**: localStorage extraction for long-lived OAuth sessions
- [ ] Phase 1: Core Infrastructure Implementation
- [ ] Phase 2: Browser Automation & Configuration
- [ ] Phase 3: Notifications & Error Handling
- [ ] Phase 4: Testing & Production Deployment

## Success Metrics
- **Reliability**: >95% successful login rate
- **Performance**: <60 seconds per login attempt
- **Simplicity**: <500 lines of core application code
- **Maintainability**: Clear separation of concerns
- **Notifications**: Real-time alerts for failures and daily summaries

## Key Simplifications
1. **No Redis Queue**: Simple in-memory task queue for < 10 websites
2. **No Prometheus/Grafana**: Replaced with shoutrrr notifications
3. **No Vault**: Environment variables for credentials
4. **File-based Storage**: Local file system instead of databases
5. **Single Process**: No need for multiple workers
6. **Simplified Architecture**: Clean but minimal dependency injection

## Project Decisions

### Authentication Methods
- **PRIMARY**: User-Guided Login (actively maintained, recommended for all use cases)
- **SECONDARY**: Auto-Fill Credentials (maintenance mode - kept as reference, not actively developed)

**Rationale**: User-guided login provides zero-maintenance operation with universal auth support (OAuth, 2FA, etc.). Auto-fill code remains in the repository for reference but is not prioritized for new features or updates.

## Documentation
- [**Docker Deployment Guide**](DOCKER_DEPLOYMENT.md) - **NEW**: Complete guide for headless Docker deployment
- [**Deployment Checklist**](DEPLOYMENT_CHECKLIST.md) - **NEW**: Step-by-step deployment validation
- [**Multi-Profile System**](PROFILE_SYSTEM.md) - Unified site + user management
- [**Session Recovery Guide**](docs/SESSION_RECOVERY.md) - Person-in-the-loop recovery with shoutrrr notifications
- [**Notification System Guide**](docs/NOTIFICATION_SYSTEM.md) - Testing and configuring notifications
- [**Notification Implementation**](docs/NOTIFICATION_IMPLEMENTATION.md) - Complete implementation details and test results
- [Simplified Solution Architecture](Final-Enterprise-Solution-Architecture.md) - Compact design for small-scale operations
- [Original Technical Plan](daily-login-assistant-plan.md) - Initial planning and requirements
- [Implementation Details](Detailed-Solution.md) - Basic implementation reference

## Bun Quickstart
```bash
# Install Bun
curl -fsSL https://bun.sh/install | bash

# Initialize project
bun init

# Add packages
bun add playwright
bun add -d @types/jest typescript

# Run scripts
bun run dev    # Development
bun run test   # Tests
bun run build  # Production build
bun run start  # Production server
```

## Phased Implementation
1. **Core Infrastructure**: Basic login engine with file-based configuration
2. **Browser Automation**: Playwright integration with stealth capabilities
3. **Notifications**: Shoutrrr CLI integration for alerts and summaries
4. **Production**: Docker deployment and operational testing