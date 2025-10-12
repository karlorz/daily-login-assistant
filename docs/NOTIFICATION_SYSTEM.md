# Notification System Guide

## Overview

The Daily Login Assistant uses **shoutrrr** to send notifications for login events, failures, and session expiration. This guide covers testing, configuration, and integration.

## Testing Steps

### Manual Test: Session Expiration with Notifications

Follow these steps to test that you receive notifications when sessions expire:

#### Step 1: Start Webhook Listener (Development)

```bash
# In Terminal 1: Start the webhook listener
node scripts/webhook-listener.js
```

You should see:
```
✅ Webhook listener started
📡 Listening on: http://localhost:3001
📝 Logging to: /tmp/daily-login-notifications.log
```

#### Step 2: Run Automated Test (Recommended)

```bash
# In Terminal 2: Run the test script
./scripts/test-session-expiration.sh anyrouter.top user1
```

This script will:
1. ✅ Verify profile exists
2. 💾 Backup current session
3. 🔍 Check webhook listener is running
4. 🗑️ Simulate session expiration (delete storage-state.json)
5. 🚀 Trigger check-in (should fail)
6. 📧 Verify notification received
7. ♻️ Restore original session

#### Step 3: Manual Testing (Alternative)

If you prefer manual testing:

```bash
# 1. Backup the session
cp profiles/user-guided/anyroutertop-user1/storage-state.json /tmp/backup.json

# 2. Remove session to simulate expiration
rm profiles/user-guided/anyroutertop-user1/storage-state.json

# 3. Try to check in (will fail)
bun run profiles checkin anyrouter.top user1 https://anyrouter.top/

# 4. Check the webhook listener output in Terminal 1
# You should see notification details

# 5. Restore the session
cp /tmp/backup.json profiles/user-guided/anyroutertop-user1/storage-state.json

# 6. Verify restored session works
bun run profiles checkin anyrouter.top user1 https://anyrouter.top/
```

## Current Implementation Status

### ✅ Fully Integrated: Profile Manager Notifications

The profile manager (`scripts/profile-manager.js`) has **complete notification integration**:

- ✅ Profile setup success/failure notifications
- ✅ Check-in success notifications
- ✅ Session expiration notifications with recovery instructions
- ✅ Error notifications with details
- ✅ Daily summary notifications (checkin-all)

**Notification Events:**

```javascript
// Success notification
await this.sendNotification(
  `✅ Check-in Success - ${profileId}`,
  `Daily check-in completed successfully for ${site} (${user})`
);

// Session expiration notification (with recovery command)
await this.sendNotification(
  `🔴 Session Expired - ${profileId}`,
  `Session expired. Please re-authenticate.

Profile: ${profileId}
Site: ${site}
User: ${user}

Recovery Command:
bun run profiles setup ${site} ${user} ${loginUrl}`
);

// Error notification
await this.sendNotification(
  `❌ Check-in Error - ${profileId}`,
  `Error during check-in: ${error.message}`
);

// Daily summary (checkin-all)
await this.sendNotification(
  '📊 Daily Check-in Summary',
  `✅ Successful: ${successful}
❌ Failed: ${failed}
📈 Success Rate: ${successRate}%

Failed Profiles:
  • profile1
  • profile2`
);
```

### ✅ Working: Main Application Notifications

The main application (`src/index.ts`) also has full notification integration:

- ✅ Login success notifications
- ✅ Login failure notifications
- ✅ Circuit breaker notifications
- ✅ Daily summary notifications

Example from `src/index.ts`:
```typescript
// Success notification
await notificationService.sendNotification(
  `✅ Login Success - ${config.name}`,
  `Successfully logged into ${config.name}`
);

// Failure notification
await notificationService.sendNotification(
  `❌ Login Failed - ${config.name}`,
  `Failed to login: ${error.message}`
);
```

## Notification Configuration

### Development Setup

Default configuration in `.env.development`:

```bash
# Local webhook for testing
NOTIFICATION_URLS="generic://localhost:3001?disabletls=yes&template=json"
```

### Production Setup

For production, use real services:

