# FORCE_SYSTEMD Quick Reference

## What is FORCE_SYSTEMD?
An environment variable that forces the dailycheckin.sh installation script to use systemd service management instead of direct process launch in container environments.

## When to Use

### Use FORCE_SYSTEMD=true when:
- Testing systemd integration in containers
- You need proper service management in containers
- You want logs via journalctl
- You need automatic restart on failure via systemd

### Use Default (no FORCE_SYSTEMD) when:
- Running in Docker/container environments normally
- You prefer simpler process management
- You want to use docker logs
- Quick testing/development scenarios

## Quick Commands

### Container with Direct Launch (Default)
```bash
docker exec container-name /tmp/dailycheckin.sh
```
**Result:** App runs via nohup, creates app.pid file

### Container with Systemd (Forced)
```bash
docker exec container-name bash -c "export FORCE_SYSTEMD=true && /tmp/dailycheckin.sh"
```
**Result:** App runs as systemd service

### Native System (Auto Systemd)
```bash
sudo bash dailycheckin.sh
```
**Result:** Always uses systemd (no flag needed)

## Verification Commands

### Check if using systemd:
```bash
docker exec container-name systemctl status daily-login-assistant
```

### Check if using direct launch:
```bash
docker exec container-name cat /opt/daily-login-assistant/app.pid
docker exec container-name ps -p $(cat /opt/daily-login-assistant/app.pid)
```

## Management Commands

### Systemd Mode:
```bash
systemctl status daily-login-assistant
systemctl restart daily-login-assistant
systemctl stop daily-login-assistant
journalctl -u daily-login-assistant -f
```

### Direct Launch Mode:
```bash
ps aux | grep node
kill $(cat /opt/daily-login-assistant/app.pid)
/opt/daily-login-assistant/start-app.sh
tail -f /opt/daily-login-assistant/logs/app.log
docker logs -f container-name
```

## Test Scripts

### Quick Test (as provided in instructions):
```bash
./docker/test-dailycheckin.sh
```

### Comprehensive Test (both modes):
```bash
./docker/test-local-dailycheckin.sh
```

## Differences Between Modes

| Feature | Direct Launch | Systemd |
|---------|--------------|---------|
| Process Management | nohup + PID file | systemd service |
| Auto Restart | No | Yes (RestartSec=10) |
| Logs | app.log + docker logs | journalctl |
| Start Command | start-app.sh | systemctl start |
| Stop Command | kill PID | systemctl stop |
| Status Check | ps + PID | systemctl status |
| Container Native | Yes | No (needs --privileged) |
| Complexity | Low | Medium |

## Troubleshooting

### Issue: systemctl commands fail in container
**Solution:** Use FORCE_SYSTEMD=true with a systemd-enabled container (jrei/systemd-ubuntu)

### Issue: App starts but exits immediately in direct mode
**Check:** 
1. Look at app.log: `tail /opt/daily-login-assistant/logs/app.log`
2. Check if PID file exists: `cat /opt/daily-login-assistant/app.pid`
3. Verify Node.js is in PATH: `which node`

### Issue: Want to switch from direct to systemd
**Solution:** Run installation again with FORCE_SYSTEMD=true (it will clean up old process)

## File Locations

- **Installation Script:** `/tmp/dailycheckin.sh` (in container)
- **App Directory:** `/opt/daily-login-assistant`
- **Service File:** `/etc/systemd/system/daily-login-assistant.service` (systemd only)
- **Start Script:** `/opt/daily-login-assistant/start-app.sh` (direct launch only)
- **PID File:** `/opt/daily-login-assistant/app.pid` (direct launch only)
- **Logs:** `/opt/daily-login-assistant/logs/app.log` or journalctl

## Related Documentation
- Full implementation guide: `FORCE_SYSTEMD_IMPLEMENTATION.md`
- Docker deployment: `DOCKER_DEPLOYMENT.md`
- Testing guide: `TESTING_GUIDE.md`
