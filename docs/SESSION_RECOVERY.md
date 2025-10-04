# Session Recovery Guide

## Overview

The Daily Login Assistant uses a **person-in-the-loop** approach for session recovery. When a session expires, the system notifies you via shoutrrr webhook, and you manually re-authenticate once to restore the session.

## Why Person-in-the-Loop?

- ✅ **Simple & Reliable**: No complex automation needed
- ✅ **Secure**: You control authentication flow
- ✅ **Flexible**: Works with any auth method (OAuth, 2FA, etc.)
- ✅ **Low Maintenance**: Sessions last weeks/months - rare intervention needed

## How It Works

### Normal Operation

```
┌─────────────────┐
│  Daily Check-in │
│   (Automated)   │
└────────┬────────┘
         │
         ▼
    ✅ Success
         │
         ▼
   📊 Notification
   (Success Alert)
```

### Session Expired Scenario

```
┌─────────────────┐
│  Daily Check-in │
│   (Automated)   │
└────────┬────────┘
         │
         ▼
    ❌ Session Expired
         │
         ▼
   🔔 Notification Alert
   "Session expired for anyroutertop-user1"
         │
         ▼
   👤 User Re-authenticates
   (Manual: bun run profiles setup)
         │
         ▼
   ✅ Session Restored
   (Back to automated check-ins)
```

## Notification Setup

### Development (Default)

The default development configuration sends notifications to a local webhook:

```bash
# .env.development
NOTIFICATION_URLS="generic://localhost:3001?disabletls=yes&template=json"
```

### Production (Recommended)

For production, use a real notification service:

```bash
# .env.production
# Discord
NOTIFICATION_URLS="discord://token@channel"

# Slack
NOTIFICATION_URLS="slack://token@channel"

# Email
NOTIFICATION_URLS="smtp://user:pass@host:587/?from=bot@example.com&to=admin@example.com"

# Multiple services (recommended)
NOTIFICATION_URLS="discord://token@channel,smtp://user:pass@host:587/?from=bot@example.com&to=admin@example.com"
```

## Recovery Process

### Step 1: Receive Notification

When a session expires, you'll receive a notification like:

```
🔴 Login Failed - anyroutertop-user1
Session expired or invalid. Please re-authenticate.

Profile: anyroutertop-user1
Site: anyrouter.top
User: user1
URL: https://anyrouter.top/

Recovery Command:
bun run profiles setup anyrouter.top user1 https://anyrouter.top/
```

### Step 2: Re-authenticate

Run the setup command from the notification:

```bash
bun run profiles setup anyrouter.top user1 https://anyrouter.top/
```

This will:
1. Open a browser window
2. Load your profile (cookies, local storage)
3. Wait for you to manually log in
4. Save the new session state
5. Close the browser

### Step 3: Verify Recovery

Check that the profile is active:

```bash
bun run profiles list
```

You should see:
```
📁 anyroutertop-user1
   📊 Status: ✅ Active
   🍪 Cookies: 13
```

### Step 4: Test Check-in (Optional)

Verify the session works:

```bash
bun run profiles checkin anyrouter.top user1 https://anyrouter.top/
```

## Monitoring Session Health

### Check Last Check-in Date

```bash
bun run profiles list
```

Look for the "Last Check-in" timestamp to ensure automated check-ins are running.

### Manual Health Check

Test a specific profile without waiting for the schedule:

```bash
bun run profiles checkin anyrouter.top user1 https://anyrouter.top/
```

## Notification Examples

### Success Notification

```json
{
  "title": "✅ Login Success - anyroutertop-user1",
  "message": "Daily check-in completed successfully",
  "timestamp": "2025-10-04T11:23:40.393Z",
  "profile": "anyroutertop-user1"
}
```

### Session Expired Notification

```json
{
  "title": "🔴 Login Failed - anyroutertop-user1",
  "message": "Session expired. Please re-authenticate.\n\nRecovery: bun run profiles setup anyrouter.top user1 https://anyrouter.top/",
  "timestamp": "2025-10-04T11:23:40.393Z",
  "profile": "anyroutertop-user1",
  "error": "Session validation failed"
}
```

### Daily Summary Notification

```json
{
  "title": "📊 Daily Check-in Summary",
  "message": "✅ Successful: 2\n❌ Failed: 0\n📈 Success Rate: 100%",
  "timestamp": "2025-10-04T11:23:44.852Z",
  "profiles": ["anyroutertop-user1", "anyroutertop-user2"]
}
```

## Best Practices

### 1. Test Notifications First

Before relying on the system, test that notifications work:

```bash
# Start dev server
bun run dev

# In another terminal, test webhook
./scripts/test-webhook.sh "Test message" "Test title"
```

### 2. Multiple Notification Channels

Use multiple channels for redundancy:

```bash
NOTIFICATION_URLS="discord://token@channel,smtp://user:pass@host:587/?from=bot@example.com&to=admin@example.com"
```

### 3. Regular Profile Audits

Weekly review of all profiles:

```bash
bun run profiles list
```

Check for:
- Last check-in date (should be recent)
- Cookie count (should be > 0)
- Active status

### 4. Keep Profiles Updated

If a website changes its login page:

```bash
# Re-setup with new URL
bun run profiles setup anyrouter.top user1 https://new-login-url.com/
```

## Troubleshooting

### No Notifications Received

1. Check notification URL configuration:
   ```bash
   echo $NOTIFICATION_URLS
   ```

2. Verify service credentials (Discord token, Slack webhook, etc.)

3. Test notification manually:
   ```bash
   ./scripts/test-webhook.sh
   ```

### Session Still Failing After Re-authentication

1. Clear the profile completely:
   ```bash
   bun run profiles cleanup anyrouter.top user1
   ```

2. Setup fresh profile:
   ```bash
   bun run profiles setup anyrouter.top user1 https://anyrouter.top/
   ```

3. Verify success:
   ```bash
   bun run profiles list
   ```

### Profile Not Found

The profile might have been deleted. Create it:

```bash
bun run profiles setup anyrouter.top user1 https://anyrouter.top/
```

## Automation Recommendations

### Cron Setup (Linux/macOS)

Run daily check-ins automatically:

```bash
# Edit crontab
crontab -e

# Add daily check-in at 9 AM
0 9 * * * cd /path/to/daily-login-assistant && /usr/bin/bun run profiles checkin-all
```

### Docker Setup

For containerized deployments, mount volumes:

```bash
docker run -d \
  --name daily-login-bot \
  -v $(pwd)/profiles:/app/profiles \
  -e NOTIFICATION_URLS="discord://token@channel" \
  daily-login-assistant
```

## Expected Session Lifetime

Based on testing:

| Site Type | Session Duration | Re-auth Frequency |
|-----------|------------------|-------------------|
| Standard Login | 1-2 weeks | ~Monthly |
| OAuth (GitHub/Discord) | 1-3 months | ~Quarterly |
| Remember Me Enabled | 3-6 months | ~Bi-annually |

**Note**: Actual duration varies by website. Most modern sites with "Remember Me" will last 1-3 months.

## Support

If you experience frequent session expiration:

1. Check if the website has session timeout settings
2. Enable "Remember Me" during login
3. Consider using OAuth providers (longer sessions)
4. Review the website's security policies

For questions or issues, open a GitHub issue with:
- Profile metadata
- Last successful check-in date
- Error message from notification
- Screenshot from logs/screenshots/