```bash
# Discord
NOTIFICATION_URLS="discord://token@channel"

# Slack
NOTIFICATION_URLS="slack://token@channel"

# Email (SMTP)
NOTIFICATION_URLS="smtp://user:pass@host:587/?from=bot@example.com&to=admin@example.com"

# Multiple services (recommended)
NOTIFICATION_URLS="discord://token@channel,smtp://user:pass@host:587/?from=bot@example.com&to=admin@example.com"
```

### Supported Services

| Service | URL Format | Example |
|---------|------------|---------|
| Discord | `discord://token@channel` | `discord://AbC123...@987654321` |
| Slack | `slack://token@channel` | `slack://xoxb-123@C12345678` |
| Email | `smtp://user:pass@host:port/` | `smtp://bot:pass@smtp.gmail.com:587/` |
| Telegram | `telegram://token@chatID` | `telegram://123:ABC@123456789` |
| Microsoft Teams | `teams://webhook_url` | `teams://outlook.office.com/webhook/abc...` |
| Generic Webhook | `generic://host:port` | `generic://localhost:3001` |

## Testing Notifications

### Test 1: Webhook Listener (Development)

```bash
# Start webhook listener
node scripts/webhook-listener.js

# In another terminal, send test notification
./scripts/test-webhook.sh "Test message" "Test title"
```

Expected output in webhook listener:
```
════════════════════════════════════════
📧 Webhook Received - 2025-10-04T12:00:00.000Z
════════════════════════════════════════
Title: Test title
Message: Test message
════════════════════════════════════════
```

### Test 2: Manual Notification with Shoutrrr

```bash
# Install shoutrrr (if not already installed)
wget -O ~/.local/bin/shoutrrr https://github.com/nicholas-fedor/shoutrrr/releases/latest/download/shoutrrr_linux_amd64
chmod +x ~/.local/bin/shoutrrr

# Send test notification
~/.local/bin/shoutrrr send \
  --url "generic://localhost:3001?disabletls=yes&template=json" \
  --title "Test Notification" \
  --message "Testing notification system"
```

### Test 3: Session Expiration (Automated)

```bash
# Start webhook listener
node scripts/webhook-listener.js

# In another terminal, run test
./scripts/test-session-expiration.sh anyrouter.top user1
```

### Test 4: Production Services

Before going live, test your production notification URLs:

```bash
# Discord test
shoutrrr send \
  --url "discord://YOUR_TOKEN@YOUR_CHANNEL" \
  --title "🧪 Test Notification" \
  --message "Testing Daily Login Assistant notifications"

# Slack test
shoutrrr send \
  --url "slack://YOUR_TOKEN@YOUR_CHANNEL" \
  --title "🧪 Test Notification" \
  --message "Testing Daily Login Assistant notifications"

# Email test
shoutrrr send \
  --url "smtp://user:pass@smtp.gmail.com:587/?from=bot@example.com&to=admin@example.com" \
  --title "🧪 Test Notification" \
  --message "Testing Daily Login Assistant notifications"
```

## Notification Examples

### Success Notification

```json
{
  "title": "✅ Login Success - anyrouter.top",
  "message": "Successfully logged into anyrouter.top",
  "timestamp": "2025-10-04T11:23:40.393Z",
  "profile": "anyroutertop-user1"
}
```

### Failure Notification (Current - Main App)

```json
{
  "title": "❌ Login Failed - anyrouter.top",
  "message": "Failed to login: Invalid credentials",
  "timestamp": "2025-10-04T11:23:40.393Z",
  "error": "Invalid credentials"
}
```

### Session Expired Notification (TODO - Profile Manager)

```json
{
  "title": "🔴 Session Expired - anyroutertop-user1",
  "message": "Session expired. Please re-authenticate.\n\nRecovery Command:\nbun run profiles setup anyrouter.top user1 https://anyrouter.top/",
  "timestamp": "2025-10-04T11:23:40.393Z",
  "profile": "anyroutertop-user1",
  "site": "anyrouter.top",
  "user": "user1",
  "loginUrl": "https://anyrouter.top/"
}
```

### Circuit Breaker Notification

```json
{
  "title": "🛑 Circuit Breaker Opened - anyrouter.top",
  "message": "Too many failures detected. Pausing login attempts for 5 minutes.",
  "timestamp": "2025-10-04T11:23:40.393Z",
  "failures": 5,
  "resetTime": "2025-10-04T11:28:40.393Z"
}
```

