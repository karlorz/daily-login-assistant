# Quick Test Commands

## Run Comprehensive Test
```bash
./docker/test-dailycheckin.sh
```

## Manual Testing

### Start Test Container
```bash
docker rm -f ubuntu-systemd-test 2>/dev/null
docker run -d --name ubuntu-systemd-test \
  --privileged \
  --cgroupns=host \
  --tmpfs /tmp --tmpfs /run --tmpfs /run/lock \
  -v /sys/fs/cgroup:/sys/fs/cgroup:rw \
  -v $(pwd)/docker/dailycheckin.sh:/tmp/dailycheckin.sh:ro \
  -p 8001:8001 \
  jrei/systemd-ubuntu:20.04 /sbin/init
```

### Run Installation
```bash
# Default (direct launch)
docker exec ubuntu-systemd-test /tmp/dailycheckin.sh

# Force systemd
docker exec ubuntu-systemd-test bash -c "export FORCE_SYSTEMD=true && /tmp/dailycheckin.sh"
```

### Check Service Status
```bash
docker exec ubuntu-systemd-test systemctl status daily-login-assistant
```

### View Logs
```bash
docker exec ubuntu-systemd-test journalctl -u daily-login-assistant -n 50 --no-pager
docker exec ubuntu-systemd-test journalctl -u daily-login-assistant -f
```

### Test Application
```bash
# From inside container
docker exec ubuntu-systemd-test curl http://localhost:8001

# From host
curl http://localhost:8001
```

### Interactive Shell
```bash
docker exec -it ubuntu-systemd-test /bin/bash
```

### Cleanup
```bash
docker rm -f ubuntu-systemd-test
```

## Verification Checklist

- [ ] Systemd is running: `systemctl --version`
- [ ] Service file exists: `ls -l /etc/systemd/system/daily-login-assistant.service`
- [ ] No ExecStartPre in service file: `grep ExecStartPre /etc/systemd/system/daily-login-assistant.service` (should be empty)
- [ ] Service enabled: `systemctl is-enabled daily-login-assistant`
- [ ] App directory exists: `ls -la /opt/daily-login-assistant`
- [ ] Dist directory built: `ls -la /opt/daily-login-assistant/dist`
- [ ] Port 8001 accessible: `curl http://localhost:8001`

## Expected Test Output

### ✅ Success Indicators:
- Systemd version shown (245.x)
- "FORCE_SYSTEMD enabled: Creating systemd service in container"
- "Systemd service created and started"
- Service status: "loaded" and "enabled"
- No EROFS (read-only filesystem) errors

### ⚠️ Expected Application Error (until code is synced):
```
Error [ERR_MODULE_NOT_FOUND]: Cannot find module 
'/opt/daily-login-assistant/dist/core/container'
```

This is NOT a script or systemd issue. The remote repository has old code.

## Troubleshooting

### Service won't start
```bash
# Check logs
journalctl -u daily-login-assistant -n 100 --no-pager

# Check if build completed
ls -la /opt/daily-login-assistant/dist/

# Try manual start
cd /opt/daily-login-assistant
node dist/index.js
```

### Port not accessible
```bash
# Check if process is running
ps aux | grep node

# Check port listening
ss -tlnp | grep 8001

# Check firewall (usually not needed in container)
ufw status
```

### Container issues
```bash
# Check systemd status
systemctl status

# Check cgroups
ls -la /sys/fs/cgroup

# Restart container
docker restart ubuntu-systemd-test
```
