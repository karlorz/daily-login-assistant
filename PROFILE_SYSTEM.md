# 🚀 Multi-Profile Login System

## Overview

Unified system for managing multiple **site + user** combinations with persistent browser sessions. Works with any authentication method (OAuth, 2FA, captchas).

**Profile Format:** `{site}-{user}`
- `anyrouter.top` + `user1` = `anyrouter-user1`
- `discord.com` + `work` = `discord-work`

## Quick Start

### 1. Setup Profile
```bash
# Setup user (opens browser for manual login)
bun run profiles setup anyrouter.top user1 https://anyrouter.top/login

# Setup additional users
bun run profiles setup anyrouter.top user2 https://anyrouter.top/login
```

### 2. Daily Automation
```bash
# Run daily check-ins for all profiles
bun run profiles checkin-all

# Or test specific profile
bun run profiles test anyrouter.top user1 https://anyrouter.top/login
```

## Commands

| Command | Description |
|---------|-------------|
| `bun run profiles setup <site> <user> <url>` | Setup new profile (manual login) |
| `bun run profiles list` | List all profiles with status |
| `bun run profiles checkin-all` | Daily check-ins for all profiles |
| `bun run profiles test <site> <user> <url>` | Test specific profile |
| `bun run profiles cleanup <site> <user>` | Remove profile |

## Examples

### Multiple AnyRouter Users
```bash
bun run profiles setup anyrouter.top personal https://anyrouter.top/login
bun run profiles setup anyrouter.top work https://anyrouter.top/login
bun run profiles setup anyrouter.top family https://anyrouter.top/login
```

### Multiple Sites
```bash
bun run profiles setup github.com work https://github.com/login
bun run profiles setup discord.com main https://discord.com/login
bun run profiles setup anyrouter.top user1 https://anyrouter.top/login
```

## File Structure
```
profiles/user-guided/
├── anyrouter-user1/storage-state.json    # User1 session
├── anyrouter-user2/storage-state.json    # User2 session
├── github-work/storage-state.json        # GitHub work session
└── discord-main/storage-state.json       # Discord session

logs/screenshots/
└── daily-checkin-{profile}_{timestamp}.png
```

## Features

✅ **OAuth Support** - GitHub, Google, LinuxDO authentication
✅ **Session Persistence** - Weeks/months without re-login
✅ **Batch Operations** - Daily check-ins for all profiles
✅ **Anti-Detection** - Uses real browser profiles
✅ **Verification** - Screenshot capture for audit

## Environment (Optional)

```bash
# .env.development
ANYROUTER_URL=https://anyrouter.top/login
```

## Production Scheduling

```bash
# Add to crontab for 9 AM daily
0 9 * * * cd /path/to/project && bun run profiles checkin-all
```

That's it! The system handles everything else automatically.