### Daily Summary Notification

```json
{
  "title": "📊 Daily Check-in Summary",
  "message": "✅ Successful: 8\n❌ Failed: 2\n📈 Success Rate: 80%",
  "timestamp": "2025-10-04T20:00:00.000Z",
  "successful": ["site1", "site2", "site3", "site4", "site5", "site6", "site7", "site8"],
  "failed": ["site9", "site10"]
}
```

## Troubleshooting

### No Notifications Received

1. **Check notification URL:**
   ```bash
   echo $NOTIFICATION_URLS
   ```

2. **Verify service credentials:**
   - Discord: Check token and channel ID are correct
   - Slack: Verify webhook URL or token
   - Email: Test SMTP credentials separately

3. **Test shoutrrr manually:**
   ```bash
   shoutrrr send --verbose --url "$NOTIFICATION_URLS" --title "Test" --message "Test"
   ```

4. **Check logs:**
   ```bash
   # Application logs
   cat logs/app.log

   # Webhook listener logs (development)
   cat /tmp/daily-login-notifications.log
   ```

### Webhook Listener Not Starting

```bash
# Check if port 3001 is in use
lsof -i :3001

# Kill existing process if needed
kill $(lsof -t -i:3001)

# Start webhook listener
node scripts/webhook-listener.js
```

### Notifications Delayed

Shoutrrr sends notifications synchronously. Delays could be due to:
- Network latency
- Service rate limits (Discord, Slack)
- SMTP server response time

For async notifications, consider using a message queue (Redis, RabbitMQ).

## Integration Status

The notification system is **fully integrated** across all components:

### ✅ Completed

- [x] Add notification integration to `profile-manager.js`
- [x] Send notification on session expiration
- [x] Include recovery command in failure notifications
- [x] Add shoutrrr integration to profile manager
- [x] Send success notifications for check-ins
- [x] Send error notifications with details
- [x] Send daily summary notifications (checkin-all)

### Future Enhancements

- [ ] Batch notifications for `checkin-all` command (currently sends individual + summary)
- [ ] Add notification preferences (success only, failures only, both)
- [ ] Rich notifications with embedded images (screenshots)
- [ ] Notification templates for different events
- [ ] Notification history tracking
- [ ] Retry failed notifications
- [ ] Notification delivery confirmation
- [ ] Custom notification formats per service

## Best Practices

1. **Test notifications before going live:**
   ```bash
   ./scripts/test-webhook.sh "Production test" "Going live"
   ```

2. **Use multiple notification channels for redundancy:**
   ```bash
   NOTIFICATION_URLS="discord://...,smtp://..."
   ```

3. **Set appropriate notification levels:**
   - Critical: Session expiration, circuit breaker
   - Info: Daily summary, successful logins
   - Debug: Detailed logs (disabled in production)

4. **Monitor notification delivery:**
   - Check service dashboards
   - Review notification logs
   - Test recovery process regularly

5. **Keep credentials secure:**
   ```bash
   # Never commit to git
   .env.development  # In .gitignore
   .env.production   # In .gitignore
   ```

## Quick Reference

```bash
# Start webhook listener (dev)
node scripts/webhook-listener.js

# Test webhook
./scripts/test-webhook.sh "Message" "Title"

# Test session expiration
./scripts/test-session-expiration.sh anyrouter.top user1

# Send manual notification
shoutrrr send --url "$NOTIFICATION_URLS" --title "Title" --message "Message"

# Check notification logs
cat /tmp/daily-login-notifications.log

# View profile metadata
cat profiles/user-guided/anyroutertop-user1/metadata.json
```

## Production Checklist

Before deploying to production:

- [ ] Test all notification URLs
- [ ] Verify notification delivery
- [ ] Configure appropriate notification levels
- [ ] Set up multiple notification channels
- [ ] Test session expiration recovery
- [ ] Document recovery procedures
- [ ] Set up monitoring/alerting
- [ ] Test circuit breaker notifications
- [ ] Verify daily summary notifications
- [ ] Review notification templates

## Support

For issues or questions:
- Check troubleshooting section above
- Review logs in `logs/` directory
- Test notifications manually with `shoutrrr send`
- Open GitHub issue with error messages and logs
